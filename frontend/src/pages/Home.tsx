import { Link } from "react-router";
import { Flag, FLAG_STRIPES } from "../components/Flag";
import { Icon } from "../components/Icon";
import { HeroSun } from "../components/Logo";
import { SearchBar } from "../components/SearchBar";
import { COUNTRY_PATHS, countryName } from "../lib/api";
import { useRegions, useSpecialties, useTitle } from "../lib/hooks";
import { Trans, useI18n } from "../lib/i18n";
import type { CountryCode } from "../lib/types";

const COUNTRIES: { code: CountryCode; capital: string }[] = [
  { code: "ML", capital: "Bamako" },
  { code: "BF", capital: "Ouagadougou" },
  { code: "NE", capital: "Niamey" },
];

const POPULAR = ["medecine-generale", "pediatrie", "gynecologie", "dentiste", "ophtalmologie", "cardiologie"];

export default function Home() {
  useTitle("");
  const { t } = useI18n();
  const specialties = useSpecialties();
  const regions = useRegions();
  const popular = POPULAR.map((slug) => specialties.find((s) => s.slug === slug)).filter((s) => s !== undefined);

  return (
    <>
      <section className="hero">
        <HeroSun />
        <div className="container">
          <h1>
            <Trans text={t("home.heroTitle")} values={{ em: <em>{t("home.heroTitleEm")}</em> }} />
          </h1>
          <p className="lead">{t("home.heroLead")}</p>
          <SearchBar specialties={specialties} regions={regions} />
          <div className="hero-chips">
            {popular.map((s) => (
              <Link key={s.slug} to={`/recherche?specialty=${s.slug}`}>
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="section-title">
                <Trans text={t("home.chooseCountry")} values={{ accent: <span className="accent">{t("home.chooseCountryAccent")}</span> }} />
              </h2>
              <p className="section-sub">{t("home.chooseCountrySub")}</p>
            </div>
          </div>
          <div className="country-grid">
            {COUNTRIES.map((c) => (
              <Link key={c.code} to={`/${COUNTRY_PATHS[c.code]}`} className="card country-card">
                <div className="stripe" style={{ background: FLAG_STRIPES[c.code] }} />
                <div className="body">
                  <Flag code={c.code} width={60} />
                  <div>
                    <h3>{countryName(c.code)}</h3>
                    <p className="muted small">
                      {c.capital} · {t(`home.regions.${c.code}`)}
                    </p>
                  </div>
                </div>
                <span className="cta">
                  {t("home.seePractitioners")} <Icon name="chevronRight" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="section-head">
            <div>
              <h2 className="section-title">{t("home.specialties")}</h2>
              <p className="section-sub">{t("home.specialtiesSub")}</p>
            </div>
          </div>
          <div className="specialty-grid">
            {specialties.length === 0 &&
              Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton" style={{ height: 70 }} />)}
            {specialties.map((s) => (
              <Link key={s.slug} to={`/recherche?specialty=${s.slug}`} className="specialty-tile">
                <span className="ico">
                  <Icon name={s.icon} size={22} />
                </span>
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--white)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container">
          <h2 className="section-title" style={{ marginBottom: 22 }}>
            <Trans text={t("home.howItWorks")} values={{ accent: <span className="accent">{t("home.howItWorksAccent")}</span> }} />
          </h2>
          <div className="steps">
            <div className="card step">
              <h3>{t("home.step1Title")}</h3>
              <p>{t("home.step1")}</p>
            </div>
            <div className="card step">
              <h3>{t("home.step2Title")}</h3>
              <p>{t("home.step2")}</p>
            </div>
            <div className="card step">
              <h3>{t("home.step3Title")}</h3>
              <p>{t("home.step3")}</p>
            </div>
            <div className="card step">
              <h3>{t("home.step4Title")}</h3>
              <p>{t("home.step4")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pro-banner">
            <div>
              <h2>{t("home.proTitle")}</h2>
              <p style={{ marginTop: 8, opacity: 0.92 }}>{t("home.proText")}</p>
            </div>
            <Link to="/pro" className="btn">
              {t("home.proCta")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
