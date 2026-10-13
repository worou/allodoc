import { useState } from "react";
import { hasRole, useAuth } from "../components/AuthProvider";
import { Avatar } from "../components/Avatar";
import { Flag } from "../components/Flag";
import { Icon } from "../components/Icon";
import { ErrorState, Loading, LoginRequired } from "../components/States";
import { api, ApiError, countryName } from "../lib/api";
import { fcfa, money, planName, shortDate, specialtyList } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import { useI18n, type MessageKey } from "../lib/i18n";
import type { PractitionerDetail, Subscription } from "../lib/types";

type Item = PractitionerDetail & { verificationStatus: string; createdAt: string; publishedUntil: string | null; activeSubscription: boolean };
type Status = "pending" | "verified" | "rejected";

const TABS: [Status, MessageKey][] = [
  ["pending", "admin.tabPending"],
  ["verified", "admin.tabVerified"],
  ["rejected", "admin.tabRejected"],
];

/** Paiements d'abonnement à confirmer (mobile money reçu sur le compte marchand du pays). */
function Payments() {
  const { t, tn } = useI18n();
  const [status, setStatus] = useState<"pending" | "paid">("pending");
  const { data, error, loading, reload } = useApi<{ total: number; items: Subscription[] }>(`/api/admin/subscriptions?status=${status}`);
  const [transactions, setTransactions] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function act(s: Subscription, action: "confirm" | "reject") {
    try {
      await api(`/api/admin/subscriptions/${s.id}/${action}`, { method: "POST", body: JSON.stringify({ transactionId: transactions[s.id] ?? "" }) });
      setMessage({
        ok: true,
        text: action === "confirm" ? t("admin.paymentConfirmed", { reference: s.reference, name: s.practitioner?.fullName ?? "" }) : t("admin.paymentRejected", { reference: s.reference }),
      });
      reload();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : t("error.action") });
    }
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button type="button" className={`filter-chip${status === "pending" ? " active" : ""}`} onClick={() => setStatus("pending")}>{t("admin.toConfirm")}</button>
        <button type="button" className={`filter-chip${status === "paid" ? " active" : ""}`} onClick={() => setStatus("paid")}>{t("admin.collected")}</button>
        {data && <span className="muted small">{tn("admin.orders", data.items.length)} · {fcfa(data.total)}</span>}
      </div>
      {status === "pending" && (
        <p className="alert alert-info" style={{ marginBottom: 16 }}>
          <Icon name="money" /> {t("admin.checkStatement")}
        </p>
      )}
      {message && <p className={`alert ${message.ok ? "alert-ok" : "alert-error"}`} style={{ marginBottom: 16 }}>{message.text}</p>}
      {loading && !data && <Loading />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <div className="card empty">
          <Icon name="check" size={40} />
          <p style={{ fontWeight: 700 }}>{t("admin.noOrders")}</p>
        </div>
      )}
      <div className="stack">
        {data?.items.map((s) => (
          <article key={s.id} className="card panel" style={{ display: "grid", gap: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span className="ref-code">{s.reference}</span>
                <p style={{ fontWeight: 800, fontSize: 17, marginTop: 6 }}>{s.practitioner?.fullName}</p>
                <p className="small muted">
                  {s.practitioner?.city} · <span dir="ltr">{s.practitioner?.phone ?? t("admin.noPhone")}</span> · {t("admin.orderedOn", { date: shortDate(s.createdAt) })}
                </p>
              </div>
              <div style={{ textAlign: "end" }}>
                <p className="plan-price" style={{ fontSize: 24 }}>{fcfa(s.amount)}</p>
                <p className="small muted">{planName(s.plan)} · {s.paymentMethodLabel}</p>
                {s.paymentMethod === "paypal" && s.status === "pending" && (
                  <p className="small">
                    <span className={`tag ${s.transactionId ? "tag-danger" : "tag-indigo"}`}>
                      {s.transactionId ? t("admin.paypalToCheck", { id: s.transactionId }) : t("admin.paypalAuto")}
                    </span>
                  </p>
                )}
              </div>
            </div>
            {s.status === "pending" ? (
              <div className="row">
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 200, minHeight: 40 }}
                  placeholder={t("admin.transactionPlaceholder")}
                  value={transactions[s.id] ?? ""}
                  onChange={(e) => setTransactions({ ...transactions, [s.id]: e.target.value })}
                />
                <button type="button" className="btn btn-sm btn-indigo" onClick={() => act(s, "confirm")}>
                  <Icon name="check" size={16} /> {t("admin.paymentReceived")}
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => window.confirm(t("admin.rejectConfirm")) && act(s, "reject")}>
                  {t("admin.reject")}
                </button>
              </div>
            ) : (
              <p className="small muted">
                {t("admin.paidOn", { date: s.paidAt ? shortDate(s.paidAt) : "–" })}
                {s.transactionId ? ` · ${t("admin.transaction", { id: s.transactionId })}` : ""} ·{" "}
                {t("admin.period", { from: s.startsAt ? shortDate(s.startsAt) : "", to: s.endsAt ? shortDate(s.endsAt) : "" })}
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

export default function Admin() {
  const { t } = useI18n();
  useTitle(t("admin.title"));
  const { user, ready } = useAuth();
  const isAdmin = hasRole(user, "ROLE_COUNTRY_ADMIN");
  const [status, setStatus] = useState<Status | "payments">("pending");
  const { data, error, loading, reload } = useApi<{ items: Item[] }>(isAdmin && status !== "payments" ? `/api/admin/practitioners?status=${status}` : null);
  const [message, setMessage] = useState<string | null>(null);

  if (!ready) return <Loading />;
  if (!user) return <LoginRequired next="/admin" />;
  if (!isAdmin) return <ErrorState message={t("admin.restricted")} />;

  async function decide(p: Item, decision: "verify" | "reject") {
    try {
      await api(`/api/admin/practitioners/${p.id}/verification`, { method: "POST", body: JSON.stringify({ decision }) });
      setMessage(decision === "verify" ? t("admin.validated", { name: p.fullName }) : t("admin.rejected", { name: p.fullName }));
      reload();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : t("error.action"));
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="container">
          <p className="muted small row">
            {user.adminCountry ? (
              <>
                <Flag code={user.adminCountry} width={20} /> {t("admin.countryAdmin", { country: countryName(user.adminCountry) })}
              </>
            ) : (
              t("admin.superAdmin")
            )}
          </p>
          <h1>{status === "payments" ? t("admin.paymentsTitle") : t("admin.validationTitle")}</h1>
          <div className="tabs" role="tablist">
            {TABS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={status === key} onClick={() => setStatus(key)}>
                {t(label)}
              </button>
            ))}
            <button role="tab" aria-selected={status === "payments"} onClick={() => setStatus("payments")}>
              {t("admin.payments")}
            </button>
          </div>
        </div>
      </div>
      <div className="container" style={{ padding: "24px 16px 40px", maxWidth: 960 }}>
        {status === "payments" ? <Payments /> : <>
        <p className="alert alert-info" style={{ marginBottom: 16 }}>
          <Icon name="shield" /> {t("admin.checkOrder")}
        </p>
        {message && <p className="alert alert-ok" style={{ marginBottom: 16 }}>{message}</p>}
        {loading && !data && <Loading />}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data && data.items.length === 0 && (
          <div className="card empty">
            <Icon name="check" size={40} />
            <p style={{ fontWeight: 700 }}>{t("admin.noFiles")}</p>
          </div>
        )}
        <div className="stack">
          {data?.items.map((p) => (
            <article key={p.id} className="card panel" style={{ display: "grid", gap: 14 }}>
              <div className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                <Avatar firstName={p.firstName} lastName={p.lastName} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 18 }}>{p.fullName}</b>
                  <p className="small muted">
                    {specialtyList(p.specialties)} · {p.facility?.name}, {p.facility?.city} ({p.facility?.region.name})
                  </p>
                  <p className="small">
                    {t("admin.orderNumber")} <b>{p.orderNumber}</b> · {t("admin.fee", { fee: money(p.fee, p.currency) })} · {t("admin.registeredOn", { date: shortDate(p.createdAt) })} ·{" "}
                    {p.activeSubscription ? <span className="tag tag-green">{t("admin.subscribedUntil", { date: shortDate(p.publishedUntil!) })}</span> : <span className="tag tag-danger">{t("admin.noSubscription")}</span>}
                  </p>
                  <ul className="small muted" style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
                    {p.degrees.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="row">
                {status !== "verified" && (
                  <button type="button" className="btn btn-sm btn-indigo" onClick={() => decide(p, "verify")}>
                    <Icon name="check" size={16} /> {t("admin.validate")}
                  </button>
                )}
                {status !== "rejected" && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => decide(p, "reject")}>
                    <Icon name="x" size={16} /> {t("admin.rejectFile")}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        </>}
      </div>
    </>
  );
}
