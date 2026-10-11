import { getLang, intlLocale, translate, translateOr } from "./i18n";

/** Les dates "YYYY-MM-DD" sont des dates locales du pays : on les lit sans conversion de fuseau. */
function utcDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Formatage dans la langue choisie, en UTC pour que la date affichée reste celle du pays. */
function formatDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale(), { timeZone: "UTC", ...options }).format(date);
}

export function dayShort(date: string) {
  return formatDate(utcDate(date), { weekday: "short" });
}

export function dayMonth(date: string) {
  return formatDate(utcDate(date), { day: "numeric", month: "short" });
}

export function monthShort(date: string) {
  return formatDate(utcDate(date), { month: "short" });
}

export function longDate(date: string) {
  return formatDate(utcDate(date), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** Date sans jour de la semaine ("12 octobre 2026"). */
export function fullDate(date: string) {
  return formatDate(utcDate(date), { day: "numeric", month: "long", year: "numeric" });
}

export function relativeDay(date: string, today: string) {
  if (date === today) return translate("date.today");
  const [y, m, d] = today.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  if (date === tomorrow) return translate("date.tomorrow");
  return translate("date.on", { date: `${dayShort(date)} ${dayMonth(date)}` });
}

/** Date du jour dans le fuseau du pays (Africa/Niamey est en UTC+1, Bamako et Ouagadougou en UTC+0). */
export function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function fcfa(amount: number) {
  return `${amount.toLocaleString(intlLocale()).replace(/\s/g, " ")} FCFA`;
}

/** "08h30" en français, "08:30" ailleurs. */
export function hour(time: string) {
  return getLang() === "fr" ? time.replace(":", "h") : time;
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/** Nom du jour, de 1 (lundi) à 7 (dimanche). Le 1er janvier 2024 était un lundi. */
export function weekdayName(day: number) {
  const name = formatDate(new Date(Date.UTC(2024, 0, day)), { weekday: "long" });
  return name.charAt(0).toLocaleUpperCase(intlLocale()) + name.slice(1);
}

export function statusLabel(status: string) {
  return translateOr(`status.${status}`, status);
}

/** Date courte à partir d'un instant ISO. */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(intlLocale(), { day: "numeric", month: "long", year: "numeric" });
}

/** Libellés venant de l'API en français : traduits côté application quand leur code est connu. */
export function specialtyName(s: { slug: string; name: string }) {
  return translateOr(`specialty.${s.slug}`, s.name);
}

export function specialtyList(list: { slug: string; name: string }[]) {
  return list.map(specialtyName).join(", ");
}

export function languageName(l: { code: string; name: string }) {
  return translateOr(`language.${l.code}`, l.name);
}

export function insuranceName(name: string) {
  return translateOr(`insurance.${name}`, name);
}

export function facilityTypeLabel(f: { type: string; typeLabel: string }) {
  return translateOr(`facility.${f.type}`, f.typeLabel);
}

export function planName(plan: { code: string; name: string }) {
  return translateOr(`plan.${plan.code}`, plan.name);
}

export function relationLabel(relation: string) {
  return translateOr(`relation.${relation}`, relation);
}
