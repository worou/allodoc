import { Link, useParams } from "react-router";
import { Flag, FLAG_STRIPES } from "../components/Flag";
import { Icon } from "../components/Icon";
import { RegionList } from "../components/RegionList";
import { SearchBar } from "../components/SearchBar";
import { ErrorState, Loading } from "../components/States";
import { COUNTRY_NAMES, countryFromPath } from "../lib/api";
import { useApi, useSpecialties, useTitle } from "../lib/hooks";
import type { CountryOverview } from "../lib/types";
import NotFound from "./NotFound";

export default function Country() {
  const code = countryFromPath(useParams().country ?? "");
  useTitle(code ? `Prendre rendez-vous chez un médecin au ${COUNTRY_NAMES[code]}` : "Page introuvable");
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
                {data.practitionerCount} praticiens vérifiés · {covered} région{covered > 1 ? "s" : ""} couverte{covered > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <h1>
            Trouvez un praticien au <em>{COUNTRY_NAMES[code]}</em>
          </h1>
          <p className="lead">
            De {data?.country.capital ?? "la capitale"} aux chefs-lieux de région : consultez les disponibilités et réservez en ligne.
          </p>
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
                  <h2 className="section-title">Spécialités disponibles</h2>
                  <p className="section-sub">Au {COUNTRY_NAMES[code]}, toutes régions confondues.</p>
                </div>
              </div>
              <div className="specialty-grid">
                {available.map((s) => (
                  <Link key={s.slug} to={`/recherche?country=${code}&specialty=${s.slug}`} className="specialty-tile">
                    <span className="ico">
                      <Icon name={s.icon} size={22} />
                    </span>
                    <span>
                      {s.name}
                      <small>
                        {s.practitionerCount} praticien{s.practitionerCount > 1 ? "s" : ""}
                      </small>
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
                    Praticiens par <span className="accent">région</span>
                  </h2>
                  <p className="section-sub">Ouvrez une région pour voir ses praticiens et leur prochaine disponibilité.</p>
                </div>
              </div>
              <RegionList key={code} country={code} regions={regions} />
              <p className="muted small row" style={{ marginTop: 14 }}>
                <Icon name="info" size={14} /> Découpage administratif en cours de validation avec le ministère de la santé. Les anciens noms de région sont indiqués entre parenthèses.
              </p>
            </div>
          </section>
        </>
      )}
    </>
  );
}
