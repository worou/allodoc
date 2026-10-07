import { Link, useParams, useSearchParams } from "react-router";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { SlotGrid } from "../components/SlotGrid";
import { ErrorState, Loading } from "../components/States";
import { COUNTRY_PATHS } from "../lib/api";
import { fcfa, todayIn, WEEKDAYS } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import type { PractitionerDetail, SlotDay } from "../lib/types";

export default function Practitioner() {
  const { slug = "" } = useParams();
  const reschedule = useSearchParams()[0].get("reschedule") ?? undefined;
  const { data: p, error, loading, reload } = useApi<PractitionerDetail>(`/api/practitioners/${slug}`, { auth: false });
  const slots = useApi<{ days: SlotDay[] }>(`/api/practitioners/${slug}/slots?days=4`, { auth: false });
  useTitle(p ? `${p.fullName}, ${p.specialties.map((s) => s.name).join(", ")}` : "Praticien");

  if (loading) return <Loading />;
  if (error || !p) return <ErrorState message={error?.message ?? "Praticien introuvable."} onRetry={reload} />;

  const facility = p.facility;
  const today = todayIn(facility?.timezone ?? "Africa/Bamako");
  const hoursByDay = new Map<number, string[]>();
  for (const h of p.openingHours) {
    hoursByDay.set(h.dayOfWeek, [...(hoursByDay.get(h.dayOfWeek) ?? []), `${h.start.replace(":", "h")} – ${h.end.replace(":", "h")}`]);
  }
  const mapUrl = facility?.latitude ? `https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=16/${facility.latitude}/${facility.longitude}` : null;

  return (
    <>
      <section className="profile-hero">
        <div className="container">
          {facility && (
            <nav className="crumbs" aria-label="Fil d'Ariane">
              <Link to={`/${COUNTRY_PATHS[facility.country.code]}`}>{facility.country.name}</Link> ›{" "}
              <Link to={`/recherche?country=${facility.country.code}&region=${facility.region.slug}`}>{facility.region.name}</Link> ›{" "}
              <Link to={`/recherche?country=${facility.country.code}&specialty=${p.specialties[0]?.slug ?? ""}`}>{p.specialties[0]?.name}</Link>
            </nav>
          )}
          <div className="profile-id">
            <Avatar firstName={p.firstName} lastName={p.lastName} photoUrl={p.photoUrl} size={96} />
            <div>
              <h1>{p.fullName}</h1>
              <p className="spec">{p.specialties.map((s) => s.name).join(", ")}</p>
              <div className="row" style={{ marginTop: 8 }}>
                {p.verified && (
                  <span className="tag tag-green">
                    <Icon name="check" size={13} /> Inscription à l&apos;ordre vérifiée
                  </span>
                )}
                {p.teleconsultation && (
                  <span className="tag tag-ochre">
                    <Icon name="video" size={13} /> Téléconsultation
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container profile-layout">
        <div className="profile-main">
          {reschedule && (
            <p className="alert alert-warn">
              <Icon name="calendar" /> Choisissez le nouveau créneau : votre rendez-vous actuel sera remplacé.
            </p>
          )}
          <section className="card panel">
            <h2>
              <Icon name="pin" /> Lieu de consultation
            </h2>
            {p.facilities.map((f) => (
              <div key={f.id} className="info-list" style={{ marginBottom: 12 }}>
                <div>
                  <Icon name="building" size={18} />
                  <span>
                    <b>{f.name}</b> <span className="tag">{f.typeLabel}</span>
                    <br />
                    {f.address}
                  </span>
                </div>
                {f.phone && (
                  <div>
                    <Icon name="phone" size={18} />
                    <a href={`tel:${f.phone.replace(/\s/g, "")}`}>{f.phone}</a>
                  </div>
                )}
              </div>
            ))}
            {mapUrl && (
              <a className="map-link" href={mapUrl} target="_blank" rel="noreferrer">
                <span className="map-pin">
                  <Icon name="pin" size={40} strokeWidth={2.4} />
                </span>
                <span className="map-label">Voir sur la carte ↗</span>
              </a>
            )}
          </section>

          <section className="card panel">
            <h2>
              <Icon name="money" /> Tarifs et remboursement
            </h2>
            <div className="info-list">
              <div>
                <Icon name="check" size={18} />
                <span>
                  Consultation : <b>{fcfa(p.fee)}</b>, à régler sur place
                </span>
              </div>
              {p.insurances.length > 0 && (
                <div>
                  <Icon name="shield" size={18} />
                  <span>Assurances acceptées : {p.insurances.join(", ")}</span>
                </div>
              )}
            </div>
          </section>

          <section className="card panel">
            <h2>
              <Icon name="user" /> Présentation
            </h2>
            {p.bio && <p style={{ marginBottom: 14 }}>{p.bio}</p>}
            <div className="info-list">
              <div>
                <Icon name="language" size={18} />
                <span>Langues parlées : {p.languages.map((l) => l.name).join(", ")}</span>
              </div>
              {p.degrees.map((d) => (
                <div key={d}>
                  <Icon name="star" size={18} />
                  <span>{d}</span>
                </div>
              ))}
              <div>
                <Icon name="shield" size={18} />
                <span className="muted">N° d&apos;ordre : {p.orderNumber}</span>
              </div>
            </div>
          </section>

          <section className="card panel">
            <h2>
              <Icon name="clock" /> Horaires de consultation
            </h2>
            <table className="hours">
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <tr key={d}>
                    <td>{WEEKDAYS[d]}</td>
                    <td>{hoursByDay.get(d)?.join(" · ") ?? "Fermé"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="card booking-panel" aria-label="Prendre rendez-vous">
          <div className="head">
            <h2>{reschedule ? "Déplacer mon rendez-vous" : "Prendre rendez-vous"}</h2>
            <p className="small" style={{ opacity: 0.9 }}>
              Choisissez un horaire, confirmation immédiate par SMS
            </p>
          </div>
          <div className="body">
            {slots.data ? (
              <SlotGrid slug={p.slug} initialDays={slots.data.days} columns={4} reschedule={reschedule} today={today} />
            ) : slots.error ? (
              <p className="alert alert-error">Horaires indisponibles. Réessayez dans un instant.</p>
            ) : (
              <div className="skeleton" style={{ height: 180 }} />
            )}
            {!p.acceptsNewPatients && <p className="alert alert-warn small" style={{ marginTop: 12 }}>Ce praticien ne prend plus de nouveaux patients.</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
