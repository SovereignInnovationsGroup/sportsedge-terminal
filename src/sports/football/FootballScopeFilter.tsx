import {
  FOOTBALL_DATE_SCOPE_FILTERS,
  FOOTBALL_LOCATION_SCOPE_FILTERS,
  footballScopeBreadcrumb
} from "./filters";

export function FootballScopeFilter({
  dateScope,
  locationScope,
  onDateScopeChange,
  onLocationScopeChange,
  meta,
  ariaLabel = "Football filters"
}: {
  dateScope: string;
  locationScope: string;
  onDateScopeChange: (value: string) => void;
  onLocationScopeChange: (value: string) => void;
  meta?: string[];
  ariaLabel?: string;
}) {
  return (
    <section className="agtest-subbar football-scope-filterbar" aria-label={ariaLabel}>
      <div className="agtest-filter-stack">
        <nav aria-label={ariaLabel}>
          {FOOTBALL_DATE_SCOPE_FILTERS.map((filter) => (
            <button
              className={dateScope === filter.value ? "active" : ""}
              key={filter.value}
              type="button"
              onClick={() => onDateScopeChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
          <span className="agtest-filter-crumb">/</span>
          {FOOTBALL_LOCATION_SCOPE_FILTERS.map((filter) => (
            <button
              className={locationScope === filter.value ? "active" : ""}
              key={filter.value}
              type="button"
              onClick={() => onLocationScopeChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        <span>{footballScopeBreadcrumb(dateScope, locationScope)}</span>
        {(meta || []).map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}
