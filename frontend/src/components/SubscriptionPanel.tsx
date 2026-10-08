import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { fcfa, shortDate } from "../lib/format";
import { useApi } from "../lib/hooks";
import type { Subscription, SubscriptionPlan, SubscriptionStatusResponse } from "../lib/types";
import { Icon } from "./Icon";
import { ErrorState, Loading } from "./States";

const STATUS: Record<Subscription["status"], [string, string]> = {
  pending: ["En attente de paiement", "tag-ochre"],
  paid: ["Payé", "tag-green"],
  cancelled: ["Annulé", "tag"],
};

/** Cartes de formules : réutilisées sur la page de présentation aux soignants. */
export function PlanCards({ plans, selected, onSelect }: { plans: SubscriptionPlan[]; selected?: string; onSelect?: (code: string) => void }) {
  const semester = plans.find((p) => p.code === "semester");
  return (
    <div className="plan-grid">
      {plans.map((plan) => {
        // Économie de l'annuel par rapport à deux semestres.
        const saving = plan.code === "annual" && semester ? semester.price * 2 - plan.price : 0;
        const Tag = onSelect ? "button" : "div";
        return (
          <Tag
            key={plan.code}
            type={onSelect ? "button" : undefined}
            className={`card plan-card${selected === plan.code ? " selected" : ""}${plan.code === "annual" ? " featured" : ""}`}
            onClick={onSelect ? () => onSelect(plan.code) : undefined}
            aria-pressed={onSelect ? selected === plan.code : undefined}
          >
            {saving > 0 && <span className="plan-badge">Économisez {fcfa(saving)}</span>}
            <span className="plan-name">{plan.name}</span>
            <span className="plan-price">{fcfa(plan.price)}</span>
            <span className="muted small">
              pour {plan.durationMonths} mois · soit {fcfa(plan.monthlyPrice)} / mois
            </span>
            <ul className="plan-features small">
              <li><Icon name="check" size={14} /> Profil visible dans votre région</li>
              <li><Icon name="check" size={14} /> Réservation en ligne 24h/24</li>
              <li><Icon name="check" size={14} /> Rappels SMS aux patients</li>
              <li><Icon name="check" size={14} /> Renouvelable à tout moment, sans perte de jours</li>
            </ul>
          </Tag>
        );
      })}
    </div>
  );
}

/** Instructions de paiement mobile money d'une commande en attente. */
function PaymentInstructions({ order, account, canSimulate, onChange }: { order: Subscription; account: Record<string, string>; canSimulate: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const number = account[order.paymentMethod];

  async function act(path: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/pro/subscriptions/${order.id}/${path}`, { method: "POST" });
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card panel payment-box">
      <h2>
        <Icon name="money" /> Commande {order.reference} : paiement en attente
      </h2>
      <ol className="pay-steps">
        <li>
          Envoyez <b>{fcfa(order.amount)}</b> par <b>{order.paymentMethodLabel}</b>
          {number ? (
            <>
              {" "}au <b className="nowrap">{number}</b> ({account.holder})
            </>
          ) : (
            <> à l&apos;équipe AlloDoc de votre pays</>
          )}
          .
        </li>
        <li>
          Indiquez la référence <span className="ref-code">{order.reference}</span> dans le motif du transfert.
        </li>
        <li>Votre profil est publié dès que l&apos;administrateur a confirmé la réception (vous recevez un SMS).</li>
      </ol>
      {error && <p className="alert alert-error">{error}</p>}
      <div className="row">
        {canSimulate && (
          <button type="button" className="btn btn-sm btn-indigo" disabled={busy} onClick={() => act("simulate-payment")}>
            Simuler le paiement (démo)
          </button>
        )}
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => window.confirm("Annuler cette commande ?") && act("cancel")}>
          Annuler la commande
        </button>
      </div>
    </section>
  );
}

/** Onglet "Abonnement" de l'espace praticien : état, renouvellement, paiement, historique. */
export function SubscriptionPanel() {
  const { data, error, loading, reload } = useApi<SubscriptionStatusResponse>("/api/pro/subscription");
  const [plan, setPlan] = useState<string>("annual");
  const [method, setMethod] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error?.message ?? "Abonnement indisponible."} onRetry={reload} />;

  const methods = data.methods.filter((m) => data.paymentAccount[m.code]);
  const chosenMethod = method || methods[0]?.code || "";
  const expiringSoon = data.activeSubscription && data.daysLeft <= 14;

  async function order() {
    setBusy(true);
    setFailure(null);
    try {
      await api("/api/pro/subscriptions", { method: "POST", body: JSON.stringify({ plan, method: chosenMethod }) });
      reload();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Commande impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className={`card panel sub-status ${data.published ? (expiringSoon ? "warn" : "ok") : "off"}`}>
        <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
          <span className="sub-icon">
            <Icon name={data.published ? (expiringSoon ? "clock" : "check") : "info"} size={26} />
          </span>
          <div>
            {data.published ? (
              <>
                <h2 style={{ margin: 0 }}>{expiringSoon ? `Votre abonnement expire dans ${data.daysLeft} jour${data.daysLeft > 1 ? "s" : ""}` : "Votre profil est publié"}</h2>
                <p className="muted">
                  Visible par les patients jusqu&apos;au <b>{shortDate(data.publishedUntil!)}</b>.
                  {expiringSoon && " Renouvelez maintenant : la nouvelle période s'ajoute à la fin de l'actuelle."}
                </p>
              </>
            ) : (
              <>
                <h2 style={{ margin: 0 }}>Votre profil n&apos;est pas visible</h2>
                <p className="muted">
                  {!data.verified
                    ? "Votre inscription est en cours de vérification par l'administrateur de votre pays. La période d'abonnement démarrant au paiement, attendez de préférence la validation pour souscrire."
                    : data.publishedUntil
                      ? `Votre abonnement a expiré le ${shortDate(data.publishedUntil)}. Les patients ne peuvent plus vous trouver ni réserver.`
                      : "Souscrivez un abonnement pour apparaître dans la recherche et recevoir des réservations."}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {data.pending ? (
        <PaymentInstructions order={data.pending} account={data.paymentAccount} canSimulate={data.canSimulatePayment} onChange={reload} />
      ) : (
        <section className="card panel">
          <h2>
            <Icon name="crown" /> {data.activeSubscription ? "Renouveler mon abonnement" : "Choisir une formule"}
          </h2>
          <PlanCards plans={data.plans} selected={plan} onSelect={setPlan} />
          <div style={{ marginTop: 16 }}>
            <label className="field-label" htmlFor="method">
              Moyen de paiement
            </label>
            <select id="method" className="select" value={chosenMethod} onChange={(e) => setMethod(e.target.value)}>
              {methods.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {failure && <p className="alert alert-error" style={{ marginTop: 12 }}>{failure}</p>}
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={busy || !chosenMethod} onClick={order}>
            {busy ? "Commande…" : `Commander : ${fcfa(data.plans.find((p) => p.code === plan)?.price ?? 0)}`}
          </button>
        </section>
      )}

      {data.history.length > 0 && (
        <section className="card panel">
          <h2>
            <Icon name="calendar" /> Historique
          </h2>
          <div className="table-wrap">
            <table className="hours">
              <tbody>
                {data.history.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <b>{s.plan.name}</b> · {s.reference}
                      <br />
                      <span className="small muted">
                        {s.startsAt && s.endsAt ? `${shortDate(s.startsAt)} → ${shortDate(s.endsAt)}` : `Commandé le ${shortDate(s.createdAt)}`}
                      </span>
                    </td>
                    <td>
                      {fcfa(s.amount)}
                      <br />
                      <span className={`tag ${STATUS[s.status][1]}`}>{STATUS[s.status][0]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
