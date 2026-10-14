import { lazy, Suspense, useMemo, type CSSProperties } from "react";
import { Link } from "react-router";
import { Flag } from "../components/Flag";
import { Icon } from "../components/Icon";
import { HeroSun } from "../components/Logo";
import { SearchBar } from "../components/SearchBar";
import { SUBREGIONS, subregionName, subregionPath } from "../lib/africa";
import { useCountries, useSpecialties, useTitle } from "../lib/hooks";
import { Trans, useI18n } from "../lib/i18n";

// Carte chargée à part : le premier écran reste léger sur réseau 3G.
const AfricaMap = lazy(() => import("../components/AfricaMap"));

const POPULAR = ["medecine-generale", "pediatrie", "gynecologie", "dentiste", "ophtalmologie", "cardiologie"];

export default function Home() {
  useTitle("");
  const { t, tn } = useI18n();
  const specialties = useSpecialties();
  const countries = useCountries();
  const subregionOf = useMemo(() => Object.fromEntries(countries.map((c) => [c.code, c.subregion])), [countries]);
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
          <SearchBar specialties={specialties} />
          <div className="hero-chips">
            <Link to="/recherche?teleconsultation=1" className="chip-video">
              <Icon name="video" size={15} /> {t("common.teleconsultation")}
            </Link>
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
          <div className="home-africa">
            <div className="subregion-cards">
              {SUBREGIONS.map((s) => {
                const group = countries.filter((c) => c.subregion === s.code);
                return (
                  <Link key={s.code} to={subregionPath(s.code)} className="card subregion-card" style={{ "--tab": s.color } as CSSProperties}>
                    <span className="subregion-card-head">
                      <span className="dot" aria-hidden="true" />
                      <b>{subregionName(s.code)}</b>
                      {group.length > 0 && <small className="muted">{tn("africa.countries", group.length)}</small>}
                    </span>
                    <span className="flag-row" aria-hidden="true">
                      {group.slice(0, 8).map((c) => (
                        <Flag key={c.code} code={c.code} width={26} />
                      ))}
                      {group.length > 8 && <span className="more">+{group.length - 8}</span>}
                    </span>
                    <Icon name="chevronRight" className="chev" />
                  </Link>
                );
              })}
              <Link to="/afrique" className="btn btn-outline" style={{ alignSelf: "flex-start" }}>
                <Icon name="globe" size={18} /> {t("home.exploreAfrica")}
              </Link>
            </div>
            <div className="home-map">
              <Suspense fallback={<div className="skeleton map-skeleton" />}>
                <AfricaMap subregions={subregionOf} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="tele-banner">
            <div className="tele-banner-text">
              <span className="tele-kicker">
                <Icon name="video" size={16} /> {t("common.teleconsultation")}
              </span>
              <h2>{t("video.homeTitle")}</h2>
              <p>{t("video.homeLead")}</p>
              <ul>
                <li>
                  <Icon name="check" size={16} /> {t("video.homePoint1")}
                </li>
                <li>
                  <Icon name="check" size={16} /> {t("video.homePoint2")}
                </li>
                <li>
                  <Icon name="check" size={16} /> {t("video.homePoint3")}
                </li>
              </ul>
              <Link to="/recherche?teleconsultation=1" className="btn">
                <Icon name="video" size={18} /> {t("video.homeCta")}
              </Link>
            </div>
            <div className="tele-banner-art" aria-hidden="true">
              <div className="tele-screen">
                <span className="tele-face doctor">
                  <Icon name="stethoscope" size={34} />
                </span>
                <span className="tele-face patient">
                  <Icon name="user" size={22} />
                </span>
                <span className="tele-live">● {t("video.live")}</span>
              </div>
            </div>
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
