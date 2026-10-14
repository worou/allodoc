/**
 * Informations légales affichées dans les mentions légales, la politique de confidentialité et les CGU.
 * À tenir à jour : c'est le seul endroit où elles sont saisies.
 */
export const LEGAL = {
  /** Nom du service tel qu'affiché. */
  service: "AfroDoc",
  site: "https://afrodoc.teranga.re",
  /** Éditeur du site : personne physique (nom, prénom) ou société (raison sociale, forme, capital, immatriculation). */
  publisher: "Adimi PEHOUNDE",
  publisherDetails: "personne physique",
  address: "Bénin",
  /** Adresse de contact, aussi utilisée pour les demandes liées aux données personnelles. */
  email: "aganiworou12@gmail.com",
  /** Directeur de la publication (souvent le représentant légal de l'éditeur). */
  director: "Adimi PEHOUNDE",
  /** Droit applicable et tribunaux compétents (pays de l'éditeur). */
  jurisdiction:
    "Les présentes conditions sont régies par le droit béninois. En cas de litige, une solution amiable est recherchée en priorité ; à défaut, les tribunaux compétents de la République du Bénin sont seuls compétents",
  /** Hébergeur (registre officiel des entreprises, SIREN 510 909 807). */
  host: {
    name: "O2SWITCH SAS",
    address: "Chemin des Pardiaux, 63000 Clermont-Ferrand, France",
    registration: "SIREN 510 909 807",
    site: "https://www.o2switch.fr",
  },
  /** Date de dernière mise à jour des trois documents. */
  updatedAt: "2026-10-13",
} as const;
