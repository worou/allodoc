import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { LogoMark } from "../components/Logo";
import { QrCode } from "../components/QrCode";
import { useTitle } from "../lib/hooks";
import { Trans, useI18n, type MessageKey } from "../lib/i18n";
import { APK_URL, type Platform, useInstall } from "../lib/install";

const PATIENT: [string, MessageKey][] = [
  ["search", "app.patient1"],
  ["calendar", "app.patient2"],
  ["phone", "app.patient3"],
  ["wifiOff", "app.patient4"],
];

const PRACTITIONER: [string, MessageKey][] = [
  ["calendar", "app.pro1"],
  ["check", "app.pro2"],
  ["crown", "app.pro3"],
  ["users", "app.pro4"],
];

/** Aperçu de l'application dessiné en CSS (aucune image à télécharger). */
function PhoneMock({ variant }: { variant: "patient" | "pro" }) {
  const { t } = useI18n();
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
              <Icon name="search" size={12} /> {t("app.mockSearch")}
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
            <div className="phone-day">{t("app.mockDay")}</div>
            {[
              ["08:00", "Awa T."],
              ["08:20", "Moussa K."],
              ["09:00", "Hawa S."],
            ].map(([time, n]) => (
              <div key={time} className="phone-row">
                <b>{time}</b> {n}
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
  const { t } = useI18n();
  if (platform === "ios") {
    return (
      <ol className="install-steps">
        <li>
          <Trans text={t("app.iosStep1")} values={{ app: <b>allodoc</b>, browser: <b>Safari</b> }} />
        </li>
        <li>
          <Trans text={t("app.iosStep2")} values={{ share: <b>{t("app.iosShare")}</b>, icon: <span className="kbd">⬆︎</span> }} />
        </li>
        <li>
          <Trans text={t("app.iosStep3")} values={{ option: <b>{t("app.iosOption")}</b>, add: <b>{t("app.iosAdd")}</b> }} />
        </li>
      </ol>
    );
  }
  return (
    <ol className="install-steps">
      <li>
        <Trans text={t("app.androidStep1")} values={{ app: <b>allodoc</b>, browser: <b>Chrome</b> }} />
      </li>
      <li>
        <Trans text={t("app.androidStep2")} values={{ icon: <span className="kbd">⋮</span> }} />
      </li>
      <li>
        <Trans text={t("app.androidStep3")} values={{ install: <b>{t("app.androidInstall")}</b>, add: <b>{t("app.androidAdd")}</b> }} />
      </li>
    </ol>
  );
}

export default function AppDownload() {
  const { t } = useI18n();
  useTitle(t("app.title"));
  const install = useInstall();
  const [tab, setTab] = useState<Platform>(install.platform === "desktop" ? "android" : install.platform);
  const [result, setResult] = useState<MessageKey | null>(null);
  const siteUrl = `${window.location.origin}/application`;

  async function onInstall() {
    const accepted = await install.install();
    setResult(accepted ? "app.installStarted" : "app.installCancelled");
  }

  return (
    <>
      <section className="hero app-hero">
        <div className="container app-hero-grid">
          <div>
            <span className="tag" style={{ background: "rgb(255 255 255 / 12%)", color: "#fff" }}>
              <Icon name="smartphone" size={13} /> {t("app.badge")}
            </span>
            <h1 style={{ marginTop: 14 }}>
              <Trans text={t("app.heroTitle")} values={{ em: <em>{t("app.heroTitleEm")}</em> }} />
            </h1>
            <p className="lead">{t("app.heroLead")}</p>

            <div className="install-box">
              {install.standalone ? (
                <p className="alert alert-ok">
                  <Icon name="check" /> {t("app.alreadyInstalled")}
                </p>
              ) : install.canPrompt ? (
                <button type="button" className="btn btn-primary install-btn" onClick={onInstall}>
                  <Icon name="plus" size={20} /> {t("app.install")}
                </button>
              ) : install.platform === "desktop" ? (
                <div className="qr-box">
                  <QrCode value={siteUrl} />
                  <div>
                    <b>{t("app.scan")}</b>
                    <p className="small" style={{ opacity: 0.85 }}>
                      {t("app.scanHint")}
                    </p>
                  </div>
                </div>
              ) : (
                <a href="#installer" className="btn btn-primary install-btn">
                  <Icon name="smartphone" size={20} /> {t("app.installOnPhone")}
                </a>
              )}
              {APK_URL && !install.standalone && (
                <a className="btn btn-outline install-apk" href={APK_URL} download>
                  <Icon name="chevronDown" size={18} /> {t("app.downloadApk")}
                </a>
              )}
              {result && <p className="alert alert-info small">{t(result)}</p>}
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
            <span className="audience-tag">{t("app.patient")}</span>
            <h2>{t("app.patientTitle")}</h2>
            <ul className="feature-list">
              {PATIENT.map(([icon, key]) => (
                <li key={key}>
                  <Icon name={icon} size={18} /> {t(key)}
                </li>
              ))}
            </ul>
            <Link to="/recherche" className="btn btn-outline btn-sm">
              {t("common.findPractitioner")}
            </Link>
          </article>
          <article className="card panel audience pro">
            <span className="audience-tag">{t("app.practitioner")}</span>
            <h2>{t("app.practitionerTitle")}</h2>
            <ul className="feature-list">
              {PRACTITIONER.map(([icon, key]) => (
                <li key={key}>
                  <Icon name={icon} size={18} /> {t(key)}
                </li>
              ))}
            </ul>
            <p className="small muted">{t("app.practitionerHint")}</p>
            <Link to="/pro" className="btn btn-outline btn-sm">
              {t("footer.practitionerArea")}
            </Link>
          </article>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 760 }} id="installer">
          <h2 className="section-title" style={{ marginBottom: 16 }}>
            <Trans text={t("app.stepByStep")} values={{ accent: <span className="accent">{t("app.stepByStepAccent")}</span> }} />
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
              {t("app.noStore")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
