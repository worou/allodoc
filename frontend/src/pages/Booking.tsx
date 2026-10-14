import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useAuth } from "../components/AuthProvider";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { OtpLogin, PhoneVerify } from "../components/OtpLogin";
import { ErrorState, Loading } from "../components/States";
import { api, ApiError } from "../lib/api";
import { dayMonth, dayShort, money, hour, longDate, relationLabel, specialtyList } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import { useI18n } from "../lib/i18n";
import type { Appointment, PractitionerDetail, Relative, User } from "../lib/types";

/** Date et heure locales d'un instant UTC, dans le fuseau de la structure. */
function localParts(iso: string, timezone: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

type Step = "details" | "login" | "phone" | "identity";

const RELATIONS = ["enfant", "parent", "conjoint", "autre"];

export default function Booking() {
  const { t } = useI18n();
  useTitle(t("common.bookAppointment"));
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
  const [video, setVideo] = useState(params.get("mode") === "video");
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<Step>("details");
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", consent: false });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (loading || !ready) return <Loading />;
  if (error || !p || !start) return <ErrorState message={error?.message ?? t("booking.slotNotFound")} />;

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
          body: JSON.stringify({ practitioner: slug, startsAt: start, reason: reason || undefined, firstVisit, relativeId, video: video && !!p?.teleconsultation }),
        });
      }
      navigate(`/rdv/confirmation/${appointment.id}`, { replace: true, state: { appointment } });
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : t("booking.failed"));
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
      setFailure(err instanceof ApiError ? err.message : t("error.save"));
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = step === "details" ? 0 : 1;

  return (
    <div className="funnel">
      <ol className="funnel-steps" aria-label={t("booking.steps")}>
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
            {specialtyList(p.specialties)} · {money(p.fee, p.currency)}
          </p>
          <p className="small">
            {t("booking.when", { date: longDate(when.date), time: hour(when.time) })} · {video && p.teleconsultation ? t("video.remote") : p.facility?.name}
          </p>
        </div>
      </div>

      {failure && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <Icon name="info" />{" "}
          <span>
            {failure}{" "}
            <Link to={`/medecin/${slug}${reschedule ? `?reschedule=${reschedule}` : ""}`} style={{ textDecoration: "underline" }}>
              {t("booking.otherSlot")}
            </Link>
          </span>
        </div>
      )}

      {step === "login" && (
        <OtpLogin
          title={t("booking.loginTitle")}
          next={`/rdv/${slug}?${params.toString()}`}
          onDone={(u) => {
            setStep("details");
            submit(u);
          }}
        />
      )}

      {step === "phone" && (
        <div className="card form-card">
          <h2>{t("booking.phoneTitle")}</h2>
          <PhoneVerify
            intro={t("booking.phoneIntro")}
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
          <h2>{t("booking.identityTitle")}</h2>
          <p className="muted">{t("booking.identityHint")}</p>
          <div>
            <label className="field-label" htmlFor="firstName">{t("common.firstName")}</label>
            <input id="firstName" className="input" value={identity.firstName} onChange={(e) => setIdentity({ ...identity, firstName: e.target.value })} required autoComplete="given-name" />
          </div>
          <div>
            <label className="field-label" htmlFor="lastName">{t("common.lastName")}</label>
            <input id="lastName" className="input" value={identity.lastName} onChange={(e) => setIdentity({ ...identity, lastName: e.target.value })} required autoComplete="family-name" />
          </div>
          <label className="choice">
            <input type="checkbox" checked={identity.consent} onChange={(e) => setIdentity({ ...identity, consent: e.target.checked })} required />
            <span className="small">{t("booking.consent")}</span>
          </label>
          <button className="btn btn-primary btn-block" disabled={busy || !identity.consent}>
            {busy ? t("booking.confirming") : t("booking.confirm")}
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
              <h2>{t("booking.rescheduleTitle")}</h2>
              <p className="muted">{t("booking.rescheduleHint")}</p>
            </>
          ) : (
            <>
              <h2>{t("booking.forWhom")}</h2>
              <div className="choice-list">
                <label className="choice">
                  <input type="radio" name="who" checked={forWhom === "me"} onChange={() => setForWhom("me")} />
                  <span>
                    <b>{t("booking.forMe")}</b>
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
                      <span className="muted"> · {relationLabel(r.relation)}</span>
                    </span>
                  </label>
                ))}
                <label className="choice">
                  <input type="radio" name="who" checked={forWhom === "new"} onChange={() => setForWhom("new")} />
                  <span>
                    <b>{t("booking.forRelative")}</b> <span className="muted">{t("booking.forRelativeHint")}</span>
                  </span>
                </label>
              </div>
              {forWhom === "new" && (
                <div className="stack">
                  <div className="row" style={{ alignItems: "stretch" }}>
                    <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder={t("common.firstName")} value={newRelative.firstName} onChange={(e) => setNewRelative({ ...newRelative, firstName: e.target.value })} required />
                    <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder={t("common.lastName")} value={newRelative.lastName} onChange={(e) => setNewRelative({ ...newRelative, lastName: e.target.value })} required />
                  </div>
                  <select className="select" value={newRelative.relation} onChange={(e) => setNewRelative({ ...newRelative, relation: e.target.value })} aria-label={t("booking.relationLabel")}>
                    {RELATIONS.map((r) => (
                      <option key={r} value={r}>
                        {relationLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {p.teleconsultation && !reschedule && (
                <div>
                  <span className="field-label">{t("video.modeQuestion")}</span>
                  <div className="row">
                    <label className="choice" style={{ flex: 1 }}>
                      <input type="radio" name="mode" checked={!video} onChange={() => setVideo(false)} />
                      <span>
                        <Icon name="building" size={16} className="inline" /> {t("video.modeOffice")}
                      </span>
                    </label>
                    <label className="choice" style={{ flex: 1 }}>
                      <input type="radio" name="mode" checked={video} onChange={() => setVideo(true)} />
                      <span>
                        <Icon name="video" size={16} className="inline" /> {t("video.modeVideo")}
                      </span>
                    </label>
                  </div>
                  {video && <p className="small muted" style={{ marginTop: 6 }}>{t("video.modeVideoHint")}</p>}
                </div>
              )}

              <div>
                <span className="field-label">{t("booking.firstVisitQuestion")}</span>
                <div className="row">
                  <label className="choice" style={{ flex: 1 }}>
                    <input type="radio" name="first" checked={firstVisit} onChange={() => setFirstVisit(true)} /> {t("booking.firstVisitNo")}
                  </label>
                  <label className="choice" style={{ flex: 1 }}>
                    <input type="radio" name="first" checked={!firstVisit} onChange={() => setFirstVisit(false)} /> {t("booking.firstVisitYes")}
                  </label>
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="reason">
                  {t("booking.reason")} <span className="muted small">{t("common.optional")}</span>
                </label>
                <textarea id="reason" className="textarea" maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("booking.reasonPlaceholder")} />
                <p className="small muted row" style={{ marginTop: 6 }}>
                  <Icon name="shield" size={14} /> {t("booking.reasonPrivate")}
                </p>
              </div>
            </>
          )}

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t("booking.booking") : user ? t("booking.confirm") : t("booking.continue")}
          </button>
          <p className="small muted" style={{ textAlign: "center" }}>
            {t("booking.footer")}
          </p>
        </form>
      )}
    </div>
  );
}
