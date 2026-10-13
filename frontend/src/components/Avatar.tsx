import { initials } from "../lib/format";

const TONES = ["#113526", "#c23b20", "#1e8449", "#8a5d00", "#1f6fae", "#7b4aa0"];

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
