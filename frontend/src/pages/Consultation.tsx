import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../components/AuthProvider";
import { Icon } from "../components/Icon";
import { ErrorState, Loading, LoginRequired } from "../components/States";
import { useNow } from "../components/VideoJoin";
import { useApi, useTitle } from "../lib/hooks";
import { useI18n } from "../lib/i18n";

interface VideoAccess {
  open: boolean;
  domain: string;
  room: string | null;
  displayName: string;
  subject: string;
  opensAt: string;
  closesAt: string;
  startsAt: string;
  role: "patient" | "practitioner";
  status: string;
  practitioner: string;
}

/** Adresse de l'appel Jitsi : nom affiché prérempli, page de vérification caméra/micro, audio seul si demandé. */
function callUrl(v: VideoAccess, audioOnly: boolean) {
  const options: Record<string, string | boolean | number> = {
    "userInfo.displayName": v.displayName,
    "config.subject": v.subject,
    "config.prejoinPageEnabled": true,
    "config.disableDeepLinking": true,
    "config.resolution": 360,
    "config.startAudioOnly": audioOnly,
    "config.startWithVideoMuted": audioOnly,
  };
  const hash = Object.entries(options)
    .map(([k, value]) => `${k}=${encodeURIComponent(JSON.stringify(value))}`)
    .join("&");
  return `https://${v.domain}/${v.room}#${hash}`;
}

function remaining(ms: number) {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}` : `${minutes} min`;
}

/**
 * Salle d'attente de la téléconsultation. L'appel vidéo s'ouvre dans un nouvel onglet (serveur Jitsi) :
 * plus fiable sur téléphone qu'une vidéo intégrée, et sans compte à créer.
 */
export default function Consultation() {
  const { t } = useI18n();
  useTitle(t("video.title"));
  const { id = "" } = useParams();
  const { user, ready } = useAuth();
  const now = useNow(15_000);
  const { data, error, loading, reload } = useApi<VideoAccess>(user ? `/api/appointments/${id}/video` : null);
  const [audioOnly, setAudioOnly] = useState(false);

  // Rechargement automatique à l'heure d'ouverture de la salle.
  useEffect(() => {
    if (!data || data.open) return;
    const wait = new Date(data.opensAt).getTime() - Date.now();
    if (wait > 0 && wait < 6 * 3600_000) {
      const timer = window.setTimeout(reload, wait + 1000);
      return () => window.clearTimeout(timer);
    }
  }, [data, reload]);

  if (!ready) return <Loading />;
  if (!user) return <LoginRequired next={`/consultation/${id}`} />;
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error?.message ?? t("video.notFound")} onRetry={reload} />;

  const back = data.role === "practitioner" ? "/pro" : "/compte";
  const opensIn = new Date(data.opensAt).getTime() - now;
  const ended = now > new Date(data.closesAt).getTime() || data.status !== "confirmed";

  return (
    <div className="funnel" style={{ maxWidth: 720 }}>
      <section className="card video-room">
        <div className="video-room-head">
          <span className="video-icon">
            <Icon name="video" size={28} />
          </span>
          <div>
            <h1>{t("video.title")}</h1>
            <p className="muted">
              {data.role === "patient" ? t("video.withPractitioner", { name: data.practitioner }) : t("video.withPatient", { name: data.displayName })}
            </p>
          </div>
        </div>

        {ended ? (
          <p className="alert alert-info">{t("video.ended")}</p>
        ) : data.open && data.room ? (
          <>
            <p className="alert alert-ok">{t("video.ready")}</p>
            <a className="btn btn-primary btn-block video-cta" href={callUrl(data, audioOnly)} target="_blank" rel="noopener noreferrer">
              <Icon name="video" size={20} /> {audioOnly ? t("video.joinAudio") : t("video.join")}
            </a>
            <label className="choice" style={{ marginTop: 10 }}>
              <input type="checkbox" checked={audioOnly} onChange={(e) => setAudioOnly(e.target.checked)} />
              <span>
                <b>{t("video.audioOnly")}</b>
                <br />
                <span className="small muted">{t("video.audioOnlyHint")}</span>
              </span>
            </label>
          </>
        ) : (
          <div className="video-wait">
            <p className="video-countdown">{t("video.opensIn", { time: remaining(opensIn) })}</p>
            <p className="muted small">{t("video.waitHint")}</p>
          </div>
        )}

        <h2 className="form-section" style={{ marginTop: 22 }}>{t("video.checklistTitle")}</h2>
        <ul className="video-checklist">
          <li>
            <Icon name="check" size={16} /> {t("video.check1")}
          </li>
          <li>
            <Icon name="check" size={16} /> {t("video.check2")}
          </li>
          <li>
            <Icon name="check" size={16} /> {t("video.check3")}
          </li>
          <li>
            <Icon name="check" size={16} /> {data.role === "patient" ? t("video.check4Patient") : t("video.check4Practitioner")}
          </li>
        </ul>
        <p className="muted small video-privacy">
          <Icon name="shield" size={16} /> <span>{t("video.privacy")}</span>
        </p>
        <Link to={back} className="btn btn-ghost" style={{ marginTop: 10 }}>
          {t("video.back")}
        </Link>
      </section>
    </div>
  );
}
