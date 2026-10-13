import { Link, NavLink, useLocation } from "react-router";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { SUBREGIONS, subregionName, subregionPath } from "../lib/africa";
import { countryFromPath, countryName, countryPath } from "../lib/api";
import { useCountries } from "../lib/hooks";
import { LANGUAGES, useI18n } from "../lib/i18n";
import type { CountryCode } from "../lib/types";
import { Flag } from "./Flag";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { hasRole, useAuth } from "./AuthProvider";

const COUNTRY_KEY = "allodoc.country";

/** Pays mémorisé pour les visites suivantes (stockage local, sans compte). */
export function rememberCountry(code: CountryCode) {
  try {
    window.localStorage.setItem(COUNTRY_KEY, code);
  } catch {
    /* ignoré */
  }
}

export function useRememberedCountry(): CountryCode | null {
  const [code, setCode] = useState<CountryCode | null>(null);
  useEffect(() => {
    try {
      setCode(countryFromPath(window.localStorage.getItem(COUNTRY_KEY) ?? ""));
    } catch {
      setCode(null);
    }
  }, []);
  return code;
}

/** Menu déroulant fermé au clic à l'extérieur ou avec Échap. */
function useDropdown(): [boolean, (open: boolean | ((v: boolean) => boolean)) => void, RefObject<HTMLDivElement | null>] {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return [open, setOpen, ref];
}

/** Normalise pour une recherche tolérante aux accents : "cote" trouve "Côte d'Ivoire". */
function fold(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function CountryPicker() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const countries = useCountries();
  const segment = pathname.split("/")[1] ?? "";
  const fromPath = countries.some((c) => c.code === countryFromPath(segment)) ? countryFromPath(segment) : null;
  const remembered = useRememberedCountry();
  const current = fromPath ?? remembered;
  const [open, setOpen, ref] = useDropdown();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (fromPath) rememberCountry(fromPath);
  }, [fromPath]);
  useEffect(() => {
    if (!open) setFilter("");
  }, [open]);

  const q = fold(filter.trim());
  const visible = countries.filter((c) => !q || fold(countryName(c.code)).includes(q) || fold(c.name).includes(q) || fold(c.capital).includes(q));

  return (
    <div className="country-picker" ref={ref}>
      <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {current ? <Flag code={current} width={24} /> : <Icon name="pin" size={18} />}
        <span className="country-label">{current ? countryName(current) : t("header.chooseCountry")}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <div className="country-menu country-menu-wide">
          <div className="country-filter">
            <Icon name="search" size={16} />
            <input
              type="search"
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("header.searchCountry")}
              aria-label={t("header.searchCountry")}
            />
          </div>
          <ul role="menu">
            {SUBREGIONS.map((s) => {
              const group = visible.filter((c) => c.subregion === s.code);
              if (group.length === 0) return null;
              return (
                <li key={s.code} role="none" className="country-group">
                  <Link role="menuitem" className="country-group-title" to={subregionPath(s.code)} onClick={() => setOpen(false)} style={{ "--dot": s.color } as CSSProperties}>
                    {subregionName(s.code)}
                  </Link>
                  <ul role="none">
                    {group.map((c) => (
                      <li key={c.code} role="none">
                        <Link
                          role="menuitem"
                          to={countryPath(c.code)}
                          aria-current={c.code === current}
                          onClick={() => {
                            rememberCountry(c.code);
                            setOpen(false);
                          }}
                        >
                          <Flag code={c.code} width={28} />
                          <span>
                            {countryName(c.code)}
                            <small>{t("header.capitalAndRegions", { capital: c.capital })}</small>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          <Link to="/afrique" className="country-menu-all" onClick={() => setOpen(false)}>
            <Icon name="globe" size={16} /> {t("header.allAfrica")}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Choix de la langue de l'interface : français, anglais, espagnol, portugais, arabe. */
function LanguagePicker() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen, ref] = useDropdown();
  const currentLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? lang;

  return (
    <div className="country-picker lang-picker" ref={ref}>
      <button type="button" aria-haspopup="true" aria-expanded={open} aria-label={t("header.language")} onClick={() => setOpen((v) => !v)}>
        <Icon name="language" size={18} />
        <span className="lang-code" aria-hidden="true">{lang.toUpperCase()}</span>
        <span className="country-label">{currentLabel}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <ul className="country-menu lang-menu" role="menu" aria-label={t("header.language")}>
          {LANGUAGES.map((l) => (
            <li key={l.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l.code === lang}
                lang={l.code}
                dir={l.code === "ar" ? "rtl" : "ltr"}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
              >
                <span className="lang-badge" aria-hidden="true">{l.code.toUpperCase()}</span>
                <span>{l.label}</span>
                {l.code === lang && <Icon name="check" size={16} className="lang-check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Header() {
  const { user, ready } = useAuth();
  const { t } = useI18n();

  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <nav className="header-nav" aria-label={t("africa.tabs")}>
          <NavLink to="/afrique" className="header-link header-africa">
            <Icon name="globe" size={18} />
            <span>{t("nav.africa")}</span>
          </NavLink>
        </nav>
        <div className="header-spacer" />
        {(!user || !hasRole(user, "ROLE_PRACTITIONER")) && (
          <Link to="/pro" className="header-link header-pro">
            {t("header.forProfessionals")}
          </Link>
        )}
        {hasRole(user, "ROLE_PRACTITIONER") && (
          <Link to="/pro" className="header-link header-pro">
            {t("header.myAgenda")}
          </Link>
        )}
        {hasRole(user, "ROLE_COUNTRY_ADMIN") && (
          <Link to="/admin" className="header-link header-pro">
            {t("header.admin")}
          </Link>
        )}
        <Link to="/application" className="header-link header-app" aria-label={t("header.downloadAppLabel")}>
          <Icon name="smartphone" size={18} />
          <span className="country-label">{t("header.downloadApp")}</span>
        </Link>
        <CountryPicker />
        <LanguagePicker />
        {ready && (
          <Link to={user ? "/compte" : "/connexion"} className="header-link row" aria-label={user ? t("header.myAccount") : t("nav.login")}>
            <Icon name="user" size={20} />
            <span className="country-label">{user ? user.firstName ?? t("header.myAccount") : t("nav.login")}</span>
          </Link>
        )}
      </div>
      <div className="kente-band" />
    </header>
  );
}
