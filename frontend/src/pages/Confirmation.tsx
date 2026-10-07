import { Link, useLocation } from "react-router";
import { Icon } from "../components/Icon";
import { hour, longDate } from "../lib/format";
import { useTitle } from "../lib/hooks";
import type { Appointment } from "../lib/types";

export default function Confirmation() {
  useTitle("Rendez-vous confirmé");
  const appointment = (useLocation().state as { appointment?: Appointment } | null)?.appointment;

  return (
    <div className="funnel">
      <div className="card form-card" style={{ textAlign: "center", alignItems: "center" }}>
        <div className="success-mark">
          <Icon name="check" size={44} strokeWidth={3} />
        </div>
        <h2>Rendez-vous confirmé</h2>
        {appointment ? (
          <>
            <p style={{ fontSize: 18 }}>
              <b>{longDate(appointment.localDate)}</b> à <b>{hour(appointment.localTime)}</b>
            </p>
            <p>
              avec <b>{appointment.practitioner.fullName}</b>
              {appointment.relative && (
                <>
                  {" "}
                  pour {appointment.relative.firstName} {appointment.relative.lastName}
                </>
              )}
            </p>
            <p className="muted">
              {appointment.facility.name}, {appointment.facility.address}
            </p>
          </>
        ) : (
          <p className="muted">Retrouvez le détail dans vos rendez-vous.</p>
        )}
        <p className="alert alert-ok small">
          <Icon name="phone" size={18} /> Un SMS de confirmation vous a été envoyé. Vous recevrez un rappel la veille.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link to="/compte" className="btn btn-indigo">
            Mes rendez-vous
          </Link>
          <Link to="/" className="btn btn-ghost">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
