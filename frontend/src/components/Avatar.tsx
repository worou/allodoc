import { initials } from "../lib/format";

const TONES = ["#1c1f57", "#c2502a", "#1d7a4c", "#8a5d00", "#5b2a6e", "#a03f1f"];

/** Avatar à initiales sur motif bogolan : pas de photo à télécharger, la page reste légère. */
export function Avatar({ firstName, lastName, photoUrl, size = 64 }: { firstName: string; lastName: string; photoUrl?: string | null; size?: number }) {
  const tone = TONES[(firstName.charCodeAt(0) + lastName.charCodeAt(0)) % TONES.length];
  if (photoUrl) {
    return <img src={photoUrl} alt="" width={size} height={size} className="avatar" loading="lazy" style={{ objectFit: "cover" }} />;
  }
  return (
    <div className="avatar" style={{ width: size, height: size, background: tone, fontSize: size * 0.36 }} aria-hidden="true">
      <span>{initials(firstName, lastName)}</span>
    </div>
  );
}
