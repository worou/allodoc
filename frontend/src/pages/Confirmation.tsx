import { Link, useLocation } from "react-router";
import { Icon } from "../components/Icon";
import { hour, longDate } from "../lib/format";
import { useTitle } from "../lib/hooks";
import { Trans, useI18n } from "../lib/i18n";
import type { Appointment } from "../lib/types";

export default function Confirmation() {
  const { t } = useI18n();
  useTitle(t("confirm.title"));
  const appointment = (useLocation().state as { appointment?: Appointment } | null)?.appointment;

  return (
    <div className="funnel">
      <div className="card form-card" style={{ textAlign: "center", alignItems: "center" }}>
        <div className="success-mark">
          <Icon name="check" size={44} strokeWidth={3} />
        </div>
        <h2>{t("confirm.title")}</h2>
        {appointment ? (
          <>
            <p style={{ fontSize: 18 }}>
              <Trans text={t("confirm.when")} values={{ date: <b>{longDate(appointment.localDate)}</b>, time: <b>{hour(appointment.localTime)}</b> }} />
            </p>
            <p>
              <Trans text={t("confirm.with")} values={{ name: <b>{appointment.practitioner.fullName}</b> }} />
              {appointment.relative && <> {t("confirm.for", { name: `${appointment.relative.firstName} ${appointment.relative.lastName}` })}</>}
            </p>
            <p className="muted">
              {appointment.facility.name}, {appointment.facility.address}
            </p>
          </>
        ) : (
          <p className="muted">{t("confirm.noDetail")}</p>
        )}
        <p className="alert alert-ok small">
          <Icon name="phone" size={18} /> {t("confirm.sms")}
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link to="/compte" className="btn btn-indigo">
            {t("confirm.myAppointments")}
          </Link>
          <Link to="/" className="btn btn-ghost">
            {t("common.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
