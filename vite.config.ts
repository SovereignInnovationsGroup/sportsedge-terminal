
  import { defineConfig, loadEnv } from 'vite';
  import react from '@vitejs/plugin-react';
  import { execFile } from 'node:child_process';
  import path from 'path';
  import { promisify } from 'node:util';

  let newsPoolPromise: Promise<any> | null = null;
  let newsPoolConnectionString = '';
  const execFileAsync = promisify(execFile);

  function getNewsConnectionString(server: any) {
    const env = loadEnv(server.config.mode, server.config.root, '');
    return process.env.POSTGRES_URL || process.env.DATABASE_URL || env.POSTGRES_URL || env.DATABASE_URL || '';
  }

  function getApiBaseUrl(server: any) {
    const env = loadEnv(server.config.mode, server.config.root, '');
    return process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || env.VITE_API_BASE_URL || env.API_BASE_URL || 'https://api.sportsedge.markets';
  }

  function stripLocalOrigin(proxy: any) {
    proxy.on('proxyReq', (proxyReq: any) => {
      proxyReq.removeHeader('origin');
    });
    proxy.on('proxyReqWs', (proxyReq: any) => {
      proxyReq.removeHeader('origin');
    });
  }

  function escapeSql(value: unknown) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function quote(value: unknown) {
    return `'${escapeSql(value)}'`;
  }

  function shellQuote(value: string) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
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

  function demoMatrixRows() {
    const observedAt = new Date().toISOString();
    const events = [
      {
        id: 'chelsea-man-city',
        name: 'Chelsea FC vs Manchester City',
        competition: 'England FA Cup',
        startAt: '2026-05-16T14:00:00Z',
        runners: ['Chelsea FC', 'Manchester City', 'Draw'],
        prices: {
          betfair: [[4.9, 5.1, 18400, 15500], [1.73, 1.76, 22600, 24100], [4.05, 4.2, 12100, 11800]],
          matchbook: [[5.0, 5.2, 7400, 6800], [1.74, 1.78, 8900, 9700], [4.1, 4.3, 6500, 6200]],
          draftkings: [[4.8, 4.95, 0, 0], [1.68, 1.73, 0, 0], [4.1, 4.25, 0, 0]]
        }
      },
      {
        id: 'arsenal-burnley',
        name: 'Arsenal FC vs Burnley FC',
        competition: 'England Premier League',
        startAt: '2026-05-18T19:00:00Z',
        runners: ['Arsenal FC', 'Burnley FC', 'Draw'],
        prices: {
          betfair: [[1.1, 1.12, 62000, 55800], [31, 34, 7900, 8400], [13, 14, 10100, 9600]],
          matchbook: [[1.11, 1.13, 44500, 39200], [29, 32, 5200, 6100], [13.5, 14.5, 8400, 8100]],
          draftkings: [[1.09, 1.12, 0, 0], [26, 29, 0, 0], [12, 13.5, 0, 0]]
        }
      },
      {
        id: 'bayern-koln',
        name: 'Bayern Munich vs 1. FC Cologne',
        competition: 'Germany Bundesliga',
        startAt: '2026-05-16T13:30:00Z',
        runners: ['Bayern Munich', '1. FC Cologne', 'Draw'],
        prices: {
          betfair: [[1.16, 1.18, 52000, 50300], [18, 20, 8100, 7600], [9.6, 10.2, 11100, 10400]],
          matchbook: [[1.17, 1.19, 58500, 54200], [18, 19.5, 6900, 7200], [10, 10.5, 9600, 9100]],
          draftkings: [[1.16, 1.18, 0, 0], [17, 18.5, 0, 0], [9.5, 10, 0, 0]]
        }
      },
      {
        id: 'newcastle-west-ham',
        name: 'Newcastle United vs West Ham United',
        competition: 'England Premier League',
        startAt: '2026-05-17T16:30:00Z',
        runners: ['Newcastle United', 'West Ham United', 'Draw'],
        prices: {
          betfair: [[2.22, 2.28, 20200, 18800], [3.2, 3.35, 14200, 15100], [3.95, 4.15, 11800, 10700]],
          matchbook: [[2.24, 2.3, 15400, 14900], [3.2, 3.4, 11200, 12100], [4.0, 4.2, 9600, 9800]],
          draftkings: [[2.18, 2.25, 0, 0], [3.1, 3.25, 0, 0], [3.9, 4.05, 0, 0]]
        }
      },
      {
        id: 'barcelona-betis',
        name: 'FC Barcelona vs Real Betis',
        competition: 'Spain La Liga',
        startAt: '2026-05-17T19:15:00Z',
        runners: ['FC Barcelona', 'Real Betis', 'Draw'],
        prices: {
          betfair: [[1.33, 1.36, 33100, 30400], [8.6, 9.2, 5400, 6100], [6.1, 6.5, 8700, 8300]],
          matchbook: [[1.34, 1.37, 19000, 17700], [8.8, 9.4, 4300, 4800], [6.4, 6.8, 6800, 6400]],
          draftkings: [[1.32, 1.35, 0, 0], [8.0, 8.8, 0, 0], [5.8, 6.3, 0, 0]]
        }
      }
    ];

    return events.map((event) => {
      const matches = Object.fromEntries(Object.entries(event.prices).map(([exchange, prices]) => [
        exchange,
        {
          exchange,
          eventId: event.id,
          marketId: `${event.id}:match-odds:${exchange}`,
          name: event.name,
          sportName: 'football',
          competitionName: event.competition,
          marketName: 'Match Odds',
          marketType: 'one_x_two',
          startAt: event.startAt,
          observedAt,
          runners: event.runners.map((runner, index) => {
            const [back, lay, backAmount, layAmount] = prices[index];
            return {
              id: `${event.id}:${exchange}:${index}`,
              name: runner,
              sortOrder: index,
              back: back ? { odds: back, amount: backAmount, level: 1 } : null,
              lay: lay ? { odds: lay, amount: layAmount, level: 1 } : null,
              backLevels: back ? [{ odds: back, amount: backAmount, level: 1 }] : [],
              layLevels: lay ? [{ odds: lay, amount: layAmount, level: 1 }] : []
            };
          })
        }
      ]));
      return {
        id: `matrix-demo:${event.id}:match-odds`,
        name: event.name,
        sportName: 'football',
        competitionName: event.competition,
        marketName: 'Match Odds',
        marketType: 'one_x_two',
        startAt: event.startAt,
        matches,
        arbs: []
      };
    });
  }

  async function proxyMatrixRequest(server: any, requestUrl: URL, res: any) {
    if (requestUrl.searchParams.get('demo') === '1') {
      sendJson(res, 200, {
        ok: true,
        source: 'redis-demo',
        redisKey: `sportsedge:matrix:${requestUrl.searchParams.get('sport') || 'football'}`,
        generatedAt: new Date().toISOString(),
        venues: ['betfair', 'matchbook', 'draftkings'],
        rows: demoMatrixRows()
      });
      return;
    }
    const upstreamUrl = new URL('/api/matrix', getApiBaseUrl(server));
    upstreamUrl.search = requestUrl.search;
    const response = await fetch(upstreamUrl);
    const body = await response.text();
    res.statusCode = response.status;
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.end(body);
  }

  async function proxyNewsRequest(server: any, requestUrl: URL, res: any) {
    const upstreamUrl = new URL('/api/news', getApiBaseUrl(server));
    upstreamUrl.search = requestUrl.search;
    const response = await fetch(upstreamUrl);
    const body = await response.text();
    res.statusCode = response.status;
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.end(body);
  }

  async function fetchTwitterNewsRows(requestUrl: URL) {
    const sport = requestUrl.searchParams.get('sport')?.trim() || '';
    const search = requestUrl.searchParams.get('q')?.trim() || '';
    const limit = Math.min(Number.parseInt(requestUrl.searchParams.get('limit') || '120', 10) || 120, 200);
    const clauses = ["post.discovered_at >= now64(3, 'UTC') - INTERVAL 7 DAY"];
    if (sport && sport !== 'all') clauses.push(`post.sport = ${quote(apiSportForSql(sport))}`);
    if (search) {
      const term = quote(search.toLowerCase());
      clauses.push(`(positionCaseInsensitive(post.text, ${term}) > 0 OR positionCaseInsensitive(post.author_name, ${term}) > 0 OR positionCaseInsensitive(post.account_handle, ${term}) > 0)`);
    }
    const query = `
      SELECT
        post.tweet_id,
        post.source_id,
        post.source_type,
        post.sport,
        post.account_handle,
        post.author_name,
        post.text,
        post.analysis_text,
        post.url,
        post.published_at,
        post.discovered_at,
        impact.news_type,
        impact.market_relevance,
        impact.impact_score,
        impact.confidence,
        impact.urgency,
        impact.direction,
        impact.affected_entity,
        impact.affected_side,
        impact.reason
      FROM sportsedge.sports_hl_twitter_posts post
      LEFT JOIN sportsedge.sports_hl_twitter_impact_assessments impact
        ON post.item_hash = impact.item_hash
      WHERE ${clauses.join(' AND ')}
      ORDER BY coalesce(post.published_at, post.discovered_at) DESC
      LIMIT ${limit}
      FORMAT JSONEachRow
    `;
    const { stdout } = await execFileAsync('ssh', [
      '-o',
      'BatchMode=yes',
      'root@sportsedge-prod',
      `clickhouse-client --query ${shellQuote(query)}`
    ], { maxBuffer: 1024 * 1024 * 8 });
    return stdout.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  }

  function apiSportForSql(value: string) {
    return value === 'horseracing' ? 'horse_racing' : value;
  }

  function normalizeOddsApiRows(events: any[]) {
    return (events || []).flatMap((event: any) => {
      const matches: Record<string, any> = {};
      for (const bookmaker of ['DraftKings']) {
        const market = (event.bookmakers?.[bookmaker] || []).find((item: any) => item.name === 'ML') || event.bookmakers?.[bookmaker]?.[0];
        if (!market?.odds) continue;
        const odds = Array.isArray(market.odds) ? market.odds[0] : market.odds;
        const exchange = bookmaker.toLowerCase();
        const observedAt = new Date().toISOString();
        const runners = [
          ['home', event.home, odds?.home],
          ['away', event.away, odds?.away],
          ['draw', 'Draw', odds?.draw],
        ].map(([id, name, odds], index) => {
          const decimalOdds = Number.parseFloat(String(odds || ''));
          const price = Number.isFinite(decimalOdds) && decimalOdds > 1 ? { odds: decimalOdds, amount: 0, level: 1 } : null;
          return { id, name, sortOrder: index, back: price, lay: null, backLevels: price ? [price] : [], layLevels: [] };
        }).filter((runner: any) => runner.back);
        if (runners.length === 0) continue;
        matches[exchange] = {
          exchange,
          eventId: String(event.id),
          marketId: `${event.id}:${bookmaker}:ML`,
          name: `${event.home} vs ${event.away}`,
          sportName: 'football',
          competitionName: event.league?.name || null,
          marketName: 'Moneyline',
          marketType: 'moneyline',
          startAt: event.date || null,
          observedAt,
          runners,
        };
      }
      return Object.keys(matches).length ? [{
        id: `oddsapi:${event.id}:moneyline`,
        name: `${event.home} vs ${event.away}`,
        sportName: 'football',
        competitionName: event.league?.name || null,
        marketName: 'Moneyline',
        marketType: 'moneyline',
        startAt: event.date || null,
        matches,
        arbs: [],
      }] : [];
    });
  }

  const oddsApiCache = new Map<string, { createdAt: number; body: unknown }>();

  async function proxyOddsApiV2Request(requestUrl: URL, res: any) {
    const apiKey = process.env.ODDS_API_KEY || '';
    if (!apiKey) {
      sendJson(res, 503, { detail: 'ODDS_API_KEY is not configured for local v2 odds feed' });
      return;
    }
    const query = requestUrl.searchParams.get('query') || 'Chelsea Manchester City';
    const bookmakersParam = requestUrl.searchParams.get('bookmakers') || 'DraftKings';
    const limit = requestUrl.searchParams.get('limit') || '5';
    const cacheKey = JSON.stringify({ query, bookmakers: bookmakersParam, limit });
    const cached = oddsApiCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < 300000) {
      sendJson(res, 200, { ...(cached.body as object), cache: 'hit' });
      return;
    }
    const searchUrl = new URL('https://api.odds-api.io/v3/events/search');
    searchUrl.searchParams.set('apiKey', apiKey);
    searchUrl.searchParams.set('query', query);
    const searchResponse = await fetch(searchUrl);
    const searchPayload = await searchResponse.json();
    if (!searchResponse.ok) {
      sendJson(res, searchResponse.status, { detail: searchPayload.error || 'Odds-API search failed' });
      return;
    }
    const eventIds = (searchPayload || []).filter((event: any) => event.sport?.slug === 'football').slice(0, Number(limit || 5)).map((event: any) => event.id);
    if (!eventIds.length) {
      sendJson(res, 200, { rows: [], events: [], provider: 'odds-api', generatedAt: new Date().toISOString(), cache: 'miss' });
      return;
    }
    const oddsUrl = new URL('https://api.odds-api.io/v3/odds/multi');
    oddsUrl.searchParams.set('apiKey', apiKey);
    oddsUrl.searchParams.set('eventIds', eventIds.join(','));
    oddsUrl.searchParams.set('bookmakers', bookmakersParam);
    const oddsResponse = await fetch(oddsUrl);
    const oddsPayload = await oddsResponse.json();
    if (!oddsResponse.ok) {
      sendJson(res, oddsResponse.status, { detail: oddsPayload.error || 'Odds-API odds failed' });
      return;
    }
    const body = {
      generatedAt: new Date().toISOString(),
      provider: 'odds-api',
      events: oddsPayload,
      rows: normalizeOddsApiRows(oddsPayload),
      rateLimit: {
        remaining: oddsResponse.headers.get('x-ratelimit-remaining'),
        reset: oddsResponse.headers.get('x-ratelimit-reset'),
      },
    };
    oddsApiCache.set(cacheKey, { createdAt: Date.now(), body });
    sendJson(res, 200, { ...body, cache: 'miss' });
  }

  function newsApiPlugin() {
    return {
      name: 'sportsedge-news-api',
      configureServer(server: any) {
        server.middlewares.use('/api/news', async (req: any, res: any) => {
          try {
            const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
            const connectionString = getNewsConnectionString(server);

            if (!connectionString) {
              await proxyNewsRequest(server, requestUrl, res);
              return;
            }

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
            const pool = await getNewsPool(connectionString);

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
                : 'Set POSTGRES_URL for local database reads or VITE_API_BASE_URL to proxy a SportsEdge API host.',
            });
          }
        });
        server.middlewares.use('/api/twitter-news', async (req: any, res: any) => {
          try {
            const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
            const rows = await fetchTwitterNewsRows(requestUrl);
            sendJson(res, 200, { rows });
          } catch (error: any) {
            sendJson(res, 200, {
              ok: false,
              detail: 'Twitter/X news unavailable',
              message: error?.message || 'Unknown error',
              rows: []
            });
          }
        });
        server.middlewares.use('/api/v2/football-odds', async (req: any, res: any) => {
          try {
            const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
            await proxyOddsApiV2Request(requestUrl, res);
          } catch (error: any) {
            sendJson(res, 500, { detail: error?.message || 'Odds-API v2 proxy failed' });
          }
        });
        server.middlewares.use('/api/matrix', async (req: any, res: any) => {
          try {
            const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
            await proxyMatrixRequest(server, requestUrl, res);
          } catch (error: any) {
            sendJson(res, 500, { detail: error?.message || 'Matrix proxy failed' });
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
    preview: {
      allowedHosts: true,
    },
    server: {
      port: 3000,
      open: true,
      allowedHosts: true,
      proxy: {
        '/auth': {
          target: 'https://api.sportsedge.markets',
          changeOrigin: true,
          secure: true,
          configure: stripLocalOrigin,
        },
        '/api': {
          target: 'https://api.sportsedge.markets',
          changeOrigin: true,
          secure: true,
          configure: stripLocalOrigin,
        },
        '/ws': {
          target: 'wss://terminal.sportsedge.markets',
          ws: true,
          changeOrigin: true,
          secure: true,
          configure: stripLocalOrigin,
        },
      },
    },
  });
