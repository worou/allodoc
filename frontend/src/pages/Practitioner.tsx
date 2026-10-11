import { Link, useParams, useSearchParams } from "react-router";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { SlotGrid } from "../components/SlotGrid";
import { ErrorState, Loading } from "../components/States";
import { COUNTRY_PATHS, countryName } from "../lib/api";
import { facilityTypeLabel, fcfa, hour, insuranceName, languageName, specialtyList, specialtyName, todayIn, weekdayName } from "../lib/format";
import { useApi, useTitle } from "../lib/hooks";
import { Trans, useI18n } from "../lib/i18n";
import type { PractitionerDetail, SlotDay } from "../lib/types";

export default function Practitioner() {
  const { t } = useI18n();
  const { slug = "" } = useParams();
  const reschedule = useSearchParams()[0].get("reschedule") ?? undefined;
  const { data: p, error, loading, reload } = useApi<PractitionerDetail>(`/api/practitioners/${slug}`, { auth: false });
  const slots = useApi<{ days: SlotDay[] }>(`/api/practitioners/${slug}/slots?days=4`, { auth: false });
  useTitle(p ? `${p.fullName}, ${specialtyList(p.specialties)}` : t("practitioner.title"));

  if (loading) return <Loading />;
  if (error || !p) return <ErrorState message={error?.message ?? t("practitioner.notFound")} onRetry={reload} />;

  const facility = p.facility;
  const today = todayIn(facility?.timezone ?? "Africa/Bamako");
  const hoursByDay = new Map<number, string[]>();
  for (const h of p.openingHours) {
    hoursByDay.set(h.dayOfWeek, [...(hoursByDay.get(h.dayOfWeek) ?? []), `${hour(h.start)} – ${hour(h.end)}`]);
  }
  const mapUrl = facility?.latitude ? `https://www.openstreetmap.org/?mlat=${facility.latitude}&mlon=${facility.longitude}#map=16/${facility.latitude}/${facility.longitude}` : null;

  return (
    <>
      <section className="profile-hero">
        <div className="container">
          {facility && (
            <nav className="crumbs" aria-label={t("practitioner.breadcrumb")}>
              <Link to={`/${COUNTRY_PATHS[facility.country.code]}`}>{countryName(facility.country.code)}</Link> ›{" "}
              <Link to={`/recherche?country=${facility.country.code}&region=${facility.region.slug}`}>{facility.region.name}</Link> ›{" "}
              <Link to={`/recherche?country=${facility.country.code}&specialty=${p.specialties[0]?.slug ?? ""}`}>{p.specialties[0] && specialtyName(p.specialties[0])}</Link>
            </nav>
          )}
          <div className="profile-id">
            <Avatar firstName={p.firstName} lastName={p.lastName} photoUrl={p.photoUrl} size={96} />
            <div>
              <h1>{p.fullName}</h1>
              <p className="spec">{specialtyList(p.specialties)}</p>
              <div className="row" style={{ marginTop: 8 }}>
                {p.verified && (
                  <span className="tag tag-green">
                    <Icon name="check" size={13} /> {t("practitioner.verified")}
                  </span>
                )}
                {p.teleconsultation && (
                  <span className="tag tag-ochre">
                    <Icon name="video" size={13} /> {t("common.teleconsultation")}
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
              <Icon name="calendar" /> {t("practitioner.rescheduleHint")}
            </p>
          )}
          <section className="card panel">
            <h2>
              <Icon name="pin" /> {t("practitioner.location")}
            </h2>
            {p.facilities.map((f) => (
              <div key={f.id} className="info-list" style={{ marginBottom: 12 }}>
                <div>
                  <Icon name="building" size={18} />
                  <span>
                    <b>{f.name}</b> <span className="tag">{facilityTypeLabel(f)}</span>
                    <br />
                    {f.address}
                  </span>
                </div>
                {f.phone && (
                  <div>
                    <Icon name="phone" size={18} />
                    <a href={`tel:${f.phone.replace(/\s/g, "")}`} dir="ltr">
                      {f.phone}
                    </a>
                  </div>
                )}
              </div>
            ))}
            {mapUrl && (
              <a className="map-link" href={mapUrl} target="_blank" rel="noreferrer">
                <span className="map-pin">
                  <Icon name="pin" size={40} strokeWidth={2.4} />
                </span>
                <span className="map-label">{t("practitioner.map")}</span>
              </a>
            )}
          </section>

          <section className="card panel">
            <h2>
              <Icon name="money" /> {t("practitioner.fees")}
            </h2>
            <div className="info-list">
              <div>
                <Icon name="check" size={18} />
                <span>
                  <Trans text={t("practitioner.feeOnSite")} values={{ fee: <b>{fcfa(p.fee)}</b> }} />
                </span>
              </div>
              {p.insurances.length > 0 && (
                <div>
                  <Icon name="shield" size={18} />
                  <span>{t("practitioner.insurances", { list: p.insurances.map(insuranceName).join(", ") })}</span>
                </div>
              )}
            </div>
          </section>

          <section className="card panel">
            <h2>
              <Icon name="user" /> {t("practitioner.about")}
            </h2>
            {p.bio && <p style={{ marginBottom: 14 }}>{p.bio}</p>}
            <div className="info-list">
              <div>
                <Icon name="language" size={18} />
                <span>{t("practitioner.languages", { list: p.languages.map(languageName).join(", ") })}</span>
              </div>
              {p.degrees.map((d) => (
                <div key={d}>
                  <Icon name="star" size={18} />
                  <span>{d}</span>
                </div>
              ))}
              <div>
                <Icon name="shield" size={18} />
                <span className="muted">{t("practitioner.orderNumber", { number: p.orderNumber })}</span>
              </div>
            </div>
          </section>

          <section className="card panel">
            <h2>
              <Icon name="clock" /> {t("practitioner.hours")}
            </h2>
            <table className="hours">
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <tr key={d}>
                    <td>{weekdayName(d)}</td>
                    <td>{hoursByDay.get(d)?.join(" · ") ?? t("practitioner.closed")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="card booking-panel" aria-label={t("common.bookAppointment")}>
          <div className="head">
            <h2>{reschedule ? t("practitioner.reschedule") : t("common.bookAppointment")}</h2>
            <p className="small" style={{ opacity: 0.9 }}>
              {t("practitioner.bookingHint")}
            </p>
          </div>
          <div className="body">
            {slots.data ? (
              <SlotGrid slug={p.slug} initialDays={slots.data.days} columns={4} reschedule={reschedule} today={today} />
            ) : slots.error ? (
              <p className="alert alert-error">{t("practitioner.slotsError")}</p>
            ) : (
              <div className="skeleton" style={{ height: 180 }} />
            )}
            {!p.acceptsNewPatients && <p className="alert alert-warn small" style={{ marginTop: 12 }}>{t("practitioner.noNewPatients")}</p>}
          </div>
        </aside>
      </div>
    </>
  );
}
