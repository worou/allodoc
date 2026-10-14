import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { hasRole, useAuth } from "../components/AuthProvider";
import { Icon } from "../components/Icon";
import { ErrorState, Loading } from "../components/States";
import { ProSignup } from "../components/ProSignup";
import { PlanCards, SubscriptionPanel } from "../components/SubscriptionPanel";
import { api, ApiError } from "../lib/api";
import { dayMonth, longDate, statusLabel } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import { Trans, useI18n } from "../lib/i18n";
import type { Appointment, AppointmentStatus, PractitionerSummary, SubscriptionPlan, SubscriptionStatusResponse } from "../lib/types";
import { VideoBadge, VideoJoinButton } from "../components/VideoJoin";

interface Agenda {
  practitioner: PractitionerSummary;
  from: string;
  to: string;
  appointments: Appointment[];
}

interface Stats {
  counts: Record<AppointmentStatus, number>;
  total: number;
  noShowRate: number;
}

function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Réglage "Je propose la téléconsultation" de l'agenda. */
function TeleconsultationSetting({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/pro/settings", { method: "PATCH", body: JSON.stringify({ teleconsultation: !enabled }) });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error.action"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card tele-setting${enabled ? " on" : ""}`}>
      <span className="video-icon">
        <Icon name="video" size={22} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{enabled ? t("video.settingOn") : t("video.settingOff")}</b>
        <p className="small muted">{enabled ? t("video.settingOnHint") : t("video.settingOffHint")}</p>
        {error && <p className="small" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>
      <button type="button" className={`btn btn-sm ${enabled ? "btn-outline" : "btn-primary"}`} disabled={busy} onClick={toggle}>
        {enabled ? t("video.disable") : t("video.enable")}
      </button>
    </div>
  );
}

/** Présentation pour les soignants ; connecté sans fiche praticien : formulaire d'inscription à la place du bouton. */
function ProLanding({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const plans = useApi<SubscriptionPlan[]>("/api/subscription-plans", { auth: false });
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>
            <Trans text={t("pro.landingTitle")} values={{ em: <em>{t("pro.landingTitleEm")}</em> }} />
          </h1>
          <p className="lead">{t("pro.landingLead")}</p>
          <div className="row" style={{ marginTop: 24 }}>
            {signedIn ? (
              <a href="#inscription" className="btn btn-primary">
                {t("proSignup.title")}
              </a>
            ) : (
              <>
                <Link to="/connexion?next=/pro" className="btn btn-primary">
                  {t("pro.createAccount")}
                </Link>
                <Link to="/connexion?next=/pro" className="btn btn-outline" style={{ background: "transparent", color: "#fff", borderColor: "rgb(255 255 255 / 60%)" }}>
                  {t("pro.accessAgenda")}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
      {signedIn && (
        <div id="inscription">
          <ProSignup />
        </div>
      )}
      <section className="section">
        <div className="container steps">
          <div className="card step">
            <h3>{t("pro.step1Title")}</h3>
            <p>{t("pro.step1")}</p>
          </div>
          <div className="card step">
            <h3>{t("pro.step2Title")}</h3>
            <p>{t("pro.step2")}</p>
          </div>
          <div className="card step">
            <h3>{t("pro.step3Title")}</h3>
            <p>{t("pro.step3")}</p>
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                <Trans text={t("pro.pricing")} values={{ accent: <span className="accent">{t("pro.pricingAccent")}</span> }} />
              </h2>
              <p className="section-sub">{t("pro.pricingSub")}</p>
            </div>
          </div>
          {plans.data ? <PlanCards plans={plans.data} /> : <div className="skeleton" style={{ height: 220 }} />}
          {!signedIn && (
            <Link to="/connexion?next=/pro" className="btn btn-primary" style={{ marginTop: 20 }}>
              {t("pro.createAccount")}
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

export default function Pro() {
  const { t, tn } = useI18n();
  useTitle(t("pro.title"));
  const { user, ready } = useAuth();
  const isPro = hasRole(user, "ROLE_PRACTITIONER");
  const [from, setFrom] = useState<string | null>(null);
  const agenda = useApi<Agenda>(isPro ? `/api/pro/agenda${from ? `?from=${from}` : ""}` : null);
  const stats = useApi<Stats>(isPro ? "/api/pro/stats" : null);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const tab = params.get("onglet") === "abonnement" ? "abonnement" : "agenda";
  const subscription = useApi<SubscriptionStatusResponse>(isPro ? `/api/pro/subscription?v=${tab}` : null);

  if (!ready) return <Loading />;
  if (!isPro) return <ProLanding signedIn={!!user} />;

  async function setStatus(a: Appointment, status: AppointmentStatus) {
    setError(null);
    try {
      await api(`/api/pro/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      agenda.reload();
      stats.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error.action"));
    }
  }

  const data = agenda.data;
  const days = data ? Array.from({ length: 7 }, (_, i) => shiftDate(data.from, i)) : [];
  const now = Date.now();

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 20 }}>
        <div className="container">
          <p className="muted small">{t("pro.title")}</p>
          <h1>{data?.practitioner.fullName ?? t("header.myAgenda")}</h1>
          {stats.data && (
            <div className="stats" style={{ marginTop: 16 }}>
              <div className="card stat">
                <b>{stats.data.total}</b>
                <span>{t("pro.statTotal")}</span>
              </div>
              <div className="card stat">
                <b>{stats.data.counts.honored}</b>
                <span>{t("pro.statHonored")}</span>
              </div>
              <div className="card stat">
                <b>{stats.data.counts.cancelled}</b>
                <span>{t("pro.statCancelled")}</span>
              </div>
              <div className="card stat">
                <b style={{ color: stats.data.noShowRate > 15 ? "var(--danger)" : undefined }}>{stats.data.noShowRate} %</b>
                <span>{t("pro.statNoShow")}</span>
              </div>
            </div>
          )}
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "agenda"} onClick={() => setParams({})}>
              {t("nav.agenda")}
            </button>
            <button role="tab" aria-selected={tab === "abonnement"} onClick={() => setParams({ onglet: "abonnement" })}>
              {t("nav.subscription")}
              {subscription.data && !subscription.data.published && <span className="tag tag-danger" style={{ marginInlineStart: 6 }}>{t("pro.notPublished")}</span>}
              {subscription.data?.published && subscription.data.daysLeft <= 14 && <span className="tag tag-ochre" style={{ marginInlineStart: 6 }}>{t("pro.daysShort", { n: subscription.data.daysLeft })}</span>}
            </button>
          </div>
        </div>
      </div>

      {tab === "abonnement" ? (
        <div className="container" style={{ padding: "20px 16px 40px", maxWidth: 860 }}>
          <SubscriptionPanel />
        </div>
      ) : (
      <div className="container" style={{ padding: "20px 16px 40px" }}>
        {subscription.data && (!subscription.data.published || subscription.data.daysLeft <= 14) && (
          <p className={`alert ${subscription.data.published ? "alert-warn" : "alert-error"}`} style={{ marginBottom: 14 }}>
            <Icon name="info" />
            <span>
              {subscription.data.published ? `${tn("sub.expiresIn", subscription.data.daysLeft)}. ` : `${t("pro.notVisible")} `}
              <button type="button" className="link-btn" onClick={() => setParams({ onglet: "abonnement" })}>
                {subscription.data.published ? t("pro.renew") : t("pro.activate")}
              </button>
            </span>
          </p>
        )}
        {data && <TeleconsultationSetting enabled={data.practitioner.teleconsultation} onChange={agenda.reload} />}
        {data && (
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setFrom(shiftDate(data.from, -7))}>
              <Icon name="chevronLeft" size={16} /> {t("pro.previousWeek")}
            </button>
            <b>{t("pro.range", { from: dayMonth(data.from), to: dayMonth(data.to) })}</b>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setFrom(shiftDate(data.from, 7))}>
              {t("pro.nextWeek")} <Icon name="chevronRight" size={16} />
            </button>
          </div>
        )}
        {error && <p className="alert alert-error" style={{ marginBottom: 12 }}>{error}</p>}
        {agenda.loading && !data && <Loading />}
        {agenda.error && <ErrorState message={agenda.error.message} onRetry={agenda.reload} />}
        <div className="stack" style={{ opacity: agenda.loading ? 0.6 : 1 }}>
          {days.map((day) => {
            const items = data!.appointments.filter((a) => a.localDate === day);
            return (
              <section key={day} className="card agenda-day">
                <h3>
                  {longDate(day)} <span className="muted small">· {t("pro.dayCount", { n: items.filter((a) => a.status !== "cancelled").length })}</span>
                </h3>
                {items.length === 0 && <p className="muted small" style={{ padding: "12px 16px" }}>{t("pro.noAppointments")}</p>}
                {items.map((a) => {
                  const started = new Date(a.startsAt).getTime() <= now;
                  const active = a.status === "pending" || a.status === "confirmed";
                  return (
                    <div key={a.id} className="agenda-row" style={{ opacity: a.status === "cancelled" ? 0.55 : 1 }}>
                      <span className="time">{a.localTime}</span>
                      <div style={{ minWidth: 0 }}>
                        <b>
                          {a.patient?.firstName} {a.patient?.lastName}
                        </b>{" "}
                        <span className={`tag ${a.status === "cancelled" || a.status === "no_show" ? "tag-danger" : a.status === "honored" ? "tag-green" : "tag-indigo"}`}>
                          {statusLabel(a.status)}
                        </span>
                        {a.firstVisit && <span className="tag tag-ochre" style={{ marginInlineStart: 4 }}>{t("pro.firstVisit")}</span>}
                        {a.video && (
                          <span style={{ marginInlineStart: 4 }}>
                            <VideoBadge />
                          </span>
                        )}
                        <p className="small muted">
                          <a href={`tel:${a.patient?.phone}`} dir="ltr">
                            {a.patient?.phone}
                          </a>
                          {a.reason && <> · {t("pro.reason", { reason: a.reason })}</>}
                        </p>
                      </div>
                      {active && (
                        <div className="acts">
                          <VideoJoinButton a={a} />
                          {started ? (
                            <>
                              <button type="button" className="btn btn-sm btn-indigo" onClick={() => setStatus(a, "honored")}>
                                <Icon name="check" size={16} /> {statusLabel("honored")}
                              </button>
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => setStatus(a, "no_show")}>
                                {statusLabel("no_show")}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => window.confirm(t("pro.cancelConfirm")) && setStatus(a, "cancelled")}
                            >
                              {t("common.cancel")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>
      )}
    </>
  );
}
