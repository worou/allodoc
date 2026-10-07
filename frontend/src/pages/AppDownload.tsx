import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { LogoMark } from "../components/Logo";
import { QrCode } from "../components/QrCode";
import { useTitle } from "../lib/hooks";
import { APK_URL, type Platform, useInstall } from "../lib/install";

const PATIENT = [
  ["search", "Trouver un médecin, un pédiatre ou une sage-femme près de chez vous"],
  ["calendar", "Réserver en quelques secondes, pour vous ou pour un proche"],
  ["phone", "Confirmation et rappel par SMS, même sans internet"],
  ["wifiOff", "Vos rendez-vous et les fiches consultées restent lisibles hors connexion"],
];

const PRACTITIONER = [
  ["calendar", "Votre agenda de la semaine dans la poche"],
  ["check", "Marquer un patient honoré ou absent en un geste"],
  ["crown", "Suivre et renouveler votre abonnement"],
  ["users", "Coordonnées des patients à portée de main pour les rappeler"],
];

/** Aperçu de l'application dessiné en CSS (aucune image à télécharger). */
function PhoneMock({ variant }: { variant: "patient" | "pro" }) {
  return (
    <div className="phone-mock" aria-hidden="true">
      <div className="phone-screen">
        <div className="phone-bar">
          <LogoMark size={18} /> <b>AlloDoc</b>
        </div>
        <div className="kente-band" style={{ height: 4 }} />
        {variant === "patient" ? (
          <div className="phone-body">
            <div className="phone-search">
              <Icon name="search" size={12} /> Pédiatre, Bamako
            </div>
            {["Dr A. Traoré", "Dr F. Diallo"].map((n) => (
              <div key={n} className="phone-card">
                <span className="phone-avatar" />
                <div>
                  <b>{n}</b>
                  <div className="phone-slots">
                    <span>08:30</span>
                    <span>09:00</span>
                    <span>10:30</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="phone-body">
            <div className="phone-day">Jeudi 8 octobre</div>
            {[
              ["08:00", "Awa T."],
              ["08:20", "Moussa K."],
              ["09:00", "Hawa S."],
            ].map(([t, n]) => (
              <div key={t} className="phone-row">
                <b>{t}</b> {n}
                <span className="phone-ok">
                  <Icon name="check" size={10} />
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="phone-nav">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function Steps({ platform }: { platform: Platform }) {
  if (platform === "ios") {
    return (
      <ol className="install-steps">
        <li>
          Ouvrez <b>allodoc</b> dans <b>Safari</b>.
        </li>
        <li>
          Touchez le bouton <b>Partager</b> <span className="kbd">⬆︎</span> en bas de l&apos;écran.
        </li>
        <li>
          Choisissez <b>« Sur l&apos;écran d&apos;accueil »</b>, puis <b>Ajouter</b>.
        </li>
      </ol>
    );
  }
  return (
    <ol className="install-steps">
      <li>
        Ouvrez <b>allodoc</b> dans <b>Chrome</b> (ou le navigateur de votre téléphone).
      </li>
      <li>
        Touchez le menu <span className="kbd">⋮</span> en haut à droite.
      </li>
      <li>
        Choisissez <b>« Installer l&apos;application »</b> ou <b>« Ajouter à l&apos;écran d&apos;accueil »</b>.
      </li>
    </ol>
  );
}

export default function AppDownload() {
  useTitle("Télécharger l'application");
  const install = useInstall();
  const [tab, setTab] = useState<Platform>(install.platform === "desktop" ? "android" : install.platform);
  const [result, setResult] = useState<string | null>(null);
  const siteUrl = `${window.location.origin}/application`;

  async function onInstall() {
    const accepted = await install.install();
    setResult(accepted ? "Installation lancée : l'icône AlloDoc apparaît sur votre écran d'accueil." : "Installation annulée. Vous pouvez recommencer à tout moment.");
  }

  return (
    <>
      <section className="hero app-hero">
        <div className="container app-hero-grid">
          <div>
            <span className="tag" style={{ background: "rgb(255 255 255 / 12%)", color: "#fff" }}>
              <Icon name="smartphone" size={13} /> Android · iPhone · moins de 1 Mo
            </span>
            <h1 style={{ marginTop: 14 }}>
              AlloDoc <em>dans votre poche</em>
            </h1>
            <p className="lead">Une seule application pour les patients et les soignants. Légère, rapide sur réseau 3G, utilisable hors connexion.</p>

            <div className="install-box">
              {install.standalone ? (
                <p className="alert alert-ok">
                  <Icon name="check" /> Vous utilisez déjà l&apos;application installée.
                </p>
              ) : install.canPrompt ? (
                <button type="button" className="btn btn-primary install-btn" onClick={onInstall}>
                  <Icon name="plus" size={20} /> Installer l&apos;application
                </button>
              ) : install.platform === "desktop" ? (
                <div className="qr-box">
                  <QrCode value={siteUrl} />
                  <div>
                    <b>Scannez avec votre téléphone</b>
                    <p className="small" style={{ opacity: 0.85 }}>
                      Le lien ouvre cette page sur votre mobile, avec le bouton d&apos;installation.
                    </p>
                  </div>
                </div>
              ) : (
                <a href="#installer" className="btn btn-primary install-btn">
                  <Icon name="smartphone" size={20} /> Installer sur mon téléphone
                </a>
              )}
              {APK_URL && !install.standalone && (
                <a className="btn btn-outline install-apk" href={APK_URL} download>
                  <Icon name="chevronDown" size={18} /> Télécharger l&apos;APK Android
                </a>
              )}
              {result && <p className="alert alert-info small">{result}</p>}
            </div>
          </div>
          <div className="app-mocks">
            <PhoneMock variant="patient" />
            <PhoneMock variant="pro" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container audience-grid">
          <article className="card panel audience">
            <span className="audience-tag">Patient</span>
            <h2>Prenez rendez-vous où que vous soyez</h2>
            <ul className="feature-list">
              {PATIENT.map(([icon, text]) => (
                <li key={text}>
                  <Icon name={icon} size={18} /> {text}
                </li>
              ))}
            </ul>
            <Link to="/recherche" className="btn btn-outline btn-sm">
              Trouver un praticien
            </Link>
          </article>
          <article className="card panel audience pro">
            <span className="audience-tag">Praticien</span>
            <h2>Gérez vos consultations depuis votre téléphone</h2>
            <ul className="feature-list">
              {PRACTITIONER.map(([icon, text]) => (
                <li key={text}>
                  <Icon name={icon} size={18} /> {text}
                </li>
              ))}
            </ul>
            <p className="small muted">
              Après installation, connectez-vous avec votre compte praticien : l&apos;application s&apos;ouvre directement sur votre agenda.
            </p>
            <Link to="/pro" className="btn btn-outline btn-sm">
              Espace praticien
            </Link>
          </article>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 760 }} id="installer">
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            Installer <span className="accent">pas à pas</span>
          </h2>
          <div className="segmented" role="tablist" style={{ marginBottom: 14 }}>
            <button type="button" role="tab" aria-selected={tab !== "ios"} onClick={() => setTab("android")}>
              Android
            </button>
            <button type="button" role="tab" aria-selected={tab === "ios"} onClick={() => setTab("ios")}>
              iPhone
            </button>
          </div>
          <div className="card panel">
            <Steps platform={tab} />
            <p className="small muted" style={{ marginTop: 12 }}>
              Aucun compte Play Store ou App Store n&apos;est nécessaire. L&apos;application se met à jour automatiquement et occupe moins de 1 Mo.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
