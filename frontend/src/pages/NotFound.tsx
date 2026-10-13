import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { useTitle } from "../lib/hooks";
import { useI18n } from "../lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  useTitle(t("notFound.title"));
  return (
    <div className="funnel">
      <div className="card empty">
        <Icon name="pin" size={44} />
        <h1 style={{ fontSize: 26, margin: "8px 0" }}>{t("notFound.title")}</h1>
        <p className="muted">{t("notFound.text")}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
          {t("common.backHome")}
        </Link>
      </div>
    </div>
  );
}
