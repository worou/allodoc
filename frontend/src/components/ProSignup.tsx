import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { SUBREGIONS, subregionName } from "../lib/africa";
import { api, ApiError, countryName } from "../lib/api";
import { facilityTypeLabel } from "../lib/format";
import { useCountries, useRegions, useSpecialties } from "../lib/hooks";
import { useI18n } from "../lib/i18n";
import type { CountryCode } from "../lib/types";
import { useAuth } from "./AuthProvider";
import { useRememberedCountry } from "./Header";
import { Icon } from "./Icon";

const FACILITY_TYPES = ["office", "clinic", "health_center", "hospital"];

/**
 * Création de la fiche praticien depuis un compte connecté : la fiche reste "en attente de vérification"
 * par l'administrateur du pays ; l'abonnement (et son paiement) est accessible immédiatement.
 */
export function ProSignup() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const countries = useCountries();
  const specialties = useSpecialties();
  const remembered = useRememberedCountry();
  const [form, setForm] = useState({
    title: "Dr",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    gender: "",
    orderNumber: "",
    specialty: "",
    country: "",
    region: "",
    city: "",
    facilityName: "",
    facilityType: "office",
    address: "",
    fee: "",
    phone: "",
    teleconsultation: false,
  });
  const country: CountryCode = form.country || remembered || "";
  const regions = useRegions(country || null);
  const currency = countries.find((c) => c.code === country)?.currency ?? "XOF";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/pro/registration", {
        method: "POST",
        body: JSON.stringify({ ...form, country, fee: form.fee === "" ? null : Number(form.fee) }),
      });
      await refresh();
      navigate("/pro?onglet=abonnement", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error.action"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <form className="card form-card" onSubmit={submit}>
          <h2>
            <Icon name="stethoscope" /> {t("proSignup.title")}
          </h2>
          <p className="muted">{t("proSignup.lead")}</p>

          <h3 className="form-section">{t("proSignup.sectionIdentity")}</h3>
          <div className="form-grid">
            <label>
              <span className="field-label">{t("proSignup.civility")}</span>
              <select className="select" value={form.title} onChange={set("title")}>
                <option value="Dr">{t("proSignup.titleDr")}</option>
                <option value="">{t("proSignup.titleNone")}</option>
              </select>
            </label>
            <label>
              <span className="field-label">{t("proSignup.gender")}</span>
              <select className="select" value={form.gender} onChange={set("gender")} required>
                <option value="">{t("proSignup.choose")}</option>
                <option value="F">{t("proSignup.female")}</option>
                <option value="M">{t("proSignup.male")}</option>
              </select>
            </label>
            <label>
              <span className="field-label">{t("common.firstName")}</span>
              <input className="input" value={form.firstName} onChange={set("firstName")} required autoComplete="given-name" />
            </label>
            <label>
              <span className="field-label">{t("common.lastName")}</span>
              <input className="input" value={form.lastName} onChange={set("lastName")} required autoComplete="family-name" />
            </label>
            <label>
              <span className="field-label">{t("proSignup.specialty")}</span>
              <select className="select" value={form.specialty} onChange={set("specialty")} required>
                <option value="">{t("proSignup.choose")}</option>
                {specialties.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">{t("proSignup.orderNumber")}</span>
              <input className="input" value={form.orderNumber} onChange={set("orderNumber")} required />
            </label>
          </div>

          <h3 className="form-section">{t("proSignup.sectionPractice")}</h3>
          <div className="form-grid">
            <label>
              <span className="field-label">{t("proSignup.country")}</span>
              <select className="select" value={country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, region: "" }))} required>
                <option value="">{t("proSignup.choose")}</option>
                {SUBREGIONS.map((s) => (
                  <optgroup key={s.code} label={subregionName(s.code)}>
                    {countries
                      .filter((c) => c.subregion === s.code)
                      .map((c) => (
                        <option key={c.code} value={c.code}>
                          {countryName(c.code)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">{t("proSignup.region")}</span>
              <select className="select" value={form.region} onChange={set("region")} required disabled={!country}>
                <option value="">{t("proSignup.choose")}</option>
                {regions.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">{t("proSignup.city")}</span>
              <input className="input" value={form.city} onChange={set("city")} autoComplete="address-level2" />
            </label>
            <label>
              <span className="field-label">{t("proSignup.facilityType")}</span>
              <select className="select" value={form.facilityType} onChange={set("facilityType")}>
                {FACILITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {facilityTypeLabel({ type, typeLabel: type })}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              <span className="field-label">{t("proSignup.facilityName")}</span>
              <input className="input" value={form.facilityName} onChange={set("facilityName")} required />
            </label>
            <label className="span-2">
              <span className="field-label">{t("proSignup.address")}</span>
              <input className="input" value={form.address} onChange={set("address")} required autoComplete="street-address" />
            </label>
            <label>
              <span className="field-label">{t("proSignup.fee", { currency: currency === "XOF" || currency === "XAF" ? "FCFA" : currency })}</span>
              <input className="input" type="number" min={0} step={50} inputMode="numeric" value={form.fee} onChange={set("fee")} required />
            </label>
            <label>
              <span className="field-label">
                {t("proSignup.phone")} <span className="muted small">{t("common.optional")}</span>
              </span>
              <input className="input" type="tel" dir="ltr" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </label>
          </div>

          <label className="choice">
            <input type="checkbox" checked={form.teleconsultation} onChange={(e) => setForm((f) => ({ ...f, teleconsultation: e.target.checked }))} />
            <span>
              <b>{t("video.settingOff")}</b>
              <br />
              <span className="small muted">{t("video.signupHint")}</span>
            </span>
          </label>
          <p className="muted small row">
            <Icon name="clock" size={14} /> {t("proSignup.scheduleNote")}
          </p>
          {error && <p className="alert alert-error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? t("proSignup.submitting") : t("proSignup.submit")}
          </button>
        </form>
      </div>
    </section>
  );
}
