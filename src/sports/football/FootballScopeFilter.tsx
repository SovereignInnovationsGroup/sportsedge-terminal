import { useEffect, useMemo, useRef, useState } from "react";
import { CountryFlag } from "./CountryFlag";
import { countryMatches } from "./liquidityFilterOptions";
import {
  FOOTBALL_DATE_SCOPE_FILTERS,
  FOOTBALL_LOCATION_SCOPE_FILTERS,
  footballScopeBreadcrumb
} from "./filters";

export function FootballScopeFilter({
  dateScope,
  locationScope,
  liquidityOnly,
  minLiquidity,
  liquidityThresholdOptions,
  countryScope,
  countryFilterOptions,
  onDateScopeChange,
  onLocationScopeChange,
  onLiquidityOnlyChange,
  onMinLiquidityChange,
  onCountryScopeChange,
  meta,
  ariaLabel = "Football filters"
}: {
  dateScope: string;
  locationScope: string;
  liquidityOnly?: boolean;
  minLiquidity?: number;
  liquidityThresholdOptions?: Array<{ value: number; label: string }>;
  countryScope?: string;
  countryFilterOptions?: Array<{ value: string; label: string }>;
  onDateScopeChange: (value: string) => void;
  onLocationScopeChange: (value: string) => void;
  onLiquidityOnlyChange?: (value: boolean) => void;
  onMinLiquidityChange?: (value: number) => void;
  onCountryScopeChange?: (value: string) => void;
  meta?: string[];
  ariaLabel?: string;
}) {
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const countryMenuRef = useRef<HTMLDivElement | null>(null);
  const isAllCountryScope = !countryScope || countryScope === "all";
  const selectedCountryOption = useMemo(() => (
    countryFilterOptions?.find((option) => option.value === "all" ? isAllCountryScope : !isAllCountryScope && countryMatches(option.value, countryScope)) || countryFilterOptions?.[0]
  ), [countryFilterOptions, countryScope, isAllCountryScope]);

  useEffect(() => {
    if (!countryMenuOpen) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!countryMenuRef.current?.contains(event.target as Node)) setCountryMenuOpen(false);
    }
    window.addEventListener("mousedown", closeOnOutsideClick);
    return () => window.removeEventListener("mousedown", closeOnOutsideClick);
  }, [countryMenuOpen]);

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
          {onLiquidityOnlyChange && (
            <>
              <span className="agtest-filter-crumb">/</span>
              <button
                aria-pressed={Boolean(liquidityOnly)}
                className={liquidityOnly ? "active football-liquidity-toggle" : "football-liquidity-toggle"}
                type="button"
                onClick={() => onLiquidityOnlyChange(!liquidityOnly)}
                title={liquidityOnly ? "Showing only fixtures with visible exchange liquidity" : "Showing all fixtures, including zero-liquidity rows"}
              >
                HAS £
              </button>
              {onMinLiquidityChange && liquidityThresholdOptions?.length ? (
                <select
                  aria-label="Minimum total liquidity"
                  className="football-liquidity-threshold"
                  onChange={(event) => onMinLiquidityChange(Number(event.currentTarget.value || 0))}
                  title="Minimum total liquidity"
                  value={String(minLiquidity || 0)}
                >
                  {liquidityThresholdOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : null}
              {onCountryScopeChange && countryFilterOptions?.length ? (
                <div className="football-country-combobox" ref={countryMenuRef}>
                  <button
                    aria-expanded={countryMenuOpen}
                    aria-haspopup="listbox"
                    aria-label="Country filter"
                    className="football-country-filter"
                    onClick={() => setCountryMenuOpen((open) => !open)}
                    title="Country filter"
                    type="button"
                  >
                    <CountryFlag country={selectedCountryOption?.value === "all" ? null : selectedCountryOption?.value} />
                    <span>{selectedCountryOption?.label || "ALL COUNTRIES"}</span>
                  </button>
                  {countryMenuOpen ? (
                    <div className="football-country-menu" role="listbox">
                      {countryFilterOptions.map((option) => {
                        const active = option.value === "all" ? isAllCountryScope : !isAllCountryScope && countryMatches(option.value, countryScope);
                        return (
                          <button
                            aria-selected={active}
                            className={active ? "football-country-option active" : "football-country-option"}
                            key={option.value}
                            onClick={() => {
                              onCountryScopeChange(option.value);
                              setCountryMenuOpen(false);
                            }}
                            role="option"
                            type="button"
                          >
                            <CountryFlag country={option.value === "all" ? null : option.value} />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </nav>
      </div>
      <div>
        <span>{footballScopeBreadcrumb(dateScope, locationScope)}</span>
        {(meta || []).map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}
