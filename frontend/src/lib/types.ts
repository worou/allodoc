export type CountryCode = "ML" | "BF" | "NE";

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
  country: { code: CountryCode; name: string };
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
  methods: { code: string; label: string }[];
  paymentAccount: Record<string, string>;
  pending: Subscription | null;
  history: Subscription[];
  canSimulatePayment: boolean;
}
