const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const DAYS_LONG = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Les dates "YYYY-MM-DD" sont des dates locales du pays : on les lit sans conversion de fuseau. */
function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

export function dayShort(date: string) {
  return DAYS[parts(date).dow];
}

export function dayMonth(date: string) {
  const { m, d } = parts(date);
  return `${d} ${MONTHS[m - 1]}`;
}

export function longDate(date: string) {
  const { y, m, d, dow } = parts(date);
  return `${DAYS_LONG[dow]} ${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

export function relativeDay(date: string, today: string) {
  if (date === today) return "aujourd'hui";
  const t = parts(today);
  const tomorrow = new Date(Date.UTC(t.y, t.m - 1, t.d + 1)).toISOString().slice(0, 10);
  if (date === tomorrow) return "demain";
  return `le ${dayShort(date)} ${dayMonth(date)}`;
}

/** Date du jour dans le fuseau du pays (Africa/Niamey est en UTC+1, Bamako et Ouagadougou en UTC+0). */
export function todayIn(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function fcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;
}

export function hour(time: string) {
  return time.replace(":", "h");
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export const WEEKDAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmé",
  cancelled: "Annulé",
  honored: "Honoré",
  no_show: "Absent",
};

/** Date courte à partir d'un instant ISO (affichage en français). */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
