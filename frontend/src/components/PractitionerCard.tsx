import { Link } from "react-router";
import { money, insuranceName, languageName, specialtyList, todayIn } from "../lib/format";
import { useI18n } from "../lib/i18n";
import type { SearchItem } from "../lib/types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { SlotGrid } from "./SlotGrid";

/** Résultat de recherche : identité et informations pratiques à gauche, créneaux à droite. */
export function PractitionerCard({ item }: { item: SearchItem }) {
  const { t } = useI18n();
  const f = item.facility;
  const today = todayIn(f?.timezone ?? "Africa/Bamako");
  return (
    <article className="card result">
      <div className="result-info">
        <div className="result-top">
          <Avatar firstName={item.firstName} lastName={item.lastName} photoUrl={item.photoUrl} size={72} />
          <div>
            <Link to={`/medecin/${item.slug}`} className="result-name">
              {item.fullName}
            </Link>
            <p className="result-spec">{specialtyList(item.specialties)}</p>
            <div className="row" style={{ marginTop: 6 }}>
              {item.teleconsultation && (
                <span className="tag tag-indigo">
                  <Icon name="video" size={13} /> {t("common.teleconsultation")}
                </span>
              )}
              {item.acceptsNewPatients && <span className="tag tag-green">{t("card.newPatients")}</span>}
            </div>
          </div>
        </div>
        <div className="result-meta">
          {f && (
            <div>
              <Icon name="pin" size={16} />
              <span>
                <b>{f.name}</b>
                <br />
                {f.address}
              </span>
            </div>
          )}
          <div>
            <Icon name="money" size={16} />
            <span>{t("common.consultationFee", { fee: money(item.fee, item.currency) })}</span>
          </div>
          <div>
            <Icon name="language" size={16} />
            <span>{item.languages.map(languageName).join(", ")}</span>
          </div>
          {item.insurances.length > 0 && (
            <div>
              <Icon name="shield" size={16} />
              <span>{item.insurances.map(insuranceName).join(", ")}</span>
            </div>
          )}
        </div>
        <div className="result-actions">
          <Link to={`/medecin/${item.slug}`} className="btn btn-sm btn-outline">
            {t("card.viewProfile")}
          </Link>
          {item.nextAvailability && (
            <Link to={`/rdv/${item.slug}?start=${encodeURIComponent(item.nextAvailability.start)}`} className="btn btn-sm btn-primary">
              {t("common.bookAppointment")}
            </Link>
          )}
        </div>
      </div>
      <div className="result-slots">
        <SlotGrid slug={item.slug} initialDays={item.availability} next={item.nextAvailability} today={today} />
      </div>
    </article>
  );
}
