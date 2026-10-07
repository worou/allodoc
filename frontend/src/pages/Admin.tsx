import { useState } from "react";
import { hasRole, useAuth } from "../components/AuthProvider";
import { Avatar } from "../components/Avatar";
import { Flag } from "../components/Flag";
import { Icon } from "../components/Icon";
import { ErrorState, Loading, LoginRequired } from "../components/States";
import { api, ApiError, COUNTRY_NAMES } from "../lib/api";
import { fcfa, shortDate } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import type { PractitionerDetail, Subscription } from "../lib/types";

type Item = PractitionerDetail & { verificationStatus: string; createdAt: string; publishedUntil: string | null; activeSubscription: boolean };
type Status = "pending" | "verified" | "rejected";

const TABS: [Status, string][] = [
  ["pending", "À vérifier"],
  ["verified", "Vérifiés"],
  ["rejected", "Rejetés"],
];

/** Paiements d'abonnement à confirmer (mobile money reçu sur le compte marchand du pays). */
function Payments() {
  const [status, setStatus] = useState<"pending" | "paid">("pending");
  const { data, error, loading, reload } = useApi<{ total: number; items: Subscription[] }>(`/api/admin/subscriptions?status=${status}`);
  const [transactions, setTransactions] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function act(s: Subscription, action: "confirm" | "reject") {
    try {
      await api(`/api/admin/subscriptions/${s.id}/${action}`, { method: "POST", body: JSON.stringify({ transactionId: transactions[s.id] ?? "" }) });
      setMessage({ ok: true, text: action === "confirm" ? `${s.reference} confirmé : ${s.practitioner?.fullName} est publié.` : `${s.reference} refusé.` });
      reload();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : "Action impossible." });
    }
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <button type="button" className={`filter-chip${status === "pending" ? " active" : ""}`} onClick={() => setStatus("pending")}>À confirmer</button>
        <button type="button" className={`filter-chip${status === "paid" ? " active" : ""}`} onClick={() => setStatus("paid")}>Encaissés</button>
        {data && <span className="muted small">{data.items.length} commande{data.items.length > 1 ? "s" : ""} · {fcfa(data.total)}</span>}
      </div>
      {status === "pending" && (
        <p className="alert alert-info" style={{ marginBottom: 16 }}>
          <Icon name="money" /> Vérifiez sur le relevé du compte marchand qu&apos;un transfert du bon montant porte la référence de la commande, puis confirmez.
        </p>
      )}
      {message && <p className={`alert ${message.ok ? "alert-ok" : "alert-error"}`} style={{ marginBottom: 16 }}>{message.text}</p>}
      {loading && !data && <Loading />}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {data && data.items.length === 0 && (
        <div className="card empty">
          <Icon name="check" size={40} />
          <p style={{ fontWeight: 700 }}>Aucune commande dans cette liste.</p>
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
                  {s.practitioner?.city} · {s.practitioner?.phone ?? "pas de téléphone"} · commandé le {shortDate(s.createdAt)}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p className="plan-price" style={{ fontSize: 24 }}>{fcfa(s.amount)}</p>
                <p className="small muted">{s.plan.name} · {s.paymentMethodLabel}</p>
              </div>
            </div>
            {s.status === "pending" ? (
              <div className="row">
                <input
                  className="input"
                  style={{ flex: 1, minWidth: 200, minHeight: 40 }}
                  placeholder="N° de transaction de l'opérateur (facultatif)"
                  value={transactions[s.id] ?? ""}
                  onChange={(e) => setTransactions({ ...transactions, [s.id]: e.target.value })}
                />
                <button type="button" className="btn btn-sm btn-indigo" onClick={() => act(s, "confirm")}>
                  <Icon name="check" size={16} /> Paiement reçu
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={() => window.confirm("Refuser cette commande ?") && act(s, "reject")}>
                  Refuser
                </button>
              </div>
            ) : (
              <p className="small muted">
                Payé le {s.paidAt ? shortDate(s.paidAt) : "–"}{s.transactionId ? ` · transaction ${s.transactionId}` : ""} · période {s.startsAt ? shortDate(s.startsAt) : ""} → {s.endsAt ? shortDate(s.endsAt) : ""}
              </p>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

export default function Admin() {
  useTitle("Administration");
  const { user, ready } = useAuth();
  const isAdmin = hasRole(user, "ROLE_COUNTRY_ADMIN");
  const [status, setStatus] = useState<Status | "payments">("pending");
  const { data, error, loading, reload } = useApi<{ items: Item[] }>(isAdmin && status !== "payments" ? `/api/admin/practitioners?status=${status}` : null);
  const [message, setMessage] = useState<string | null>(null);

  if (!ready) return <Loading />;
  if (!user) return <LoginRequired next="/admin" />;
  if (!isAdmin) return <ErrorState message="Accès réservé aux administrateurs." />;

  async function decide(p: Item, decision: "verify" | "reject") {
    try {
      await api(`/api/admin/practitioners/${p.id}/verification`, { method: "POST", body: JSON.stringify({ decision }) });
      setMessage(`${p.fullName} : ${decision === "verify" ? "inscription validée (publié dès que son abonnement est actif)" : "inscription rejetée"}.`);
      reload();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Action impossible.");
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="container">
          <p className="muted small row">
            {user.adminCountry ? (
              <>
                <Flag code={user.adminCountry} width={20} /> Administration {COUNTRY_NAMES[user.adminCountry]}
              </>
            ) : (
              "Super-administration · tous les pays"
            )}
          </p>
          <h1>{status === "payments" ? "Paiements des abonnements" : "Validation des praticiens"}</h1>
          <div className="tabs" role="tablist">
            {TABS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={status === key} onClick={() => setStatus(key)}>
                {label}
              </button>
            ))}
            <button role="tab" aria-selected={status === "payments"} onClick={() => setStatus("payments")}>
              Paiements
            </button>
          </div>
        </div>
      </div>
      <div className="container" style={{ padding: "24px 16px 40px", maxWidth: 960 }}>
        {status === "payments" ? <Payments /> : <>
        <p className="alert alert-info" style={{ marginBottom: 16 }}>
          <Icon name="shield" /> Avant de valider, contrôlez le numéro d&apos;inscription auprès de l&apos;ordre professionnel du pays.
        </p>
        {message && <p className="alert alert-ok" style={{ marginBottom: 16 }}>{message}</p>}
        {loading && !data && <Loading />}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data && data.items.length === 0 && (
          <div className="card empty">
            <Icon name="check" size={40} />
            <p style={{ fontWeight: 700 }}>Aucun dossier dans cette liste.</p>
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
                    {p.specialties.map((s) => s.name).join(", ")} · {p.facility?.name}, {p.facility?.city} ({p.facility?.region.name})
                  </p>
                  <p className="small">
                    N° d&apos;ordre : <b>{p.orderNumber}</b> · Tarif {fcfa(p.fee)} · Inscrit le {new Date(p.createdAt).toLocaleDateString("fr-FR")} ·{" "}
                    {p.activeSubscription ? <span className="tag tag-green">Abonné jusqu&apos;au {shortDate(p.publishedUntil!)}</span> : <span className="tag tag-danger">Sans abonnement actif</span>}
                  </p>
                  <ul className="small muted" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {p.degrees.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="row">
                {status !== "verified" && (
                  <button type="button" className="btn btn-sm btn-indigo" onClick={() => decide(p, "verify")}>
                    <Icon name="check" size={16} /> Valider et publier
                  </button>
                )}
                {status !== "rejected" && (
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => decide(p, "reject")}>
                    <Icon name="x" size={16} /> Rejeter
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
