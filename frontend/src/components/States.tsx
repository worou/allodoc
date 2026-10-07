import { Link } from "react-router";
import { Icon } from "./Icon";

export function Loading({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="container" style={{ padding: "32px 16px" }} role="status" aria-live="polite">
      <div className="stack">
        <div className="skeleton" style={{ height: 110 }} />
        <div className="skeleton" style={{ height: 110 }} />
        <span className="visually-hidden">{label}</span>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="container">
      <div className="card empty" style={{ margin: "24px 0" }}>
        <Icon name="wifiOff" size={40} />
        <p style={{ fontWeight: 700 }}>{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={onRetry}>
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

export function LoginRequired({ next }: { next: string }) {
  return (
    <div className="funnel">
      <div className="card empty">
        <Icon name="user" size={40} />
        <p style={{ fontWeight: 700, fontSize: 18 }}>Connectez-vous pour accéder à cette page</p>
        <p className="muted">Un simple code reçu par SMS suffit.</p>
        <Link to={`/connexion?next=${encodeURIComponent(next)}`} className="btn btn-primary" style={{ marginTop: 16 }}>
          Se connecter
        </Link>
      </div>
    </div>
  );
}
