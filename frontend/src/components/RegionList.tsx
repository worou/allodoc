import { Link } from "react-router";
import { useState } from "react";
import { api } from "../lib/api";
import { money, hour, relativeDay, specialtyList, todayIn } from "../lib/format";
import { useI18n } from "../lib/i18n";
import type { CountryCode, RegionOverview, SearchResult } from "../lib/types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

const PAGE_SIZE = 6;

/** Une région repliable : les praticiens ne sont chargés qu'à l'ouverture, par pages de 6 (réseau faible). */
function Region({ country, region }: { country: CountryCode; region: RegionOverview }) {
  const { t, tn } = useI18n();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function load(page: number) {
    setLoading(true);
    setError(false);
    try {
      const res = await api<SearchResult>(`/api/search?country=${country}&region=${region.slug}&page=${page}&perPage=${PAGE_SIZE}&days=3`, { auth: false });
      setResult((prev) => (prev && page > 1 ? { ...res, items: [...prev.items, ...res.items] } : res));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const initialsLabel = region.name.replace(/^District de /, "").slice(0, 2).toUpperCase();

  return (
    <details
      className="card region"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open && !result && !loading) load(1);
      }}
    >
      <summary>
        <span className="region-badge" aria-hidden="true">
          {initialsLabel}
        </span>
        <span>
          <h3>
            {region.name}
            {region.formerName && <span className="muted small" style={{ fontWeight: 400 }}> ({region.formerName})</span>}
          </h3>
          <span className="count">
            {t("region.capital", { capital: region.capital })} ·{" "}
            {region.practitionerCount > 0 ? <b>{tn("region.practitioners", region.practitionerCount)}</b> : t("region.comingSoon")}
          </span>
        </span>
        <Icon name="chevronDown" className="chev" />
      </summary>
      <div className="region-body">
        {region.practitionerCount === 0 && (
          <p className="muted">{t("region.none")}</p>
        )}
        {error && <p className="alert alert-error">{t("region.loadError")}</p>}
        {loading && !result && (
          <div className="mini-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 96 }} />
            ))}
          </div>
        )}
        {result && result.items.length > 0 && (
          <>
            <div className="mini-grid">
              {result.items.map((p) => {
                const today = todayIn(p.facility?.timezone ?? "Africa/Bamako");
                return (
                  <Link key={p.slug} to={`/medecin/${p.slug}`} className="card mini-card">
                    <Avatar firstName={p.firstName} lastName={p.lastName} size={52} />
                    <div style={{ minWidth: 0 }}>
                      <h4>{p.fullName}</h4>
                      <p className="small muted">
                        {specialtyList(p.specialties)} · {p.facility?.city}
                      </p>
                      <p className="small muted">
                        {p.facility?.name} · {money(p.fee, p.currency)}
                      </p>
                      {p.nextAvailability ? (
                        <p className="next">
                          <Icon name="calendar" size={13} className="inline" /> {t("region.availableAt", { when: relativeDay(p.nextAvailability.date, today), time: hour(p.nextAvailability.time) })}
                        </p>
                      ) : (
                        <p className="next none">{t("region.noSlot")}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
              <Link to={`/recherche?country=${country}&region=${region.slug}`} className="btn btn-sm btn-outline">
                {t("region.allSlots")}
              </Link>
              {result.page < result.pages && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => load(result.page + 1)} disabled={loading}>
                  {loading ? t("common.loading") : t("region.showMore", { n: result.total - result.items.length })}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </details>
  );
}

export function RegionList({ country, regions }: { country: CountryCode; regions: RegionOverview[] }) {
  // Régions avec praticiens en tête, puis les autres (ordre administratif conservé).
  const sorted = [...regions].sort((a, b) => Number(b.practitionerCount > 0) - Number(a.practitionerCount > 0));
  return (
    <div className="region-list">
      {sorted.map((r) => (
        <Region key={r.slug} country={country} region={r} />
      ))}
    </div>
  );
}
