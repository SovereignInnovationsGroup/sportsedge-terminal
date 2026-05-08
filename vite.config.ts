
  import { defineConfig, loadEnv } from 'vite';
  import react from '@vitejs/plugin-react';
  import path from 'path';

  let newsPoolPromise: Promise<any> | null = null;
  let newsPoolConnectionString = '';

  function getNewsConnectionString(server: any) {
    const env = loadEnv(server.config.mode, server.config.root, '');
    return process.env.POSTGRES_URL || process.env.DATABASE_URL || env.POSTGRES_URL || env.DATABASE_URL || '';
  }

  function getNewsPool(connectionString: string) {
    if (!connectionString) {
      throw new Error('POSTGRES_URL or DATABASE_URL is required for /api/news');
    }

    if (!newsPoolPromise || newsPoolConnectionString !== connectionString) {
      newsPoolConnectionString = connectionString;
      newsPoolPromise = import('pg').then(({ Pool }) => {
        const poolConnectionString = new URL(connectionString);
        const wantsSsl = poolConnectionString.searchParams.has('sslmode');
        poolConnectionString.searchParams.delete('sslmode');
        poolConnectionString.searchParams.delete('uselibpqcompat');
        return new Pool({
          connectionString: poolConnectionString.toString(),
          ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
          max: 4,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
      });
    }
    return newsPoolPromise;
  }

  function sendJson(res: any, statusCode: number, body: unknown) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }

  function newsApiPlugin() {
    return {
      name: 'sportsedge-news-api',
      configureServer(server: any) {
        server.middlewares.use('/api/news', async (req: any, res: any) => {
          try {
            const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
            const search = requestUrl.searchParams.get('q')?.trim() || '';
            const sport = requestUrl.searchParams.get('sport')?.trim() || '';
            const sourceName = requestUrl.searchParams.get('source_name')?.trim() || requestUrl.searchParams.get('source')?.trim() || '';
            const sourceType = requestUrl.searchParams.get('source_type')?.trim() || '';
            const country = requestUrl.searchParams.get('country')?.trim() || '';
            const competition = requestUrl.searchParams.get('competition')?.trim() || '';
            const status = requestUrl.searchParams.get('status')?.trim() || '';
            const dateFrom = requestUrl.searchParams.get('date_from')?.trim() || '';
            const dateTo = requestUrl.searchParams.get('date_to')?.trim() || '';
            const limit = Math.min(Number.parseInt(requestUrl.searchParams.get('limit') || '200', 10) || 200, 200);
            const pool = await getNewsPool(getNewsConnectionString(server));

            const values: unknown[] = [];
            const clauses = ['true'];

            function addValue(value: unknown) {
              values.push(value);
              return `$${values.length}`;
            }

            if (search) {
              const placeholder = addValue(`%${search}%`);
              clauses.push(`(title ILIKE ${placeholder} OR display_summary ILIKE ${placeholder})`);
            }
            if (sport && sport !== 'all') clauses.push(`sport = ${addValue(sport)}`);
            if (sourceName && sourceName !== 'all') clauses.push(`source_name = ${addValue(sourceName)}`);
            if (sourceType && sourceType !== 'all') clauses.push(`source_type::text = ${addValue(sourceType)}`);
            if (country && country !== 'all') clauses.push(`country = ${addValue(country)}`);
            if (competition && competition !== 'all') clauses.push(`competition = ${addValue(competition)}`);
            if (status && status !== 'all') {
              clauses.push(`status::text = ${addValue(status)}`);
            } else {
              clauses.push(`status::text <> 'rejected'`);
            }
            if (dateFrom) clauses.push(`COALESCE(published_at, discovered_at) >= ${addValue(dateFrom)}`);
            if (dateTo) clauses.push(`COALESCE(published_at, discovered_at) < (${addValue(dateTo)}::date + interval '1 day')`);

            const whereSql = clauses.join(' AND ');
            const limitPlaceholder = addValue(limit);
            const sql = `
              SELECT
                id,
                sport,
                country,
                competition,
                entity_name,
                entity_type,
                source_name,
                source_type::text AS source_type,
                source_url,
                canonical_url,
                title,
                display_summary,
                status::text AS status,
                published_at,
                discovered_at,
                facts,
                entities,
                metadata,
                impact.assessment AS impact_assessment
              FROM news.items item
              LEFT JOIN LATERAL (
                SELECT jsonb_build_object(
                  'event_type', assessment.event_type,
                  'impact_score', assessment.impact_score,
                  'confidence', assessment.confidence,
                  'urgency', assessment.urgency::text,
                  'affected_markets', assessment.affected_markets,
                  'expected_direction', assessment.expected_direction,
                  'trading_note', assessment.trading_note,
                  'watch_items', assessment.watch_items,
                  'assessed_at', assessment.assessed_at,
                  'assessment_method', assessment.assessment_method
                ) AS assessment
                FROM news.impact_assessments assessment
                WHERE assessment.item_id = item.id
              ) impact ON true
              WHERE ${whereSql}
              ORDER BY discovered_at DESC
              LIMIT ${limitPlaceholder}
            `;

            const [itemsResult, facetsResult, healthResult, failuresResult, pollsResult] = await Promise.all([
              pool.query(sql, values),
              pool.query(`
                SELECT
                  COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT sport AS value FROM news.items WHERE sport IS NOT NULL) s), '[]'::jsonb) AS sports,
                  COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT source_name AS value FROM news.items WHERE source_name IS NOT NULL) s), '[]'::jsonb) AS source_names,
                  COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT source_type::text AS value FROM news.items WHERE source_type IS NOT NULL) s), '[]'::jsonb) AS source_types,
                  COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT country AS value FROM news.items WHERE country IS NOT NULL) s), '[]'::jsonb) AS countries,
                  COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT competition AS value FROM news.items WHERE competition IS NOT NULL) s), '[]'::jsonb) AS competitions,
                  COALESCE((SELECT jsonb_agg(value ORDER BY value) FROM (SELECT DISTINCT status::text AS value FROM news.items WHERE status IS NOT NULL) s), '[]'::jsonb) AS statuses
                FROM news.items
              `),
              pool.query(`
                select
                  sport,
                  count(*) as total_sources,
                  count(*) filter (where enabled) as enabled_sources,
                  count(*) filter (where last_success_at is not null) as working_sources,
                  count(*) filter (where enabled and last_error is not null) as failing_sources
                from news.sources
                group by sport
                order by sport
              `),
              pool.query(`
                select
                  sport,
                  name,
                  feed_type::text as feed_type,
                  url,
                  last_error,
                  last_polled_at,
                  last_success_at
                from news.sources
                where enabled = true
                  and last_error is not null
                order by sport, name
              `),
              pool.query(`
                select
                  s.sport,
                  s.name,
                  s.feed_type::text as feed_type,
                  p.status::text as poll_status,
                  p.started_at,
                  p.finished_at,
                  p.items_seen,
                  p.items_inserted,
                  p.items_updated,
                  p.error
                from news.sources s
                join lateral (
                  select *
                  from news.source_polls sp
                  where sp.source_id = s.id
                  order by sp.started_at desc
                  limit 1
                ) p on true
                where s.enabled = true
                order by p.started_at desc
                limit 12
              `),
            ]);

            sendJson(res, 200, {
              items: itemsResult.rows,
              facets: facetsResult.rows[0] || {
                sports: [],
                source_names: [],
                source_types: [],
                countries: [],
                competitions: [],
                statuses: [],
              },
              sourceHealth: healthResult.rows,
              latestFailures: failuresResult.rows,
              latestPolls: pollsResult.rows,
            });
          } catch (error: any) {
            const message = error?.message || 'Unknown error';
            const blockedHost = message.match(/host "([^"]+)"/)?.[1];
            sendJson(res, 200, {
              ok: false,
              detail: 'News database unavailable',
              message,
              hint: blockedHost
                ? `Postgres is reachable at 173.249.48.129, but pg_hba.conf must allow ${blockedHost} for sportsedge_readonly on database sportsedge.`
                : 'Set POSTGRES_URL for the sportsedge_readonly account, for example postgresql://sportsedge_readonly@173.249.48.129:5432/sportsedge?sslmode=require',
            });
          }
        });
      },
    };
  }

  export default defineConfig({
    plugins: [newsApiPlugin(), react()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
    },
  });
