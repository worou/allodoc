import { Link } from "react-router";
import { SUBREGIONS, subregionName, subregionPath } from "../lib/africa";
import { useI18n } from "../lib/i18n";
import { LogoMark } from "./Logo";
import { BRAND_PREFIX } from "../lib/brand";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="kente-band" />
      <div className="container">
        <div>
          <div className="brand" style={{ color: "#fff", marginBottom: 10 }}>
            <LogoMark size={30} />
            <span>
              {BRAND_PREFIX}
              <b>Doc</b>
            </span>
          </div>
          <p className="small">{t("footer.tagline")}</p>
        </div>
        <div>
          <h4>{t("footer.countries")}</h4>
          <ul>
            {SUBREGIONS.map((s) => (
              <li key={s.code}>
                <Link to={subregionPath(s.code)}>{subregionName(s.code)}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>{t("footer.patients")}</h4>
          <ul>
            <li><Link to="/recherche">{t("common.findPractitioner")}</Link></li>
            <li><Link to="/compte">{t("footer.myAppointments")}</Link></li>
            <li><Link to="/connexion">{t("nav.login")}</Link></li>
            <li><Link to="/application">{t("footer.mobileApp")}</Link></li>
          </ul>
        </div>
        <div>
          <h4>{t("footer.professionals")}</h4>
          <ul>
            <li><Link to="/pro">{t("footer.practitionerArea")}</Link></li>
            <li><Link to="/admin">{t("header.admin")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-legal">
        <nav className="footer-legal-links" aria-label={t("legal.documents")}>
          <Link to="/mentions-legales">{t("legal.notice")}</Link>
          <Link to="/confidentialite">{t("legal.privacy")}</Link>
          <Link to="/conditions">{t("legal.terms")}</Link>
        </nav>
        {t("footer.legal")}
      </div>
    </footer>
  );
}
