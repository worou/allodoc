import { Link, useLocation } from "react-router";
import { hasRole, useAuth } from "./AuthProvider";
import { Icon } from "./Icon";
import { useI18n } from "../lib/i18n";

interface Item {
  to: string;
  icon: string;
  label: string;
  /** Onglet actif pour ce chemin et ces paramètres (deux onglets peuvent partager /pro ou /compte). */
  active: (path: string, params: URLSearchParams) => boolean;
}

/**
 * Barre d'onglets en bas de l'écran sur mobile (et dans l'application installée), adaptée au profil :
 * patient (accueil, Afrique, recherche, rendez-vous, profil) ou praticien (agenda, abonnement, recherche, compte).
 */
export function MobileNav() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const isPro = hasRole(user, "ROLE_PRACTITIONER");

  const items: Item[] = isPro
    ? [
        { to: "/pro", icon: "calendar", label: t("nav.agenda"), active: (p, q) => p === "/pro" && q.get("onglet") !== "abonnement" },
        { to: "/pro?onglet=abonnement", icon: "crown", label: t("nav.subscription"), active: (p, q) => p === "/pro" && q.get("onglet") === "abonnement" },
        { to: "/recherche", icon: "search", label: t("nav.search"), active: (p) => p === "/recherche" || p.startsWith("/medecin") },
        { to: "/compte?onglet=profil", icon: "user", label: t("nav.account"), active: (p) => p === "/compte" },
      ]
    : [
        { to: "/", icon: "heart", label: t("nav.home"), active: (p) => p === "/" },
        { to: "/afrique", icon: "globe", label: t("nav.africa"), active: (p) => p.startsWith("/afrique") || /^\/[a-z]{2}$/.test(p) },
        { to: "/recherche", icon: "search", label: t("nav.search"), active: (p) => p === "/recherche" || p.startsWith("/medecin") || p.startsWith("/rdv") },
        { to: "/compte", icon: "calendar", label: t("nav.myAppointments"), active: (p, q) => p === "/compte" && q.get("onglet") !== "profil" },
        user
          ? { to: "/compte?onglet=profil", icon: "user", label: t("nav.profile"), active: (p, q) => p === "/compte" && q.get("onglet") === "profil" }
          : { to: "/connexion", icon: "user", label: t("nav.signIn"), active: (p) => p.startsWith("/connexion") },
      ];

  return (
    <nav className="mobile-nav" aria-label={t("nav.main")}>
      {items.map((item) => {
        const active = item.active(pathname, params);
        return (
          <Link key={item.to} to={item.to} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
