import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useI18n } from "../lib/i18n";
import type { Appointment } from "../lib/types";
import { Icon } from "./Icon";

/** Heure locale (dans le fuseau du lieu de consultation) d'un instant ISO. */
function localTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(iso)).replace(":", "h");
}

/** Heure courante, rafraîchie toutes les 30 secondes (ouverture de la salle sans recharger la page). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Badge "Vidéo" des rendez-vous en téléconsultation. */
export function VideoBadge() {
  const { t } = useI18n();
  return (
    <span className="tag tag-video">
      <Icon name="video" size={13} /> {t("video.badge")}
    </span>
  );
}

/**
 * Bouton d'accès à la téléconsultation : actif de 15 minutes avant à 1 heure après le créneau ;
 * avant, il indique l'heure d'ouverture et mène à la salle d'attente.
 */
export function VideoJoinButton({ a }: { a: Appointment }) {
  const { t } = useI18n();
  const now = useNow();
  if (!a.video || a.status !== "confirmed" || !a.videoOpensAt || !a.videoClosesAt) return null;
  const opens = new Date(a.videoOpensAt).getTime();
  const closes = new Date(a.videoClosesAt).getTime();
  if (now > closes) return null;
  const open = now >= opens;
  return (
    <Link to={`/consultation/${a.id}`} className={`btn btn-sm ${open ? "btn-primary pulse" : "btn-outline"}`}>
      <Icon name="video" size={16} /> {open ? t("video.join") : t("video.opensAt", { time: localTime(a.videoOpensAt, a.facility.timezone) })}
    </Link>
  );
}
