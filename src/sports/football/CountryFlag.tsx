import { countryFlagCode, countryFlagUrl } from "./liquidityFilterOptions";

export function CountryFlag({ country }: { country: string | null | undefined }) {
  const label = String(country || "").trim();
  if (!label) return null;
  const url = countryFlagUrl(label);
  const code = countryFlagCode(label);

  return (
    <span className="country-flag" title={label} aria-hidden="true">
      <span className="country-flag-code">{code}</span>
      {url ? (
        <img
          alt=""
          loading="lazy"
          src={url}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      ) : null}
    </span>
  );
}
