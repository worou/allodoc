import { useState } from "react";
import { api, API_URL, ApiError } from "../lib/api";
import { isNativeApp } from "../lib/install";
import { dollars, fcfa, paymentMethodName, planName, shortDate, usdEquivalent } from "../lib/format";
import { Trans, useI18n, type MessageKey } from "../lib/i18n";
import { useApi, useExchangeRates } from "../lib/hooks";
import type { Subscription, SubscriptionPlan, SubscriptionStatusResponse } from "../lib/types";
import { Icon } from "./Icon";
import { PayPalCheckout } from "./PayPalCheckout";
import { ErrorState, Loading } from "./States";
import { BRAND_NAME } from "../lib/brand";

const STATUS: Record<Subscription["status"], [MessageKey, string]> = {
  pending: ["sub.status.pending", "tag-ochre"],
  paid: ["sub.status.paid", "tag-green"],
  cancelled: ["sub.status.cancelled", "tag"],
};

/**
 * Cartes de formules (même prix mensuel, réglable pour 1, 3, 6 ou 12 mois), précédées de l'offre de gratuité.
 * Réutilisées sur la page de présentation aux soignants.
 */
export function PlanCards({ plans, selected, onSelect, trialMonths = 3 }: { plans: SubscriptionPlan[]; selected?: string; onSelect?: (code: string) => void; trialMonths?: number }) {
  const { t } = useI18n();
  const rates = useExchangeRates();
  const monthly = plans.find((p) => p.durationMonths === 1) ?? plans[0];
  return (
    <>
      {monthly && trialMonths > 0 && (
        <p className="plan-offer">
          <Icon name="star" size={18} /> {t("sub.trialOffer", { months: trialMonths, price: fcfa(monthly.monthlyPrice) })}
        </p>
      )}
    <div className="plan-grid">
      {plans.map((plan) => {
        const Tag = onSelect ? "button" : "div";
        return (
          <Tag
            key={plan.code}
            type={onSelect ? "button" : undefined}
            className={`card plan-card${selected === plan.code ? " selected" : ""}${plan.durationMonths === 1 ? " featured" : ""}`}
            onClick={onSelect ? () => onSelect(plan.code) : undefined}
            aria-pressed={onSelect ? selected === plan.code : undefined}
          >
            <span className="plan-name">{planName(plan)}</span>
            <span className="plan-price">{fcfa(plan.price)}</span>
            {usdEquivalent(plan.price, plan.currency, rates) && (
              <span className="plan-usd" title={t("sub.usdNote")}>
                {usdEquivalent(plan.price, plan.currency, rates)}
              </span>
            )}
            <span className="muted small">
              {plan.durationMonths === 1 ? t("sub.durationMonthly") : t("sub.duration", { months: plan.durationMonths, monthly: fcfa(plan.monthlyPrice) })}
            </span>
            <ul className="plan-features small">
              <li><Icon name="check" size={14} /> {t("sub.feature.visible")}</li>
              <li><Icon name="check" size={14} /> {t("sub.feature.booking")}</li>
              <li><Icon name="check" size={14} /> {t("sub.feature.sms")}</li>
              <li><Icon name="check" size={14} /> {t("sub.feature.renew")}</li>
            </ul>
          </Tag>
        );
      })}
    </div>
    </>
  );
}

/** Instructions de paiement mobile money d'une commande en attente. */
function PaymentInstructions({ order, account, paypal, canSimulate, onChange }: { order: Subscription; account: Record<string, string | null>; paypal: SubscriptionStatusResponse["paypal"]; canSimulate: boolean; onChange: () => void }) {
  const { t } = useI18n();
  const rates = useExchangeRates();
  const usd = order.amountUsd !== null ? `≈ ${dollars(order.amountUsd)}` : usdEquivalent(order.amount, order.currency, rates);
  const amount = (
    <b>
      {fcfa(order.amount)}
      {usd && <span className="usd-inline"> ({usd})</span>}
    </b>
  );
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
      setError(err instanceof ApiError ? err.message : t("error.action"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card panel payment-box">
      <h2>
        <Icon name="money" /> {t("sub.orderPending", { reference: order.reference })}
      </h2>
      {order.paymentMethod === "paypal" && paypal ? (
        <>
          <p style={{ marginBottom: 12 }}>
            <Trans text={t("sub.paypalIntro")} values={{ amount }} />
          </p>
          {order.transactionId ? (
            <p className="alert alert-info">{t("sub.paypalReview", { id: order.transactionId.split(" ")[0] })}</p>
          ) : isNativeApp() ? (
            <p className="alert alert-warn">
              {t("sub.paypalWebOnly", { reference: order.reference })}{" "}
              <a className="link-btn" href={`${new URL(API_URL).origin}/pro?onglet=abonnement`} target="_blank" rel="noopener noreferrer">
                {t("sub.openWebsite")}
              </a>
            </p>
          ) : (
            <PayPalCheckout subscriptionId={order.id} clientId={paypal.clientId} onPaid={onChange} />
          )}
        </>
      ) : (
        <ol className="pay-steps">
          <li>
            <Trans text={t("sub.sendAmount")} values={{ amount, method: <b>{paymentMethodName({ code: order.paymentMethod, label: order.paymentMethodLabel })}</b> }} />
            {number && (
              <>
                {" "}
                <Trans text={t("sub.toNumber")} values={{ number: <b className="nowrap" dir="ltr">{number}</b>, holder: account.holder ?? BRAND_NAME }} />
              </>
            )}
            .{!number && ` ${t("sub.detailsBySms")}`}
          </li>
          <li>
            <Trans text={t("sub.reference")} values={{ reference: <span className="ref-code">{order.reference}</span> }} />
          </li>
          <li>{t("sub.publishedAfter")}</li>
        </ol>
      )}
      {error && <p className="alert alert-error">{error}</p>}
      <div className="row">
        {canSimulate && (
          <button type="button" className="btn btn-sm btn-indigo" disabled={busy} onClick={() => act("simulate-payment")}>
            {t("sub.simulate")}
          </button>
        )}
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => window.confirm(t("sub.cancelConfirm")) && act("cancel")}>
          {t("sub.cancelOrder")}
        </button>
      </div>
    </section>
  );
}

/** Onglet "Abonnement" de l'espace praticien : état, renouvellement, paiement, historique. */
export function SubscriptionPanel() {
  const { t, tn } = useI18n();
  const { data, error, loading, reload } = useApi<SubscriptionStatusResponse>("/api/pro/subscription");
  const rates = useExchangeRates();
  const [plan, setPlan] = useState<string>("monthly");
  const [method, setMethod] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error?.message ?? t("sub.unavailable")} onRetry={reload} />;

  const methods = data.methods;
  const chosenMethod = method || methods[0]?.code || "";
  const expiringSoon = data.activeSubscription && data.daysLeft <= 14;
  const monthlyPrice = fcfa(data.plans.find((p) => p.durationMonths === 1)?.monthlyPrice ?? data.plans[0]?.monthlyPrice ?? 0);
  // En attente de validation : rien à payer, la publication sera gratuite les premiers mois.
  const canOrder = data.verified || data.pending !== null;
  const selectedPlan = data.plans.find((p) => p.code === plan);
  const selectedUsd = selectedPlan ? usdEquivalent(selectedPlan.price, selectedPlan.currency, rates) : null;
  const orderAmount = `${fcfa(selectedPlan?.price ?? 0)}${selectedUsd ? ` (${selectedUsd})` : ""}`;

  async function order() {
    setBusy(true);
    setFailure(null);
    try {
      await api("/api/pro/subscriptions", { method: "POST", body: JSON.stringify({ plan, method: chosenMethod }) });
      reload();
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : t("sub.orderFailed"));
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
            {data.published && data.inTrial ? (
              <>
                <h2 style={{ margin: 0 }}>{expiringSoon ? tn("sub.trialEndsIn", data.daysLeft) : t("sub.trialTitle", { date: shortDate(data.publishedUntil!) })}</h2>
                <p className="muted">{t("sub.trialText", { price: monthlyPrice })}</p>
              </>
            ) : data.published ? (
              <>
                <h2 style={{ margin: 0 }}>{expiringSoon ? tn("sub.expiresIn", data.daysLeft) : t("sub.published")}</h2>
                <p className="muted">
                  <Trans text={t("sub.visibleUntil")} values={{ date: <b>{shortDate(data.publishedUntil!)}</b> }} />
                  {expiringSoon && ` ${t("sub.renewNow")}`}
                </p>
              </>
            ) : (
              <>
                <h2 style={{ margin: 0 }}>{t("sub.notVisible")}</h2>
                <p className="muted">
                  {!data.verified
                    ? t("sub.pendingVerification", { months: data.trialMonths })
                    : data.publishedUntil
                      ? t("sub.expired", { date: shortDate(data.publishedUntil) })
                      : t("sub.subscribe")}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {data.pending ? (
        <PaymentInstructions order={data.pending} account={data.paymentAccount} paypal={data.paypal} canSimulate={data.canSimulatePayment} onChange={reload} />
      ) : !canOrder ? (
        <section className="card panel">
          <h2>
            <Icon name="crown" /> {t("sub.choosePlan")}
          </h2>
          <PlanCards plans={data.plans} trialMonths={data.trialMonths} />
        </section>
      ) : (
        <section className="card panel">
          <h2>
            <Icon name="crown" /> {data.inTrial ? t("sub.subscribeAfterTrial") : data.activeSubscription ? t("sub.renew") : t("sub.choosePlan")}
          </h2>
          <PlanCards plans={data.plans} selected={plan} onSelect={setPlan} trialMonths={data.trialUntil ? 0 : data.trialMonths} />
          <div style={{ marginTop: 16 }}>
            <label className="field-label" htmlFor="method">
              {t("sub.paymentMethod")}
            </label>
            <select id="method" className="select" value={chosenMethod} onChange={(e) => setMethod(e.target.value)}>
              {methods.map((m) => (
                <option key={m.code} value={m.code}>
                  {paymentMethodName(m)}
                </option>
              ))}
            </select>
          </div>
          {failure && <p className="alert alert-error" style={{ marginTop: 12 }}>{failure}</p>}
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 16 }} disabled={busy || !chosenMethod} onClick={order}>
            {busy ? t("sub.ordering") : t("sub.order", { amount: orderAmount })}
          </button>
          {selectedPlan && usdEquivalent(selectedPlan.price, selectedPlan.currency, rates) && <p className="muted small" style={{ marginTop: 8, textAlign: "center" }}>{t("sub.usdNote")}</p>}
        </section>
      )}

      {data.history.length > 0 && (
        <section className="card panel">
          <h2>
            <Icon name="calendar" /> {t("sub.history")}
          </h2>
          <div className="table-wrap">
            <table className="hours">
              <tbody>
                {data.history.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <b>{planName(s.plan)}</b> · {s.reference}
                      <br />
                      <span className="small muted">
                        {s.startsAt && s.endsAt ? `${shortDate(s.startsAt)} → ${shortDate(s.endsAt)}` : t("sub.orderedOn", { date: shortDate(s.createdAt) })}
                      </span>
                    </td>
                    <td>
                      {fcfa(s.amount)}
                      {s.amountUsd !== null && <span className="muted small"> · {dollars(s.amountUsd)}</span>}
                      <br />
                      <span className={`tag ${STATUS[s.status][1]}`}>{t(STATUS[s.status][0])}</span>
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
