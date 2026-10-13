import { useEffect, useState } from "react";
import { isNativeApp } from "../lib/install";
import { api, API_URL, ApiError, countryName } from "../lib/api";
import { SUBREGIONS, subregionName } from "../lib/africa";
import { useCountries } from "../lib/hooks";
import { translate, useI18n } from "../lib/i18n";
import type { CountryCode, User } from "../lib/types";
import { useAuth } from "./AuthProvider";
import { Flag } from "./Flag";
import { useRememberedCountry } from "./Header";
import { Icon } from "./Icon";

/** Placeholder : numéro national fictif à la bonne longueur ("70 12 34 56" au Mali, "803 123 4567" au Nigeria). */
function phonePlaceholder(length: number) {
  return "7012345678901".slice(0, length).replace(/(\d{2})(?=\d)/g, "$1 ");
}

interface Provider {
  id: "google" | "github";
  name: string;
  configured: boolean;
}

interface Sent {
  destination: Record<string, string>;
  masked: string;
  devCode?: string;
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function GithubLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export const OAUTH_NONCE_KEY = "allodoc.oauthNonce";

/** Valeur aléatoire gardée dans l'onglet : le code de retour Google / GitHub n'est utilisable que par ce navigateur. */
function newNonce() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    sessionStorage.setItem(OAUTH_NONCE_KEY, nonce);
  } catch {
    /* stockage indisponible : l'échange échouera proprement */
  }
  return nonce;
}

/** Boutons "Continuer avec Google / GitHub" : navigation complète vers l'API, qui redirige vers le fournisseur. */
export function OAuthButtons({ next }: { next: string }) {
  // Google interdit sa connexion dans les vues web intégrées (APK) : on garde alors SMS et email.
  if (isNativeApp()) return null;
  return <OAuthButtonList next={next} />;
}

function OAuthButtonList({ next }: { next: string }) {
  const [providers, setProviders] = useState<Provider[]>([
    { id: "google", name: "Google", configured: true },
    { id: "github", name: "GitHub", configured: true },
  ]);
  const [notice, setNotice] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    api<Provider[]>("/api/auth/oauth/providers", { auth: false }).then(setProviders).catch(() => {});
  }, []);

  return (
    <div className="stack" style={{ gap: 8 }}>
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`btn btn-block btn-social btn-${p.id}`}
          onClick={() => {
            if (!p.configured) {
              setNotice(t("otp.providerDisabled", { provider: p.name }));
              return;
            }
            window.location.href = `${API_URL}/api/auth/oauth/${p.id}?next=${encodeURIComponent(next)}&nonce=${newNonce()}`;
          }}
        >
          {p.id === "google" ? <GoogleLogo /> : <GithubLogo />}
          {t("otp.continueWith", { provider: p.name })}
        </button>
      ))}
      {notice && <p className="alert alert-warn small">{notice}</p>}
    </div>
  );
}

/** Saisie d'un numéro avec indicatif pays. */
export function PhoneField({ country, setCountry, phone, setPhone }: { country: CountryCode; setCountry: (c: CountryCode) => void; phone: string; setPhone: (p: string) => void }) {
  const { t } = useI18n();
  const countries = useCountries();
  const current = countries.find((c) => c.code === country);
  return (
    <div className="phone-input">
      <label className="prefix">
        <Flag code={country} width={22} />
        <select aria-label={t("otp.country")} value={country} onChange={(e) => setCountry(e.target.value as CountryCode)} style={{ border: 0, background: "transparent", fontWeight: 700 }}>
          {!current && <option value={country}>{countryName(country)}</option>}
          {SUBREGIONS.map((s) => (
            <optgroup key={s.code} label={subregionName(s.code)}>
              {countries
                .filter((c) => c.subregion === s.code)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.phonePrefix} {countryName(c.code)}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <input id="phone" className="input" type="tel" dir="ltr" inputMode="tel" autoComplete="tel-national" placeholder={phonePlaceholder(current?.phoneLengths[0] ?? 8)} value={phone} onChange={(e) => setPhone(e.target.value)} required />
    </div>
  );
}

/** Étape "code reçu" commune au SMS et à l'email. */
function CodeStep({ sent, busy, error, onSubmit, onBack, onResend }: { sent: Sent; busy: boolean; error: string | null; onSubmit: (code: string) => void; onBack: () => void; onResend: () => void }) {
  const [code, setCode] = useState("");
  const { t } = useI18n();
  const isEmail = "email" in sent.destination;
  return (
    <form
      className="card form-card"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(code);
      }}
    >
      <h2>{t("otp.enterCode")}</h2>
      <p className="muted">
        {isEmail ? t("otp.sentByEmail") : t("otp.sentBySms")} <b dir="ltr">{sent.masked}</b>.
        {isEmail && ` ${t("otp.checkSpam")}`}
      </p>
      {sent.devCode && (
        <p className="alert alert-info small">
          <Icon name="info" size={18} /> {t("otp.demoCode")} <b>{sent.devCode}</b> ({isEmail ? t("otp.demoNoEmail") : t("otp.demoNoSms")})
        </p>
      )}
      <div>
        <label className="field-label" htmlFor="otp">
          {t("otp.codeLabel")}
        </label>
        <input id="otp" className="input otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
      </div>
      {error && <p className="alert alert-error">{error}</p>}
      <button className="btn btn-primary btn-block" disabled={busy || code.length !== 6}>
        {busy ? t("otp.verifying") : t("otp.validate")}
      </button>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          {isEmail ? t("otp.changeEmail") : t("otp.changeNumber")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onResend} disabled={busy}>
          {t("otp.resend")}
        </button>
      </div>
    </form>
  );
}

function useCodeFlow() {
  const [sent, setSent] = useState<Sent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : translate("error.network"));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function request(destination: Record<string, string>) {
    const res = await run(() =>
      api<{ maskedDestination: string; devCode?: string }>("/api/auth/otp/request", { method: "POST", body: JSON.stringify(destination), auth: false }),
    );
    if (res) setSent({ destination, masked: res.maskedDestination, devCode: res.devCode });
  }

  return { sent, setSent, error, setError, busy, run, request };
}

/**
 * Connexion / inscription sans mot de passe : Google, GitHub, code par SMS ou code par email.
 * `next` = page où revenir après une connexion Google / GitHub (qui quitte l'application le temps de l'autorisation).
 */
export function OtpLogin({ onDone, title, next = "/compte" }: { onDone?: (user: User) => void; title?: string; next?: string }) {
  const { login } = useAuth();
  const { t } = useI18n();
  const remembered = useRememberedCountry();
  const [mode, setMode] = useState<"sms" | "email">("sms");
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const flow = useCodeFlow();
  const effectiveCountry = country ?? remembered ?? "ML";

  async function verify(code: string) {
    if (!flow.sent) return;
    const res = await flow.run(() =>
      api<{ token: string; user: User }>("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ ...flow.sent!.destination, code }), auth: false }),
    );
    if (res) {
      login(res.token, res.user);
      onDone?.(res.user);
    }
  }

  if (flow.sent) {
    return <CodeStep sent={flow.sent} busy={flow.busy} error={flow.error} onSubmit={verify} onBack={() => flow.setSent(null)} onResend={() => flow.request(flow.sent!.destination)} />;
  }

  return (
    <form
      className="card form-card"
      onSubmit={(e) => {
        e.preventDefault();
        flow.request(mode === "email" ? { email } : { phone, country: effectiveCountry });
      }}
    >
      <h2>{title ?? t("otp.title")}</h2>
      <p className="muted">{t("otp.intro")}</p>

      <OAuthButtons next={next} />

      <div className="divider">
        <span>{t("otp.orReceiveCode")}</span>
      </div>

      <div className="segmented" role="tablist" aria-label={t("otp.mode")}>
        <button type="button" role="tab" aria-selected={mode === "sms"} onClick={() => setMode("sms")}>
          <Icon name="phone" size={16} /> {t("otp.bySms")}
        </button>
        <button type="button" role="tab" aria-selected={mode === "email"} onClick={() => setMode("email")}>
          <Icon name="mail" size={16} /> {t("otp.byEmail")}
        </button>
      </div>

      {mode === "sms" ? (
        <div>
          <label className="field-label" htmlFor="phone">
            {t("otp.phoneNumber")}
          </label>
          <PhoneField country={effectiveCountry} setCountry={setCountry} phone={phone} setPhone={setPhone} />
        </div>
      ) : (
        <div>
          <label className="field-label" htmlFor="email">
            {t("otp.emailAddress")}
          </label>
          <input id="email" className="input" type="email" inputMode="email" autoComplete="email" placeholder={t("otp.emailPlaceholder")} dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      )}

      {flow.error && <p className="alert alert-error">{flow.error}</p>}
      <button className="btn btn-primary btn-block" disabled={flow.busy || (mode === "sms" ? phone.replace(/\D/g, "").length < 7 : !email.includes("@"))}>
        {flow.busy ? t("common.sending") : t("otp.receiveCode")}
      </button>
      <p className="muted small">
        {t("otp.firstVisit")}
      </p>
    </form>
  );
}

/**
 * Ajout d'un numéro vérifié à un compte existant (compte créé par email, Google ou GitHub) :
 * indispensable pour réserver, car confirmations et rappels partent par SMS.
 */
export function PhoneVerify({ onDone, intro }: { onDone: (user: User) => void; intro?: string }) {
  const remembered = useRememberedCountry();
  const { t } = useI18n();
  const [country, setCountry] = useState<CountryCode | null>(null);
  const [phone, setPhone] = useState("");
  const flow = useCodeFlow();
  const effectiveCountry = country ?? remembered ?? "ML";

  async function verify(code: string) {
    if (!flow.sent) return;
    const user = await flow.run(() => api<User>("/api/me/phone", { method: "POST", body: JSON.stringify({ ...flow.sent!.destination, code }) }));
    if (user) onDone(user);
  }

  if (flow.sent) {
    return <CodeStep sent={flow.sent} busy={flow.busy} error={flow.error} onSubmit={verify} onBack={() => flow.setSent(null)} onResend={() => flow.request(flow.sent!.destination)} />;
  }

  return (
    <div className="stack">
      {intro && <p className="muted">{intro}</p>}
      <PhoneField country={effectiveCountry} setCountry={setCountry} phone={phone} setPhone={setPhone} />
      {flow.error && <p className="alert alert-error">{flow.error}</p>}
      <button type="button" className="btn btn-indigo" disabled={flow.busy || phone.replace(/\D/g, "").length < 7} onClick={() => flow.request({ phone, country: effectiveCountry })}>
        {flow.busy ? t("common.sending") : t("otp.verifyPhone")}
      </button>
    </div>
  );
}

/**
 * Vérification d'une adresse email sur un compte existant : permet ensuite de se connecter à ce même compte
 * par code email, Google ou GitHub.
 */
export function EmailVerify({ onDone, initial = "" }: { onDone: (user: User) => void; initial?: string }) {
  const [email, setEmail] = useState(initial);
  const { t } = useI18n();
  const flow = useCodeFlow();

  async function verify(code: string) {
    if (!flow.sent) return;
    const user = await flow.run(() => api<User>("/api/me/email", { method: "POST", body: JSON.stringify({ ...flow.sent!.destination, code }) }));
    if (user) onDone(user);
  }

  if (flow.sent) {
    return <CodeStep sent={flow.sent} busy={flow.busy} error={flow.error} onSubmit={verify} onBack={() => flow.setSent(null)} onResend={() => flow.request(flow.sent!.destination)} />;
  }

  return (
    <div className="stack">
      <input className="input" type="email" autoComplete="email" placeholder={t("otp.emailPlaceholder")} dir="ltr" aria-label={t("otp.emailAddress")} value={email} onChange={(e) => setEmail(e.target.value)} />
      {flow.error && <p className="alert alert-error">{flow.error}</p>}
      <button type="button" className="btn btn-indigo" disabled={flow.busy || !email.includes("@")} onClick={() => flow.request({ email })}>
        {flow.busy ? t("common.sending") : t("otp.verifyEmail")}
      </button>
    </div>
  );
}
