import { Link, useLocation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { COUNTRY_NAMES, COUNTRY_PATHS, countryFromPath } from "../lib/api";
import type { CountryCode } from "../lib/types";
import { Flag } from "./Flag";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { hasRole, useAuth } from "./AuthProvider";

const COUNTRY_KEY = "allodoc.country";
const CAPITALS: Record<CountryCode, string> = { ML: "Bamako", BF: "Ouagadougou", NE: "Niamey" };

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

function CountryPicker() {
  const { pathname } = useLocation();
  const fromPath = countryFromPath(pathname.split("/")[1] ?? "");
  const remembered = useRememberedCountry();
  const current = fromPath ?? remembered;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fromPath) rememberCountry(fromPath);
  }, [fromPath]);

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

  return (
    <div className="country-picker" ref={ref}>
      <button type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {current ? <Flag code={current} width={24} /> : <Icon name="pin" size={18} />}
        <span className="country-label">{current ? COUNTRY_NAMES[current] : "Choisir un pays"}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <ul className="country-menu" role="menu">
          {(Object.keys(COUNTRY_NAMES) as CountryCode[]).map((code) => (
            <li key={code} role="none">
              <Link
                role="menuitem"
                to={`/${COUNTRY_PATHS[code]}`}
                aria-current={code === current}
                onClick={() => {
                  rememberCountry(code);
                  setOpen(false);
                }}
              >
                <Flag code={code} width={32} />
                <span>
                  {COUNTRY_NAMES[code]}
                  <small>{CAPITALS[code]} et régions</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Header() {
  const { user, ready } = useAuth();

  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <div className="header-spacer" />
        {(!user || !hasRole(user, "ROLE_PRACTITIONER")) && (
          <Link to="/pro" className="header-link header-pro">
            Vous êtes soignant ?
          </Link>
        )}
        {hasRole(user, "ROLE_PRACTITIONER") && (
          <Link to="/pro" className="header-link header-pro">
            Mon agenda
          </Link>
        )}
        {hasRole(user, "ROLE_COUNTRY_ADMIN") && (
          <Link to="/admin" className="header-link header-pro">
            Administration
          </Link>
        )}
        <Link to="/application" className="header-link header-app" aria-label="Télécharger l'application mobile">
          <Icon name="smartphone" size={18} />
          <span className="country-label">Télécharger l&apos;app</span>
        </Link>
        <CountryPicker />
        {ready && (
          <Link to={user ? "/compte" : "/connexion"} className="header-link row" aria-label={user ? "Mon compte" : "Se connecter"}>
            <Icon name="user" size={20} />
            <span className="country-label">{user ? user.firstName ?? "Mon compte" : "Se connecter"}</span>
          </Link>
        )}
      </div>
      <div className="kente-band" />
    </header>
  );
}
