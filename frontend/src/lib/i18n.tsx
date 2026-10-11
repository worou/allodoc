import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ar } from "../i18n/ar";
import { en } from "../i18n/en";
import { es } from "../i18n/es";
import { fr } from "../i18n/fr";
import { pt } from "../i18n/pt";

export type Lang = "fr" | "en" | "es" | "pt" | "ar";
export type MessageKey = keyof typeof fr;
/** Chaque langue doit fournir toutes les clés du français : une clé manquante fait échouer `tsc -b`. */
export type Messages = Record<MessageKey, string>;
export type Vars = Record<string, string | number>;
/** Clés existant en deux variantes `_one` / `_other`. */
export type PluralKey = { [K in MessageKey]: K extends `${infer B}_one` ? B : never }[MessageKey];

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
];

const DICTS: Record<Lang, Messages> = { fr, en, es, pt, ar };
/** Arabe : chiffres latins conservés pour les prix, horaires et numéros de téléphone. */
const INTL: Record<Lang, string> = { fr: "fr-FR", en: "en-GB", es: "es-ES", pt: "pt-PT", ar: "ar-u-nu-latn" };
const LANG_KEY = "allodoc.lang";

function isLang(value: unknown): value is Lang {
  return value === "fr" || value === "en" || value === "es" || value === "pt" || value === "ar";
}

/** Langue choisie lors d'une visite précédente, sinon le français. */
function detect(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* stockage indisponible */
  }
  return "fr";
}

function applyToDocument(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

// Langue courante au niveau du module : les fonctions de format (dates, montants) la lisent sans contexte React.
let current: Lang = detect();
applyToDocument(current);

export function getLang(): Lang {
  return current;
}

export function intlLocale(lang: Lang = current): string {
  return INTL[lang];
}

export function translate(key: MessageKey, vars?: Vars, lang: Lang = current): string {
  const text = DICTS[lang][key] ?? fr[key];
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;
}

/** Accord selon le nombre ({n} est fourni automatiquement). */
export function translatePlural(key: PluralKey, n: number, vars?: Vars, lang: Lang = current): string {
  const one = new Intl.PluralRules(INTL[lang]).select(n) === "one";
  return translate(`${key}_${one ? "one" : "other"}` as MessageKey, { n, ...vars }, lang);
}

/** Libellé traduit d'une valeur dynamique (spécialité, statut…), ou repli sur le texte reçu de l'API. */
export function translateOr(key: string, fallback: string): string {
  return key in fr ? translate(key as MessageKey) : fallback;
}

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  tn: (key: PluralKey, n: number, vars?: Vars) => string;
}

const I18nContext = createContext<I18nState>({
  lang: current,
  setLang: () => {},
  t: (key, vars) => translate(key, vars),
  tn: (key, n, vars) => translatePlural(key, n, vars),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);

  const setLang = useCallback((next: Lang) => {
    current = next;
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      /* choix gardé pour la session seulement */
    }
    setLangState(next);
  }, []);

  useEffect(() => {
    applyToDocument(lang);
  }, [lang]);

  const value = useMemo<I18nState>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(key, vars, lang),
      tn: (key, n, vars) => translatePlural(key, n, vars, lang),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Traductions du composant ; il se réaffiche à chaque changement de langue. */
export function useI18n() {
  return useContext(I18nContext);
}

/** Phrase traduite contenant des éléments mis en forme : `{name}` est remplacé par le nœud correspondant. */
export function Trans({ text, values }: { text: string; values: Record<string, ReactNode> }) {
  const parts = text.split(/\{(\w+)\}/);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{i % 2 === 1 ? (part in values ? values[part] : `{${part}}`) : part}</Fragment>
      ))}
    </>
  );
}
