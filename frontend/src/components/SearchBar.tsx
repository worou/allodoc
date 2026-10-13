import { useNavigate } from "react-router";
import { useMemo, useRef, useState } from "react";
import { SUBREGIONS, subregionName } from "../lib/africa";
import { countryName } from "../lib/api";
import { useCountries, useRegions } from "../lib/hooks";
import { useI18n } from "../lib/i18n";
import type { CountryCode } from "../lib/types";
import { Icon } from "./Icon";
import { useRememberedCountry } from "./Header";

export interface SearchRegion {
  slug: string;
  name: string;
  country: CountryCode;
}

export interface SearchSpecialty {
  slug: string;
  name: string;
  icon: string;
}

interface Props {
  specialties: SearchSpecialty[];
  /** Pays imposé (page pays) : le champ "Où ?" ne liste alors que ses régions. */
  country?: CountryCode;
  initial?: { q?: string; specialty?: string; region?: string; country?: string };
  compact?: boolean;
}

/** Normalise pour une recherche tolérante aux accents : "pediatre" trouve "Pédiatre". */
function fold(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function SearchBar({ specialties, country, initial, compact }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const remembered = useRememberedCountry();
  const initialSpecialty = specialties.find((s) => s.slug === initial?.specialty);
  const [text, setText] = useState(initialSpecialty?.name ?? initial?.q ?? "");
  const [specialty, setSpecialty] = useState<string | undefined>(initialSpecialty?.slug);
  const [where, setWhere] = useState<string>(() => {
    const c = initial?.country ?? country;
    if (c && initial?.region) return `${c}:${initial.region}`;
    return c ?? "";
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const effectiveWhere = where || (remembered && !country ? remembered : "");
  const matches = useMemo(() => {
    const q = fold(text.trim());
    if (!q) return specialties.slice(0, 8);
    return specialties.filter((s) => fold(s.name).includes(q) || fold(s.slug).includes(q)).slice(0, 8);
  }, [text, specialties]);

  const countries = useCountries();
  // Régions listées : celles du pays imposé ou du pays choisi (chargées à la demande, plus de 800 sur le continent).
  const regionCountry = country ?? (effectiveWhere.split(":")[0] || null);
  const regions = useRegions(regionCountry);

  function submit(chosenSpecialty = specialty, label = text) {
    const params = new URLSearchParams();
    const [c, r] = effectiveWhere.split(":");
    if (c) params.set("country", c);
    if (r) params.set("region", r);
    if (chosenSpecialty) params.set("specialty", chosenSpecialty);
    else if (label.trim()) params.set("q", label.trim());
    navigate(`/recherche?${params.toString()}`);
  }

  function choose(s: SearchSpecialty) {
    setText(s.name);
    setSpecialty(s.slug);
    setOpen(false);
  }

  return (
    <form
      className="searchbar"
      role="search"
      style={compact ? { marginTop: 0 } : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="field">
        <Icon name="search" />
        <label className="visually-hidden" htmlFor="search-what">
          {t("search.whatLabel")}
        </label>
        <input
          id="search-what"
          type="search"
          autoComplete="off"
          placeholder={t("search.whatPlaceholder")}
          value={text}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="search-suggestions"
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setSpecialty(undefined);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (!open || matches.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && !specialty && text.trim() && fold(matches[active].name).includes(fold(text.trim()))) {
              e.preventDefault();
              choose(matches[active]);
              submit(matches[active].slug, matches[active].name);
            }
          }}
        />
        {open && matches.length > 0 && (
          <ul className="suggestions" id="search-suggestions" role="listbox">
            <li className="group">{t("search.specialties")}</li>
            {matches.map((s, i) => (
              <li key={s.slug} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  data-active={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    clearTimeout(blurTimer.current);
                    choose(s);
                  }}
                >
                  <Icon name={s.icon} size={18} />
                  {s.name}
                </button>
              </li>
            ))}
            {text.trim() && !specialty && (
              <li className="group">{t("search.orByName", { text: text.trim() })}</li>
            )}
          </ul>
        )}
      </div>
      <div className="field">
        <Icon name="pin" />
        <label className="visually-hidden" htmlFor="search-where">
          {t("search.where")}
        </label>
        <select id="search-where" value={effectiveWhere} onChange={(e) => setWhere(e.target.value)}>
          {!country && <option value="">{t("search.allCountries")}</option>}
          {regionCountry && (
            <optgroup label={countryName(regionCountry)}>
              <option value={regionCountry}>{t("search.wholeCountry", { country: countryName(regionCountry) })}</option>
              {regions
                .filter((r) => r.country === regionCountry)
                .map((r) => (
                  <option key={r.slug} value={`${regionCountry}:${r.slug}`}>
                    {r.name}
                  </option>
                ))}
            </optgroup>
          )}
          {!country &&
            SUBREGIONS.map((s) => (
              <optgroup key={s.code} label={subregionName(s.code)}>
                {countries
                  .filter((c) => c.subregion === s.code && c.code !== regionCountry)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {countryName(c.code)}
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
      </div>
      <button className="btn btn-primary" type="submit">
        <Icon name="search" size={18} />
        {t("search.submit")}
      </button>
    </form>
  );
}
