/** Code ISO 3166-1 alpha-2 d'un des 55 pays et territoires africains du référentiel (ML, SN, KE...). */
export type CountryCode = string;

/** Les cinq sous-régions africaines. */
export type SubregionCode = "north" | "west" | "central" | "east" | "southern";

/** Pays du référentiel (GET /api/countries). */
export interface Country {
  code: CountryCode;
  name: string;
  capital: string;
  subregion: SubregionCode;
  phonePrefix: string;
  phoneLengths: number[];
  currency: string;
  timezone: string;
}

/** Sous-région et ses pays (GET /api/subregions). */
export interface SubregionOverview {
  code: SubregionCode;
  name: string;
  practitionerCount: number;
  countries: { code: CountryCode; name: string; capital: string; regionCount: number; practitionerCount: number }[];
}

export interface Slot {
  start: string;
  time: string;
  facilityId: number;
}

export interface SlotDay {
  date: string;
  slots: Slot[];
}

export interface Facility {
  id: number;
  name: string;
  type: string;
  typeLabel: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string;
  region: { slug: string; name: string };
  country: { code: CountryCode; name: string; subregion: SubregionCode; currency: string };
  timezone: string;
}

export interface PractitionerSummary {
  id: number;
  slug: string;
  title: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: "M" | "F";
  photoUrl: string | null;
  fee: number;
  /** Monnaie du pays du lieu de consultation (XOF, NGN, KES...). */
  currency: string;
  teleconsultation: boolean;
  acceptsNewPatients: boolean;
  languages: { code: string; name: string }[];
  insurances: string[];
  specialties: { slug: string; name: string }[];
  facility: Facility | null;
}

export interface SearchItem extends PractitionerSummary {
  availability: SlotDay[];
  nextAvailability: { date: string; time: string; start: string } | null;
}

export interface SearchResult {
  total: number;
  page: number;
  perPage: number;
  pages: number;
  items: SearchItem[];
}

export interface PractitionerDetail extends PractitionerSummary {
  bio: string | null;
  degrees: string[];
  orderNumber: string;
  verified: boolean;
  facilities: Facility[];
  openingHours: { dayOfWeek: number; start: string; end: string; facilityId: number }[];
}

export interface RegionOverview {
  id: number;
  slug: string;
  name: string;
  capital: string;
  formerName: string | null;
  provisional: boolean;
  practitionerCount: number;
}

export interface SpecialtyOverview {
  slug: string;
  name: string;
  icon: string;
  practitionerCount: number;
}

export interface CountryOverview {
  country: {
    code: CountryCode;
    name: string;
    capital: string;
    timezone: string;
    phonePrefix: string;
    currency: string;
    subregion: SubregionCode;
    languages: string[];
  };
  practitionerCount: number;
  regions: RegionOverview[];
  specialties: SpecialtyOverview[];
}

export interface Specialty {
  slug: string;
  name: string;
  icon: string;
}

export interface Relative {
  id: number;
  firstName: string;
  lastName: string;
  relation: string;
  birthDate: string | null;
}

export interface User {
  id: number;
  /** null pour un compte créé par email, Google ou GitHub tant qu'aucun numéro n'a été vérifié. */
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  linkedAccounts: ("google" | "github")[];
  firstName: string | null;
  lastName: string | null;
  locale: string;
  roles: string[];
  consent: boolean;
  adminCountry: CountryCode | null;
  relatives: Relative[];
}

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "honored" | "no_show";

export interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  localDate: string;
  localTime: string;
  status: AppointmentStatus;
  firstVisit: boolean;
  reason: string | null;
  practitioner: PractitionerSummary;
  facility: Facility;
  relative: Relative | null;
  createdAt: string;
  patient?: { firstName: string | null; lastName: string | null; phone: string | null };
}

export interface SubscriptionPlan {
  code: "semester" | "annual";
  name: string;
  durationMonths: number;
  price: number;
  monthlyPrice: number;
  currency: string;
}

export interface Subscription {
  id: string;
  reference: string;
  plan: { code: string; name: string; durationMonths: number };
  amount: number;
  currency: string;
  status: "pending" | "paid" | "cancelled";
  paymentMethod: string;
  paymentMethodLabel: string;
  /** Montant facturé en dollars (paiement PayPal), fixé à la création de la commande PayPal. */
  amountUsd: number | null;
  transactionId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  paidAt: string | null;
  practitioner?: { id: number; slug: string; fullName: string; phone: string | null; city: string | null; country: CountryCode | null; publishedUntil: string | null };
}

export interface SubscriptionStatusResponse {
  verified: boolean;
  published: boolean;
  activeSubscription: boolean;
  publishedUntil: string | null;
  daysLeft: number;
  plans: SubscriptionPlan[];
  /** Moyens de paiement proposés dans le pays du praticien. */
  methods: { code: string; label: string }[];
  /** Numéro de réception par moyen (null : communiqué par l'équipe AlloDoc) et titulaire ("holder"). */
  paymentAccount: Record<string, string | null>;
  /** PayPal configuré côté serveur : identifiant public pour le bouton de paiement. */
  paypal: { clientId: string; currency: "USD" } | null;
  pending: Subscription | null;
  history: Subscription[];
  canSimulatePayment: boolean;
}

/** Taux de change (GET /api/exchange-rates) : unités de chaque monnaie pour 1 dollar US. */
export interface ExchangeRates {
  base: "USD";
  rates: Record<string, number>;
  updatedAt: string | null;
  source: string;
}
