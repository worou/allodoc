import { Link } from "react-router";
import { Flag, FLAG_STRIPES } from "../components/Flag";
import { Icon } from "../components/Icon";
import { HeroSun } from "../components/Logo";
import { SearchBar } from "../components/SearchBar";
import { COUNTRY_PATHS } from "../lib/api";
import { useRegions, useSpecialties, useTitle } from "../lib/hooks";
import type { CountryCode } from "../lib/types";

const COUNTRIES: { code: CountryCode; name: string; capital: string; regions: string }[] = [
  { code: "ML", name: "Mali", capital: "Bamako", regions: "19 régions et le district de Bamako" },
  { code: "BF", name: "Burkina Faso", capital: "Ouagadougou", regions: "17 régions" },
  { code: "NE", name: "Niger", capital: "Niamey", regions: "7 régions et Niamey" },
];

const POPULAR = ["medecine-generale", "pediatrie", "gynecologie", "dentiste", "ophtalmologie", "cardiologie"];

export default function Home() {
  useTitle("");
  const specialties = useSpecialties();
  const regions = useRegions();
  const popular = POPULAR.map((slug) => specialties.find((s) => s.slug === slug)).filter((s) => s !== undefined);

  return (
    <>
      <section className="hero">
        <HeroSun />
        <div className="container">
          <h1>
            Votre rendez-vous chez le médecin, <em>sans file d&apos;attente</em>.
          </h1>
          <p className="lead">
            Trouvez un praticien vérifié au Mali, au Burkina Faso ou au Niger, choisissez un horaire libre et recevez la confirmation par SMS.
          </p>
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
                Choisissez votre <span className="accent">pays</span>
              </h2>
              <p className="section-sub">Retrouvez les praticiens de chaque région, de la capitale aux villes de l&apos;intérieur.</p>
            </div>
          </div>
          <div className="country-grid">
            {COUNTRIES.map((c) => (
              <Link key={c.code} to={`/${COUNTRY_PATHS[c.code]}`} className="card country-card">
                <div className="stripe" style={{ background: FLAG_STRIPES[c.code] }} />
                <div className="body">
                  <Flag code={c.code} width={60} />
                  <div>
                    <h3>{c.name}</h3>
                    <p className="muted small">
                      {c.capital} · {c.regions}
                    </p>
                  </div>
                </div>
                <span className="cta">
                  Voir les praticiens <Icon name="chevronRight" />
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
              <h2 className="section-title">Spécialités</h2>
              <p className="section-sub">Des soins de premier recours aux spécialistes.</p>
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
            Comment ça <span className="accent">marche</span> ?
          </h2>
          <div className="steps">
            <div className="card step">
              <h3>Cherchez</h3>
              <p>Par spécialité, nom du médecin ou clinique, dans votre région.</p>
            </div>
            <div className="card step">
              <h3>Choisissez un horaire</h3>
              <p>Les créneaux libres s&apos;affichent en temps réel, jour par jour.</p>
            </div>
            <div className="card step">
              <h3>Confirmez par SMS</h3>
              <p>Un code par SMS suffit, sans mot de passe. Vous pouvez réserver pour un enfant ou un proche.</p>
            </div>
            <div className="card step">
              <h3>Recevez un rappel</h3>
              <p>Un SMS vous rappelle le rendez-vous la veille. Empêché ? Annulez en un clic.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pro-banner">
            <div>
              <h2>Vous êtes médecin, sage-femme ou clinique ?</h2>
              <p style={{ marginTop: 8, opacity: 0.92 }}>
                Gérez votre agenda, réduisez les absences grâce aux rappels SMS et faites-vous connaître des patients de votre région. Gratuit pendant le lancement.
              </p>
            </div>
            <Link to="/pro" className="btn">
              Découvrir l&apos;espace praticien
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
