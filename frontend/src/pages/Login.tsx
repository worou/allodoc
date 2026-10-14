import { useNavigate, useSearchParams } from "react-router";
import { OtpLogin } from "../components/OtpLogin";
import { useTitle } from "../lib/hooks";
import { useI18n } from "../lib/i18n";

export default function Login() {
  const { t } = useI18n();
  useTitle(t("loginPage.title"));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get("next");
  const next = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : null;
  const oauthError = params.get("oauth_error");

  return (
    <div className="funnel" style={{ maxWidth: 480 }}>
      {oauthError && (
        <p className="alert alert-error" style={{ marginBottom: 16 }}>
          {oauthError}
        </p>
      )}
      <OtpLogin
        next={next ?? "/compte"}
        onDone={(user) => {
          const fallback = user.roles.includes("ROLE_PRACTITIONER") ? "/pro" : user.roles.includes("ROLE_COUNTRY_ADMIN") ? "/admin" : "/compte";
          navigate(next ?? fallback, { replace: true });
        }}
      />
      {/* Comptes fictifs des données de démonstration : n'existent qu'en développement. */}
      {import.meta.env.DEV && (
        <div className="card" style={{ padding: 16, marginTop: 16 }}>
          <p className="small" style={{ fontWeight: 700, marginBottom: 6 }}>{t("loginPage.demo")}</p>
          <ul className="small muted" style={{ margin: 0, paddingInlineStart: 18 }}>
            <li>{t("loginPage.demoPatient")}</li>
            <li>{t("loginPage.demoPractitioner")}</li>
            <li>{t("loginPage.demoAdmin")}</li>
            <li>{t("loginPage.demoSuper")}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
