import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../components/AuthProvider";
import { Icon } from "../components/Icon";
import { EmailVerify, PhoneVerify } from "../components/OtpLogin";
import { ErrorState, Loading, LoginRequired } from "../components/States";
import { api, ApiError } from "../lib/api";
import { dayShort, fullDate, hour, longDate, monthShort, relationLabel, specialtyList, statusLabel } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import { useI18n } from "../lib/i18n";
import type { Appointment, User } from "../lib/types";

const RELATIONS = ["enfant", "parent", "conjoint", "autre"];

function AppointmentCard({ a, past, onCancel }: { a: Appointment; past?: boolean; onCancel?: (a: Appointment) => void }) {
  const { t } = useI18n();
  const tagClass = a.status === "cancelled" || a.status === "no_show" ? "tag-danger" : a.status === "honored" ? "tag-green" : "tag-indigo";
  return (
    <article className={`card appt-card${past ? " past" : ""}`}>
      <div className="appt-date">
        <small>{dayShort(a.localDate)}</small>
        <b>{a.localDate.slice(8)}</b>
        <small>{monthShort(a.localDate)}</small>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="row">
          <span className={`tag ${tagClass}`}>{statusLabel(a.status)}</span>
          <span className="small muted">{hour(a.localTime)}</span>
        </div>
        <Link to={`/medecin/${a.practitioner.slug}`} style={{ fontWeight: 800, fontSize: 17, display: "block", marginTop: 4 }}>
          {a.practitioner.fullName}
        </Link>
        <p className="small muted">{specialtyList(a.practitioner.specialties)}</p>
        <p className="small">
          {a.facility.name} · {a.facility.address}
        </p>
        {a.relative && (
          <p className="small row" style={{ marginTop: 4 }}>
            <Icon name="users" size={14} /> {t("account.for", { name: `${a.relative.firstName} ${a.relative.lastName}` })}
          </p>
        )}
      </div>
      {!past && onCancel && (
        <div className="appt-actions">
          <Link to={`/medecin/${a.practitioner.slug}?reschedule=${a.id}`} className="btn btn-sm btn-outline">
            {t("account.move")}
          </Link>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => onCancel(a)}>
            {t("common.cancel")}
          </button>
          {a.facility.phone && (
            <a href={`tel:${a.facility.phone.replace(/\s/g, "")}`} className="btn btn-sm btn-ghost">
              <Icon name="phone" size={16} /> {t("account.call")}
            </a>
          )}
        </div>
      )}
    </article>
  );
}

function Profile({ user }: { user: User }) {
  const { t } = useI18n();
  const { refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", email: user.email ?? "" });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [relative, setRelative] = useState({ firstName: "", lastName: "", relation: "enfant", birthDate: "" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api<User>("/api/me", { method: "PATCH", body: JSON.stringify(form) });
      await refresh();
      setMessage({ ok: true, text: t("account.saved") });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : t("error.save") });
    }
  }

  async function addRelative(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/me/relatives", { method: "POST", body: JSON.stringify({ ...relative, birthDate: relative.birthDate || undefined }) });
      await refresh();
      setRelative({ firstName: "", lastName: "", relation: "enfant", birthDate: "" });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : t("account.addFailed") });
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <form className="card form-card" onSubmit={save}>
        <h2>{t("account.myInfo")}</h2>
        <div className="small muted stack" style={{ gap: 4 }}>
          <span className="row">
            <Icon name="phone" size={14} />{" "}
            {user.phone ? (
              <>
                {t("account.phoneVerified")} <b dir="ltr">{user.phone}</b>
              </>
            ) : (
              t("account.noPhone")
            )}
          </span>
          {user.email && (
            <span className="row">
              <Icon name="mail" size={14} /> {user.email} {user.emailVerified && <span className="tag tag-green">{t("account.emailVerified")}</span>}
            </span>
          )}
          {user.linkedAccounts.length > 0 && (
            <span className="row">
              <Icon name="check" size={14} /> {t("account.linked", { providers: user.linkedAccounts.map((a) => (a === "google" ? "Google" : "GitHub")).join(t("account.and")) })}
            </span>
          )}
        </div>
        <div className="row" style={{ alignItems: "stretch" }}>
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder={t("common.firstName")} aria-label={t("common.firstName")} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder={t("common.lastName")} aria-label={t("common.lastName")} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <input className="input" type="email" placeholder={t("account.emailPlaceholder")} aria-label={t("account.email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        {message && <p className={`alert ${message.ok ? "alert-ok" : "alert-error"}`}>{message.text}</p>}
        <button className="btn btn-indigo">{t("common.save")}</button>
      </form>

      <section className="card form-card">
        <h2>{user.phone ? t("account.changeNumber") : t("account.addNumber")}</h2>
        <PhoneVerify
          key={user.phone ?? "none"}
          intro={user.phone ? t("account.newNumberHint") : t("account.numberRequired")}
          onDone={async () => {
            await refresh();
            setMessage({ ok: true, text: t("account.numberSaved") });
          }}
        />
      </section>

      {!user.emailVerified && (
        <section className="card form-card">
          <h2>{t("account.verifyEmail")}</h2>
          <p className="muted">{t("account.verifyEmailHint")}</p>
          <EmailVerify
            initial={user.email ?? ""}
            onDone={async () => {
              await refresh();
              setMessage({ ok: true, text: t("account.emailSaved") });
            }}
          />
        </section>
      )}

      <section className="card form-card">
        <h2>{t("account.relatives")}</h2>
        <p className="muted small">{t("account.relativesHint")}</p>
        {user.relatives.length === 0 && <p className="muted">{t("account.noRelatives")}</p>}
        {user.relatives.map((r) => (
          <div key={r.id} className="row">
            <Icon name="user" size={18} />
            <b>
              {r.firstName} {r.lastName}
            </b>
            <span className="tag">{relationLabel(r.relation)}</span>
            {r.birthDate && <span className="small muted">{t("account.bornOn", { date: fullDate(r.birthDate) })}</span>}
          </div>
        ))}
        <form className="stack" onSubmit={addRelative} style={{ borderTop: "1px dashed var(--line)", paddingTop: 14 }}>
          <div className="row" style={{ alignItems: "stretch" }}>
            <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder={t("common.firstName")} aria-label={t("account.relativeFirstName")} value={relative.firstName} onChange={(e) => setRelative({ ...relative, firstName: e.target.value })} required />
            <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder={t("common.lastName")} aria-label={t("account.relativeLastName")} value={relative.lastName} onChange={(e) => setRelative({ ...relative, lastName: e.target.value })} required />
          </div>
          <div className="row" style={{ alignItems: "stretch" }}>
            <select className="select" style={{ flex: 1, minWidth: 140 }} value={relative.relation} onChange={(e) => setRelative({ ...relative, relation: e.target.value })} aria-label={t("account.relation")}>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {relationLabel(r)}
                </option>
              ))}
            </select>
            <input className="input" style={{ flex: 1, minWidth: 140 }} type="date" aria-label={t("account.birthDate")} value={relative.birthDate} onChange={(e) => setRelative({ ...relative, birthDate: e.target.value })} />
          </div>
          <button className="btn btn-outline">
            <Icon name="plus" size={18} /> {t("account.addRelative")}
          </button>
        </form>
      </section>

      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          logout();
          navigate("/");
        }}
      >
        <Icon name="logout" size={18} /> {t("account.logout")}
      </button>
    </div>
  );
}

export default function Account() {
  const { t } = useI18n();
  useTitle(t("account.title"));
  const { user, ready } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"upcoming" | "past" | "profile">(params.get("onglet") === "profil" ? "profile" : "upcoming");
  // La barre d'onglets mobile change ?onglet= sans quitter la page : on suit l'URL.
  const ongletParam = params.get("onglet");
  useEffect(() => {
    setTab(ongletParam === "profil" ? "profile" : "upcoming");
  }, [ongletParam]);
  const { data, error, loading, reload } = useApi<{ upcoming: Appointment[]; past: Appointment[] }>(user ? "/api/me/appointments" : null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!ready) return <Loading />;
  if (!user) return <LoginRequired next="/compte" />;

  async function cancel(a: Appointment) {
    if (!window.confirm(t("account.cancelConfirm", { date: longDate(a.localDate), time: hour(a.localTime) }))) return;
    try {
      await api(`/api/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) });
      setNotice(t("account.cancelled"));
      reload();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : t("account.cancelFailed"));
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>{t("account.hello", { name: user.firstName ?? "" })}</h1>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "upcoming"} onClick={() => setTab("upcoming")}>
              {t("account.upcoming")} {data ? `(${data.upcoming.length})` : ""}
            </button>
            <button role="tab" aria-selected={tab === "past"} onClick={() => setTab("past")}>
              {t("account.history")}
            </button>
            <button role="tab" aria-selected={tab === "profile"} onClick={() => setTab("profile")}>
              {t("account.profileTab")}
            </button>
          </div>
        </div>
      </div>
      <div className="container" style={{ maxWidth: 860, padding: "24px 16px 40px" }}>
        {notice && (
          <p className="alert alert-info" style={{ marginBottom: 16 }}>
            {notice}
          </p>
        )}
        {tab === "profile" ? (
          <Profile user={user} />
        ) : loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : data ? (
          <div className="stack">
            {(tab === "upcoming" ? data.upcoming : data.past).map((a) => (
              <AppointmentCard key={a.id} a={a} past={tab === "past"} onCancel={cancel} />
            ))}
            {(tab === "upcoming" ? data.upcoming : data.past).length === 0 && (
              <div className="card empty">
                <Icon name="calendar" size={40} />
                <p style={{ fontWeight: 700 }}>{tab === "upcoming" ? t("account.noUpcoming") : t("account.noPast")}</p>
                <Link to="/recherche" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
                  {t("common.findPractitioner")}
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
