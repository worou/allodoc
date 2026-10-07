import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useAuth } from "../components/AuthProvider";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { OtpLogin, PhoneVerify } from "../components/OtpLogin";
import { ErrorState, Loading } from "../components/States";
import { api, ApiError } from "../lib/api";
import { dayMonth, dayShort, fcfa, hour, longDate } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import type { Appointment, PractitionerDetail, Relative, User } from "../lib/types";

/** Date et heure locales d'un instant UTC, dans le fuseau de la structure. */
function localParts(iso: string, timezone: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

type Step = "details" | "login" | "phone" | "identity";

export default function Booking() {
  useTitle("Prendre rendez-vous");
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const start = params.get("start") ?? "";
  const reschedule = params.get("reschedule");
  const navigate = useNavigate();
  const { user, ready, refresh } = useAuth();
  const { data: p, error, loading } = useApi<PractitionerDetail>(`/api/practitioners/${slug}`, { auth: false });

  const [forWhom, setForWhom] = useState<string>("me");
  const [newRelative, setNewRelative] = useState({ firstName: "", lastName: "", relation: "enfant" });
  const [firstVisit, setFirstVisit] = useState(true);
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<Step>("details");
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (loading || !ready) return <Loading />;
  if (error || !p || !start) return <ErrorState message={error?.message ?? "Créneau introuvable."} />;

  const tz = p.facility?.timezone ?? "Africa/Bamako";
  const when = localParts(start, tz);
  const needsIdentity = (u: User | null) => !u?.firstName || !u?.lastName || !u?.consent;

  async function submit(currentUser: User | null) {
    if (!currentUser) {
      setStep("login");
      return;
    }
    // Compte créé par email, Google ou GitHub : un numéro vérifié est requis (confirmation et rappel par SMS).
    if (!currentUser.phone) {
      setStep("phone");
      return;
    }
    if (needsIdentity(currentUser)) {
      setIdentity({ firstName: currentUser.firstName ?? "", lastName: currentUser.lastName ?? "", consent: currentUser.consent });
      setStep("identity");
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      let appointment: Appointment;
      if (reschedule) {
        appointment = await api<Appointment>(`/api/appointments/${reschedule}`, { method: "PATCH", body: JSON.stringify({ action: "reschedule", startsAt: start }) });
      } else {
        let relativeId: number | undefined = forWhom !== "me" && forWhom !== "new" ? Number(forWhom) : undefined;
        if (forWhom === "new") {
          const created = await api<Relative>("/api/me/relatives", { method: "POST", body: JSON.stringify(newRelative) });
          relativeId = created.id;
          await refresh();
        }
        appointment = await api<Appointment>("/api/appointments", {
          method: "POST",
          body: JSON.stringify({ practitioner: slug, startsAt: start, reason: reason || undefined, firstVisit, relativeId }),
        });
      }
      navigate(`/rdv/confirmation/${appointment.id}`, { replace: true, state: { appointment } });
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "La réservation a échoué. Vérifiez votre connexion.");
      setStep("details");
    } finally {
      setBusy(false);
    }
  }

  async function saveIdentity(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      const updated = await api<User>("/api/me", { method: "PATCH", body: JSON.stringify(identity) });
      await refresh();
      setStep("details");
      await submit(updated);
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = step === "details" ? 0 : 1;

  return (
    <div className="funnel">
      <ol className="funnel-steps" aria-label="Étapes">
        <li className={stepIndex > 0 ? "done" : "current"} />
        <li className={stepIndex === 1 ? "current" : ""} />
        <li />
      </ol>

      <div className="card recap" style={{ marginBottom: 16 }}>
        <div className="recap-when">
          <small>{dayShort(when.date)}</small>
          <b>{hour(when.time)}</b>
          <small>{dayMonth(when.date)}</small>
        </div>
        <Avatar firstName={p.firstName} lastName={p.lastName} size={52} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 800 }}>{p.fullName}</p>
          <p className="small muted">
            {p.specialties.map((s) => s.name).join(", ")} · {fcfa(p.fee)}
          </p>
          <p className="small">
            {longDate(when.date)} à {hour(when.time)} · {p.facility?.name}
          </p>
        </div>
      </div>

      {failure && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <Icon name="info" /> <span>{failure} <Link to={`/medecin/${slug}${reschedule ? `?reschedule=${reschedule}` : ""}`} style={{ textDecoration: "underline" }}>Choisir un autre horaire</Link></span>
        </div>
      )}

      {step === "login" && (
        <OtpLogin
          title="Connectez-vous pour confirmer"
          next={`/rdv/${slug}?${params.toString()}`}
          onDone={(u) => {
            setStep("details");
            submit(u);
          }}
        />
      )}

      {step === "phone" && (
        <div className="card form-card">
          <h2>Votre numéro de téléphone</h2>
          <PhoneVerify
            intro="La confirmation et le rappel de votre rendez-vous sont envoyés par SMS. Vérifiez votre numéro une seule fois."
            onDone={async (u) => {
              await refresh();
              setStep("details");
              submit(u);
            }}
          />
        </div>
      )}

      {step === "identity" && (
        <form className="card form-card" onSubmit={saveIdentity}>
          <h2>Vos informations</h2>
          <p className="muted">Elles seront transmises au praticien avec votre rendez-vous.</p>
          <div>
            <label className="field-label" htmlFor="firstName">Prénom</label>
            <input id="firstName" className="input" value={identity.firstName} onChange={(e) => setIdentity({ ...identity, firstName: e.target.value })} required autoComplete="given-name" />
          </div>
          <div>
            <label className="field-label" htmlFor="lastName">Nom</label>
            <input id="lastName" className="input" value={identity.lastName} onChange={(e) => setIdentity({ ...identity, lastName: e.target.value })} required autoComplete="family-name" />
          </div>
          <label className="choice">
            <input type="checkbox" checked={identity.consent} onChange={(e) => setIdentity({ ...identity, consent: e.target.checked })} required />
            <span className="small">
              J&apos;accepte que mes données soient traitées pour gérer mes rendez-vous, conformément aux lois de protection des données personnelles. Je peux demander leur suppression à tout moment.
            </span>
          </label>
          <button className="btn btn-primary btn-block" disabled={busy || !identity.consent}>
            {busy ? "Confirmation…" : "Confirmer le rendez-vous"}
          </button>
        </form>
      )}

      {step === "details" && (
        <form
          className="card form-card"
          onSubmit={(e) => {
            e.preventDefault();
            submit(user);
          }}
        >
          {reschedule ? (
            <>
              <h2>Déplacer le rendez-vous</h2>
              <p className="muted">Votre rendez-vous actuel sera annulé et remplacé par ce nouveau créneau.</p>
            </>
          ) : (
            <>
              <h2>Pour qui est ce rendez-vous ?</h2>
              <div className="choice-list">
                <label className="choice">
                  <input type="radio" name="who" checked={forWhom === "me"} onChange={() => setForWhom("me")} />
                  <span>
                    <b>Pour moi</b>
                    {user?.firstName && <span className="muted"> · {user.firstName} {user.lastName}</span>}
                  </span>
                </label>
                {user?.relatives.map((r) => (
                  <label key={r.id} className="choice">
                    <input type="radio" name="who" checked={forWhom === String(r.id)} onChange={() => setForWhom(String(r.id))} />
                    <span>
                      <b>
                        {r.firstName} {r.lastName}
                      </b>
                      <span className="muted"> · {r.relation}</span>
                    </span>
                  </label>
                ))}
                <label className="choice">
                  <input type="radio" name="who" checked={forWhom === "new"} onChange={() => setForWhom("new")} />
                  <span>
                    <b>Pour un proche</b> <span className="muted">(enfant, parent, conjoint…)</span>
                  </span>
                </label>
              </div>
              {forWhom === "new" && (
                <div className="stack">
                  <div className="row" style={{ alignItems: "stretch" }}>
                    <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Prénom" value={newRelative.firstName} onChange={(e) => setNewRelative({ ...newRelative, firstName: e.target.value })} required />
                    <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Nom" value={newRelative.lastName} onChange={(e) => setNewRelative({ ...newRelative, lastName: e.target.value })} required />
                  </div>
                  <select className="select" value={newRelative.relation} onChange={(e) => setNewRelative({ ...newRelative, relation: e.target.value })} aria-label="Lien de parenté">
                    <option value="enfant">Enfant</option>
                    <option value="parent">Parent</option>
                    <option value="conjoint">Conjoint(e)</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              )}

              <div>
                <span className="field-label">Avez-vous déjà consulté ce praticien ?</span>
                <div className="row">
                  <label className="choice" style={{ flex: 1 }}>
                    <input type="radio" name="first" checked={firstVisit} onChange={() => setFirstVisit(true)} /> Non, c&apos;est la première fois
                  </label>
                  <label className="choice" style={{ flex: 1 }}>
                    <input type="radio" name="first" checked={!firstVisit} onChange={() => setFirstVisit(false)} /> Oui
                  </label>
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="reason">
                  Motif de consultation <span className="muted small">(facultatif)</span>
                </label>
                <textarea id="reason" className="textarea" maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. : fièvre depuis 3 jours, renouvellement d'ordonnance…" />
                <p className="small muted row" style={{ marginTop: 6 }}>
                  <Icon name="shield" size={14} /> Visible uniquement par le praticien, jamais envoyé par SMS.
                </p>
              </div>
            </>
          )}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Réservation…" : user ? "Confirmer le rendez-vous" : "Continuer"}
          </button>
          <p className="small muted" style={{ textAlign: "center" }}>
            Paiement sur place. Annulation gratuite depuis « Mes rendez-vous ».
          </p>
        </form>
      )}
    </div>
  );
}
