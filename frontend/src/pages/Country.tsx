import { Link, useParams } from "react-router";
import { Flag, FLAG_STRIPES } from "../components/Flag";
import { Icon } from "../components/Icon";
import { RegionList } from "../components/RegionList";
import { SearchBar } from "../components/SearchBar";
import { ErrorState, Loading } from "../components/States";
import { countryFromPath, countryName } from "../lib/api";
import { specialtyName } from "../lib/format";
import { useApi, useSpecialties, useTitle } from "../lib/hooks";
import { Trans, useI18n } from "../lib/i18n";
import type { CountryOverview } from "../lib/types";
import NotFound from "./NotFound";

export default function Country() {
  const { t, tn } = useI18n();
  const code = countryFromPath(useParams().country ?? "");
  useTitle(code ? t("country.title", { country: countryName(code) }) : t("country.notFound"));
  const { data, error, loading, reload } = useApi<CountryOverview>(code ? `/api/countries/${code}/overview` : null, { auth: false });
  const specialties = useSpecialties();

  if (!code) return <NotFound />;

  const regions = data?.regions ?? [];
  const covered = regions.filter((r) => r.practitionerCount > 0).length;
  const searchRegions = regions.map((r) => ({ slug: r.slug, name: r.name, country: code }));
  const available = (data?.specialties ?? []).filter((s) => s.practitionerCount > 0);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 56 }}>
        <div className="container">
          <div className="row" style={{ gap: 14, marginBottom: 16 }}>
            <Flag code={code} width={54} />
            {data && (
              <span className="tag" style={{ background: "rgb(255 255 255 / 12%)", color: "#fff" }}>
                {t("country.verified", { n: data.practitionerCount })} · {tn("country.regionsCovered", covered)}
              </span>
            )}
          </div>
          <h1>
            <Trans text={t("country.heroTitle")} values={{ country: <em>{countryName(code)}</em> }} />
          </h1>
          <p className="lead">{t("country.heroLead", { capital: data?.country.capital ?? t("country.theCapital") })}</p>
          <SearchBar key={code} specialties={specialties} regions={searchRegions} country={code} />
        </div>
      </section>
      <div style={{ height: 8, background: FLAG_STRIPES[code] }} />

      {loading && <Loading />}
      {error && <ErrorState message={error.message} onRetry={reload} />}

      {data && (
        <>
          <section className="section">
            <div className="container">
              <div className="section-head">
                <div>
                  <h2 className="section-title">{t("country.availableSpecialties")}</h2>
                  <p className="section-sub">{t("country.allRegions", { country: countryName(code) })}</p>
                </div>
              </div>
              <div className="specialty-grid">
                {available.map((s) => (
                  <Link key={s.slug} to={`/recherche?country=${code}&specialty=${s.slug}`} className="specialty-tile">
                    <span className="ico">
                      <Icon name={s.icon} size={22} />
                    </span>
                    <span>
                      {specialtyName(s)}
                      <small>{tn("country.practitioners", s.practitionerCount)}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="section" style={{ paddingTop: 0 }}>
            <div className="container">
              <div className="section-head">
                <div>
                  <h2 className="section-title">
                    <Trans text={t("country.byRegion")} values={{ accent: <span className="accent">{t("country.byRegionAccent")}</span> }} />
                  </h2>
                  <p className="section-sub">{t("country.byRegionSub")}</p>
                </div>
              </div>
              <RegionList key={code} country={code} regions={regions} />
              <p className="muted small row" style={{ marginTop: 14 }}>
                <Icon name="info" size={14} /> {t("country.adminNote")}
              </p>
            </div>
          </section>
        </>
      )}
    </>
  );
}
