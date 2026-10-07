import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../components/AuthProvider";
import { Icon } from "../components/Icon";
import { EmailVerify, PhoneVerify } from "../components/OtpLogin";
import { ErrorState, Loading, LoginRequired } from "../components/States";
import { api, ApiError } from "../lib/api";
import { dayMonth, dayShort, hour, longDate, STATUS_LABELS } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import type { Appointment, User } from "../lib/types";

function AppointmentCard({ a, past, onCancel }: { a: Appointment; past?: boolean; onCancel?: (a: Appointment) => void }) {
  const tagClass = a.status === "cancelled" || a.status === "no_show" ? "tag-danger" : a.status === "honored" ? "tag-green" : "tag-indigo";
  return (
    <article className={`card appt-card${past ? " past" : ""}`}>
      <div className="appt-date">
        <small>{dayShort(a.localDate)}</small>
        <b>{a.localDate.slice(8)}</b>
        <small>{dayMonth(a.localDate).split(" ")[1]}</small>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="row">
          <span className={`tag ${tagClass}`}>{STATUS_LABELS[a.status]}</span>
          <span className="small muted">{hour(a.localTime)}</span>
        </div>
        <Link to={`/medecin/${a.practitioner.slug}`} style={{ fontWeight: 800, fontSize: 17, display: "block", marginTop: 4 }}>
          {a.practitioner.fullName}
        </Link>
        <p className="small muted">{a.practitioner.specialties.map((s) => s.name).join(", ")}</p>
        <p className="small">
          {a.facility.name} · {a.facility.address}
        </p>
        {a.relative && (
          <p className="small row" style={{ marginTop: 4 }}>
            <Icon name="users" size={14} /> Pour {a.relative.firstName} {a.relative.lastName}
          </p>
        )}
      </div>
      {!past && onCancel && (
        <div className="appt-actions">
          <Link to={`/medecin/${a.practitioner.slug}?reschedule=${a.id}`} className="btn btn-sm btn-outline">
            Déplacer
          </Link>
          <button type="button" className="btn btn-sm btn-danger" onClick={() => onCancel(a)}>
            Annuler
          </button>
          {a.facility.phone && (
            <a href={`tel:${a.facility.phone.replace(/\s/g, "")}`} className="btn btn-sm btn-ghost">
              <Icon name="phone" size={16} /> Appeler
            </a>
          )}
        </div>
      )}
    </article>
  );
}

function Profile({ user }: { user: User }) {
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
      setMessage({ ok: true, text: "Profil enregistré." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : "Enregistrement impossible." });
    }
  }

  async function addRelative(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/api/me/relatives", { method: "POST", body: JSON.stringify({ ...relative, birthDate: relative.birthDate || undefined }) });
      await refresh();
      setRelative({ firstName: "", lastName: "", relation: "enfant", birthDate: "" });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : "Ajout impossible." });
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <form className="card form-card" onSubmit={save}>
        <h2>Mes informations</h2>
        <div className="small muted stack" style={{ gap: 4 }}>
          <span className="row">
            <Icon name="phone" size={14} /> {user.phone ? <>Téléphone vérifié : <b>{user.phone}</b></> : "Aucun numéro vérifié"}
          </span>
          {user.email && (
            <span className="row">
              <Icon name="mail" size={14} /> {user.email} {user.emailVerified && <span className="tag tag-green">vérifiée</span>}
            </span>
          )}
          {user.linkedAccounts.length > 0 && (
            <span className="row">
              <Icon name="check" size={14} /> Connexion avec {user.linkedAccounts.map((a) => (a === "google" ? "Google" : "GitHub")).join(" et ")}
            </span>
          )}
        </div>
        <div className="row" style={{ alignItems: "stretch" }}>
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Prénom" aria-label="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Nom" aria-label="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <input className="input" type="email" placeholder="Email (facultatif, pour recevoir les confirmations)" aria-label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        {message && <p className={`alert ${message.ok ? "alert-ok" : "alert-error"}`}>{message.text}</p>}
        <button className="btn btn-indigo">Enregistrer</button>
      </form>

      <section className="card form-card">
        <h2>{user.phone ? "Changer de numéro" : "Ajouter mon numéro"}</h2>
        <PhoneVerify
          key={user.phone ?? "none"}
          intro={user.phone ? "Le nouveau numéro sera vérifié par SMS." : "Indispensable pour réserver : la confirmation et le rappel de vos rendez-vous sont envoyés par SMS."}
          onDone={async () => {
            await refresh();
            setMessage({ ok: true, text: "Numéro vérifié et enregistré." });
          }}
        />
      </section>

      {!user.emailVerified && (
        <section className="card form-card">
          <h2>Vérifier mon email</h2>
          <p className="muted">Une fois votre adresse vérifiée, vous pourrez aussi vous connecter à ce compte par email, avec Google ou avec GitHub.</p>
          <EmailVerify
            initial={user.email ?? ""}
            onDone={async () => {
              await refresh();
              setMessage({ ok: true, text: "Adresse email vérifiée." });
            }}
          />
        </section>
      )}

      <section className="card form-card">
        <h2>Mes proches</h2>
        <p className="muted small">Réservez pour vos enfants, vos parents ou votre conjoint depuis votre compte.</p>
        {user.relatives.length === 0 && <p className="muted">Aucun proche enregistré.</p>}
        {user.relatives.map((r) => (
          <div key={r.id} className="row">
            <Icon name="user" size={18} />
            <b>
              {r.firstName} {r.lastName}
            </b>
            <span className="tag">{r.relation}</span>
            {r.birthDate && <span className="small muted">né(e) le {longDate(r.birthDate).replace(/^\S+ /, "")}</span>}
          </div>
        ))}
        <form className="stack" onSubmit={addRelative} style={{ borderTop: "1px dashed var(--line)", paddingTop: 14 }}>
          <div className="row" style={{ alignItems: "stretch" }}>
            <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Prénom" aria-label="Prénom du proche" value={relative.firstName} onChange={(e) => setRelative({ ...relative, firstName: e.target.value })} required />
            <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Nom" aria-label="Nom du proche" value={relative.lastName} onChange={(e) => setRelative({ ...relative, lastName: e.target.value })} required />
          </div>
          <div className="row" style={{ alignItems: "stretch" }}>
            <select className="select" style={{ flex: 1, minWidth: 140 }} value={relative.relation} onChange={(e) => setRelative({ ...relative, relation: e.target.value })} aria-label="Lien">
              <option value="enfant">Enfant</option>
              <option value="parent">Parent</option>
              <option value="conjoint">Conjoint(e)</option>
              <option value="autre">Autre</option>
            </select>
            <input className="input" style={{ flex: 1, minWidth: 140 }} type="date" aria-label="Date de naissance" value={relative.birthDate} onChange={(e) => setRelative({ ...relative, birthDate: e.target.value })} />
          </div>
          <button className="btn btn-outline">
            <Icon name="plus" size={18} /> Ajouter un proche
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
        <Icon name="logout" size={18} /> Se déconnecter
      </button>
    </div>
  );
}

export default function Account() {
  useTitle("Mon compte");
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
    if (!window.confirm(`Annuler le rendez-vous du ${longDate(a.localDate)} à ${hour(a.localTime)} ?`)) return;
    try {
      await api(`/api/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) });
      setNotice("Rendez-vous annulé. Le créneau est libéré pour un autre patient.");
      reload();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Annulation impossible.");
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="container">
          <h1>Bonjour {user.firstName ?? ""}</h1>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "upcoming"} onClick={() => setTab("upcoming")}>
              À venir {data ? `(${data.upcoming.length})` : ""}
            </button>
            <button role="tab" aria-selected={tab === "past"} onClick={() => setTab("past")}>
              Historique
            </button>
            <button role="tab" aria-selected={tab === "profile"} onClick={() => setTab("profile")}>
              Profil et proches
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
                <p style={{ fontWeight: 700 }}>{tab === "upcoming" ? "Aucun rendez-vous à venir" : "Aucun rendez-vous passé"}</p>
                <Link to="/recherche" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
                  Trouver un praticien
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
