import { useNavigate, useSearchParams } from "react-router";
import { OtpLogin } from "../components/OtpLogin";
import { useTitle } from "../lib/hooks";

export default function Login() {
  useTitle("Connexion");
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
      <div className="card" style={{ padding: 16, marginTop: 16 }}>
        <p className="small" style={{ fontWeight: 700, marginBottom: 6 }}>Comptes de démonstration (par SMS)</p>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Patient : 70 00 00 01 (Mali)</li>
          <li>Praticien : 70 00 00 02 (Mali)</li>
          <li>Administrateur Mali : 70 00 00 03 (Mali)</li>
          <li>Super-administrateur : 90 00 00 00 (Niger)</li>
        </ul>
      </div>
    </div>
  );
}
