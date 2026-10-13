import { Link } from "react-router";
import { useState } from "react";
import { api } from "../lib/api";
import { dayMonth, dayShort, hour, relativeDay } from "../lib/format";
import { useI18n } from "../lib/i18n";
import type { SlotDay } from "../lib/types";
import { Icon } from "./Icon";

interface Props {
  slug: string;
  initialDays: SlotDay[];
  next?: { date: string; time: string; start: string } | null;
  /** Nombre de jours affichés côte à côte. */
  columns?: number;
  /** Lien de réservation : par défaut le tunnel /rdv. En mode report, on passe l'identifiant du RDV à déplacer. */
  reschedule?: string;
  today: string;
}

const VISIBLE_ROWS = 4;

/** Grille de créneaux par jour, façon agenda : navigation par semaine et dépliage des horaires. */
export function SlotGrid({ slug, initialDays, next, columns = 5, reschedule, today }: Props) {
  const { t } = useI18n();
  const [days, setDays] = useState(initialDays);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const visible = days.slice(0, columns);
  const first = visible[0]?.date ?? today;
  const maxRows = Math.max(0, ...visible.map((d) => d.slots.length));
  const rows = expanded ? maxRows : Math.min(maxRows, VISIBLE_ROWS);
  const isEmpty = maxRows === 0;

  async function shift(delta: number) {
    const [y, m, d] = first.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
    if (from < today) return;
    await load(from);
  }

  async function load(from: string) {
    setLoading(true);
    setError(false);
    try {
      const res = await api<{ days: SlotDay[] }>(`/api/practitioners/${slug}/slots?from=${from}&days=${columns}`, { auth: false });
      setDays(res.days);
      setExpanded(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const href = (start: string) =>
    `/rdv/${slug}?start=${encodeURIComponent(start)}${reschedule ? `&reschedule=${reschedule}` : ""}`;

  return (
    <div aria-busy={loading} style={{ opacity: loading ? 0.6 : 1 }}>
      <div className="slot-grid" style={{ "--cols": columns } as React.CSSProperties}>
        <button type="button" className="slot-nav" onClick={() => shift(-columns)} disabled={first <= today || loading} aria-label={t("slots.previous")}>
          <Icon name="chevronLeft" size={16} />
        </button>
        {visible.map((day) => (
          <div className="slot-col" key={day.date}>
            <div className="slot-day">
              <b>{day.date === today ? t("date.todayShort") : dayShort(day.date)}</b>
              <span>{dayMonth(day.date)}</span>
            </div>
            {!isEmpty &&
              Array.from({ length: rows }, (_, i) => {
                const slot = day.slots[i];
                return slot ? (
                  <Link key={slot.start} to={href(slot.start)} className="slot" aria-label={t("slots.bookAt", { date: `${dayShort(day.date)} ${dayMonth(day.date)}`, time: hour(slot.time) })}>
                    {slot.time}
                  </Link>
                ) : (
                  <span key={i} className="slot is-empty" aria-hidden="true">
                    –
                  </span>
                );
              })}
          </div>
        ))}
        <button type="button" className="slot-nav" onClick={() => shift(columns)} disabled={loading} aria-label={t("slots.next")}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      {error && <p className="alert alert-error small" style={{ marginTop: 10 }}>{t("slots.loadError")}</p>}

      {isEmpty && (
        <div className="slot-next">
          {next && next.date > (visible[visible.length - 1]?.date ?? today) ? (
            <>
              <span>
                {t("slots.nextAppointment")} <b>{relativeDay(next.date, today)}</b>
              </span>
              <button type="button" className="btn btn-sm btn-indigo" onClick={() => load(next.date)}>
                {t("slots.seeTimes")}
              </button>
            </>
          ) : (
            <span className="muted">{t("slots.none")}</span>
          )}
        </div>
      )}

      {!isEmpty && maxRows > VISIBLE_ROWS && (
        <div className="slot-more">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t("slots.less") : t("slots.more")}
            <Icon name="chevronDown" size={16} className={expanded ? "rot" : undefined} />
          </button>
        </div>
      )}
    </div>
  );
}
