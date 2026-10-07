import { Link, useLocation } from "react-router";
import { hasRole, useAuth } from "./AuthProvider";
import { Icon } from "./Icon";

interface Item {
  to: string;
  icon: string;
  label: string;
  /** Onglet actif pour ce chemin et ces paramètres (deux onglets peuvent partager /pro ou /compte). */
  active: (path: string, params: URLSearchParams) => boolean;
}

/**
 * Barre d'onglets en bas de l'écran sur mobile (et dans l'application installée), adaptée au profil :
 * patient (accueil, recherche, rendez-vous, profil) ou praticien (agenda, abonnement, recherche, compte).
 */
export function MobileNav() {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const isPro = hasRole(user, "ROLE_PRACTITIONER");

  const items: Item[] = isPro
    ? [
        { to: "/pro", icon: "calendar", label: "Agenda", active: (p, q) => p === "/pro" && q.get("onglet") !== "abonnement" },
        { to: "/pro?onglet=abonnement", icon: "crown", label: "Abonnement", active: (p, q) => p === "/pro" && q.get("onglet") === "abonnement" },
        { to: "/recherche", icon: "search", label: "Rechercher", active: (p) => p === "/recherche" || p.startsWith("/medecin") },
        { to: "/compte?onglet=profil", icon: "user", label: "Compte", active: (p) => p === "/compte" },
      ]
    : [
        { to: "/", icon: "heart", label: "Accueil", active: (p) => p === "/" || /^\/(ml|bf|ne)$/.test(p) },
        { to: "/recherche", icon: "search", label: "Rechercher", active: (p) => p === "/recherche" || p.startsWith("/medecin") || p.startsWith("/rdv") },
        { to: "/compte", icon: "calendar", label: "Mes RDV", active: (p, q) => p === "/compte" && q.get("onglet") !== "profil" },
        user
          ? { to: "/compte?onglet=profil", icon: "user", label: "Profil", active: (p, q) => p === "/compte" && q.get("onglet") === "profil" }
          : { to: "/connexion", icon: "user", label: "Connexion", active: (p) => p.startsWith("/connexion") },
      ];

  return (
    <nav className="mobile-nav" aria-label="Navigation principale">
      {items.map((item) => {
        const active = item.active(pathname, params);
        return (
          <Link key={item.label} to={item.to} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
