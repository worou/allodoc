import { Link } from "react-router";
import { useI18n } from "../lib/i18n";
import { Icon } from "./Icon";

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="container" style={{ padding: "32px 16px" }} role="status" aria-live="polite">
      <div className="stack">
        <div className="skeleton" style={{ height: 110 }} />
        <div className="skeleton" style={{ height: 110 }} />
        <span className="visually-hidden">{label ?? t("common.loading")}</span>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="container">
      <div className="card empty" style={{ margin: "24px 0" }}>
        <Icon name="wifiOff" size={40} />
        <p style={{ fontWeight: 700 }}>{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={onRetry}>
            {t("common.retry")}
          </button>
        )}
      </div>
    </div>
  );
}

export function LoginRequired({ next }: { next: string }) {
  const { t } = useI18n();
  return (
    <div className="funnel">
      <div className="card empty">
        <Icon name="user" size={40} />
        <p style={{ fontWeight: 700, fontSize: 18 }}>{t("login.required")}</p>
        <p className="muted">{t("login.requiredHint")}</p>
        <Link to={`/connexion?next=${encodeURIComponent(next)}`} className="btn btn-primary" style={{ marginTop: 16 }}>
          {t("nav.login")}
        </Link>
      </div>
    </div>
  );
}
