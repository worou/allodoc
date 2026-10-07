import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { hasRole, useAuth } from "../components/AuthProvider";
import { Icon } from "../components/Icon";
import { ErrorState, Loading } from "../components/States";
import { PlanCards, SubscriptionPanel } from "../components/SubscriptionPanel";
import { api, ApiError } from "../lib/api";
import { dayMonth, longDate, STATUS_LABELS } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import type { Appointment, AppointmentStatus, PractitionerSummary, SubscriptionPlan, SubscriptionStatusResponse } from "../lib/types";

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

/** Présentation pour les soignants non connectés. */
function ProLanding() {
  const plans = useApi<SubscriptionPlan[]>("/api/subscription-plans", { auth: false });
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>
            L&apos;agenda en ligne des <em>soignants du Sahel</em>
          </h1>
          <p className="lead">Vos patients réservent 24h/24, reçoivent un rappel SMS la veille, et vous suivez vos consultations depuis votre téléphone.</p>
          <div className="row" style={{ marginTop: 24 }}>
            <Link to="/connexion?next=/pro" className="btn btn-primary">
              Accéder à mon agenda
            </Link>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container steps">
          <div className="card step">
            <h3>Inscription vérifiée</h3>
            <p>Votre numéro d&apos;ordre est contrôlé par l&apos;administrateur de votre pays avant publication.</p>
          </div>
          <div className="card step">
            <h3>Horaires et congés</h3>
            <p>Horaires récurrents, durée de consultation et congés : les créneaux se mettent à jour seuls.</p>
          </div>
          <div className="card step">
            <h3>Moins d&apos;absences</h3>
            <p>Rappels SMS automatiques et annulation en un clic libèrent les créneaux pour d&apos;autres patients.</p>
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                Des tarifs <span className="accent">simples</span>
              </h2>
              <p className="section-sub">Un abonnement pour être publié et recevoir des réservations. Paiement par mobile money, renouvelable à tout moment.</p>
            </div>
          </div>
          {plans.data ? <PlanCards plans={plans.data} /> : <div className="skeleton" style={{ height: 220 }} />}
        </div>
      </section>
    </>
  );
}

export default function Pro() {
  useTitle("Espace praticien");
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
  if (!isPro) return <ProLanding />;

  async function setStatus(a: Appointment, status: AppointmentStatus) {
    setError(null);
    try {
      await api(`/api/pro/appointments/${a.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      agenda.reload();
      stats.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    }
  }

  const data = agenda.data;
  const days = data ? Array.from({ length: 7 }, (_, i) => shiftDate(data.from, i)) : [];
  const now = Date.now();

  return (
    <>
      <div className="page-head" style={{ paddingBottom: 20 }}>
        <div className="container">
          <p className="muted small">Espace praticien</p>
          <h1>{data?.practitioner.fullName ?? "Mon agenda"}</h1>
          {stats.data && (
            <div className="stats" style={{ marginTop: 16 }}>
              <div className="card stat">
                <b>{stats.data.total}</b>
                <span>Rendez-vous sur 30 jours</span>
              </div>
              <div className="card stat">
                <b>{stats.data.counts.honored}</b>
                <span>Consultations honorées</span>
              </div>
              <div className="card stat">
                <b>{stats.data.counts.cancelled}</b>
                <span>Annulations</span>
              </div>
              <div className="card stat">
                <b style={{ color: stats.data.noShowRate > 15 ? "var(--danger)" : undefined }}>{stats.data.noShowRate} %</b>
                <span>Taux d&apos;absence</span>
              </div>
            </div>
          )}
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "agenda"} onClick={() => setParams({})}>
              Agenda
            </button>
            <button role="tab" aria-selected={tab === "abonnement"} onClick={() => setParams({ onglet: "abonnement" })}>
              Abonnement
              {subscription.data && !subscription.data.published && <span className="tag tag-danger" style={{ marginLeft: 6 }}>Non publié</span>}
              {subscription.data?.published && subscription.data.daysLeft <= 14 && <span className="tag tag-ochre" style={{ marginLeft: 6 }}>{subscription.data.daysLeft} j</span>}
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
              {subscription.data.published
                ? `Votre abonnement expire dans ${subscription.data.daysLeft} jour${subscription.data.daysLeft > 1 ? "s" : ""}. `
                : "Votre profil n'est pas visible des patients. "}
              <button type="button" className="link-btn" onClick={() => setParams({ onglet: "abonnement" })}>
                {subscription.data.published ? "Renouveler" : "Activer mon abonnement"}
              </button>
            </span>
          </p>
        )}
        {data && (
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setFrom(shiftDate(data.from, -7))}>
              <Icon name="chevronLeft" size={16} /> Semaine précédente
            </button>
            <b>
              Du {dayMonth(data.from)} au {dayMonth(data.to)}
            </b>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setFrom(shiftDate(data.from, 7))}>
              Semaine suivante <Icon name="chevronRight" size={16} />
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
                  {longDate(day)} <span className="muted small">· {items.filter((a) => a.status !== "cancelled").length} rendez-vous</span>
                </h3>
                {items.length === 0 && <p className="muted small" style={{ padding: "12px 16px" }}>Aucun rendez-vous.</p>}
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
                          {STATUS_LABELS[a.status]}
                        </span>
                        {a.firstVisit && <span className="tag tag-ochre" style={{ marginLeft: 4 }}>1re visite</span>}
                        <p className="small muted">
                          <a href={`tel:${a.patient?.phone}`}>{a.patient?.phone}</a>
                          {a.reason && <> · Motif : {a.reason}</>}
                        </p>
                      </div>
                      {active && (
                        <div className="acts">
                          {started ? (
                            <>
                              <button type="button" className="btn btn-sm btn-indigo" onClick={() => setStatus(a, "honored")}>
                                <Icon name="check" size={16} /> Honoré
                              </button>
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => setStatus(a, "no_show")}>
                                Absent
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => window.confirm("Annuler ce rendez-vous ? Le patient sera prévenu par SMS.") && setStatus(a, "cancelled")}
                            >
                              Annuler
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
