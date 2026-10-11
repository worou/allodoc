import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../components/AuthProvider";
import { Loading } from "../components/States";
import { api, ApiError } from "../lib/api";
import { useTitle } from "../lib/hooks";
import { useI18n } from "../lib/i18n";
import type { User } from "../lib/types";
import { OAUTH_NONCE_KEY } from "../components/OtpLogin";

/** Retour de Google / GitHub : échange le code à usage unique contre le jeton de session. */
export default function OAuthCallback() {
  const { t } = useI18n();
  useTitle(t("loginPage.title"));
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    // Le code ne sert qu'une fois : on évite le double appel du mode strict de React.
    if (done.current) return;
    done.current = true;
    const next = params.get("next") ?? "/compte";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/compte";
    let nonce: string | null = null;
    try {
      nonce = sessionStorage.getItem(OAUTH_NONCE_KEY);
      sessionStorage.removeItem(OAUTH_NONCE_KEY);
    } catch {
      nonce = null;
    }
    api<{ token: string; user: User }>("/api/auth/oauth/exchange", { method: "POST", body: JSON.stringify({ code: params.get("code"), nonce }), auth: false })
      .then((res) => {
        login(res.token, res.user);
        navigate(safeNext, { replace: true });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("oauth.failed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, login, navigate]);

  if (!error) return <Loading label={t("oauth.inProgress")} />;
  return (
    <div className="funnel" style={{ maxWidth: 480 }}>
      <div className="card form-card">
        <p className="alert alert-error">{error}</p>
        <Link to="/connexion" className="btn btn-primary">
          {t("common.retry")}
        </Link>
      </div>
    </div>
  );
}
