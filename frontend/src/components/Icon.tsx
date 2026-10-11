/** Icônes au trait (24×24), dessinées pour rester lisibles en petite taille et légères. */
const PATHS: Record<string, string> = {
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.3-4.3",
  pin: "M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  calendar: "M4 6h16v14H4zM4 10h16M9 3v4M15 3v4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  chevronDown: "m6 9 6 6 6-6",
  check: "m5 12 5 5 9-10",
  x: "M6 6l12 12M18 6 6 18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 20a6 6 0 0 0-3-5.2",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  video: "M3 7h12v10H3zM15 10l6-3v10l-6-3",
  money: "M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 10v4M18 10v4",
  language: "M4 5h9M8.5 3v2M6 5c.5 3 2.5 6 6 8M11 5c-.5 3-2.5 6-6 8M13 21l4-10 4 10M14.5 17h5",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z M9 12l2 2 4-4",
  building: "M4 21V5l8-2v18M12 8h8v13M8 8h.01M8 12h.01M8 16h.01M16 12h.01M16 16h.01M2 21h20",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  stethoscope: "M6 3v6a4 4 0 0 0 8 0V3M10 13v2a5 5 0 0 0 10 0v-2M20 11a2 2 0 1 0 0 .01M4 3h4M12 3h4",
  child: "M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 22l1-8-3-3 3-2h6l3 2-3 3 1 8M10 22v-4h4v4",
  female: "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 0v8m-3-3h6",
  baby: "M12 5a3 3 0 1 0 0-.01M7 21c0-4 2-7 5-7s5 3 5 7M9 10h6M5 13l3-2M19 13l-3-2",
  skin: "M7 3c-2 3-2 6 0 9s2 6 0 9M17 3c2 3 2 6 0 9s-2 6 0 9M11 8h2M11 12h2M11 16h2",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  tooth: "M7 3c-2.5 0-4 2-3.5 5 .4 2.4 1.5 3.8 1.8 6.5.3 3 1 6.5 2.7 6.5 1.6 0 1.5-5 4-5s2.4 5 4 5c1.7 0 2.4-3.5 2.7-6.5.3-2.7 1.4-4.1 1.8-6.5.5-3-1-5-3.5-5-2 0-3 1-5 1S9 3 7 3z",
  ear: "M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0M10 9a2 2 0 0 1 4 0",
  brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  bone: "M8 6a2.5 2.5 0 1 0-3 3l9.5 9.5a2.5 2.5 0 1 0 3-3L8 6zM16 6a2.5 2.5 0 0 1 3 3M5 15a2.5 2.5 0 0 0 3 3",
  kidney: "M9 4C5 4 4 8 4 12s1 8 5 8c3 0 3-3 3-5s-2-2-2-3 2-1 2-3-1-5-3-5zM15 4c4 0 5 4 5 8s-1 8-5 8",
  lungs: "M12 4v8M12 12c-1 0-2 1-3 1M12 12c1 0 2 1 3 1M8 7c-3 1-5 5-5 10 0 2 2 3 4 3s2-2 2-4V8M16 7c3 1 5 5 5 10 0 2-2 3-4 3s-2-2-2-4V8",
  stomach: "M9 3v4c0 2-4 3-4 8 0 4 3 6 7 6s7-3 7-6c0-3-2-4-4-4s-3 2-5 2",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5m0-8h.01",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  wifiOff: "M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14 10.3A10 10 0 0 1 19 13M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5a15 15 0 0 1 11.3 3.8M12 20h.01",
  plus: "M12 5v14M5 12h14",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  smartphone: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2M12 6v7m-3-3 3 3 3-3",
  crown: "M3 18h18M4 16 3 7l5 4 4-6 4 6 5-4-1 9z",
  edit: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
};

/** Flèches retournées en arabe (lecture de droite à gauche). */
const DIRECTIONAL = new Set(["chevronLeft", "chevronRight"]);

export function Icon({ name, size = 20, className, strokeWidth = 2 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const classes = [className, DIRECTIONAL.has(name) ? "flip-rtl" : null].filter(Boolean).join(" ") || undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={classes} aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.stethoscope} />
    </svg>
  );
}
