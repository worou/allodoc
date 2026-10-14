import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { fullDate } from "../lib/format";
import { useTitle } from "../lib/hooks";
import { useI18n, type MessageKey } from "../lib/i18n";
import { LEGAL } from "../lib/legal";
import NotFound from "./NotFound";

/** Les trois documents légaux, servis sous /mentions-legales, /confidentialite et /conditions. */
export const LEGAL_PAGES: { path: string; title: MessageKey }[] = [
  { path: "/mentions-legales", title: "legal.notice" },
  { path: "/confidentialite", title: "legal.privacy" },
  { path: "/conditions", title: "legal.terms" },
];

const S = LEGAL.service;
const Mail = () => <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Notice() {
  return (
    <>
      <Section title="1. Éditeur du site">
        <p>
          Le site <b>{LEGAL.site}</b> et l'application {S} sont édités par <b>{LEGAL.publisher}</b>, {LEGAL.publisherDetails}.
        </p>
        <p>Adresse : {LEGAL.address}.</p>
        <p>
          Contact : <Mail />.
        </p>
        <p>Directeur de la publication : {LEGAL.director}.</p>
      </Section>
      <Section title="2. Hébergement">
        <p>
          Le site et ses données sont hébergés en France par <b>{LEGAL.host.name}</b>, {LEGAL.host.address} ({LEGAL.host.registration}),{" "}
          <a href={LEGAL.host.site} target="_blank" rel="noopener noreferrer">
            {LEGAL.host.site.replace("https://", "")}
          </a>
          .
        </p>
      </Section>
      <Section title="3. Nature du service">
        <p>
          {S} est une plateforme de prise de rendez-vous médicaux en ligne qui met en relation des patients et des professionnels de santé.{" "}
          <b>{S} n'est pas un établissement de santé</b> : la plateforme ne réalise aucun acte médical, ne donne aucun avis médical et n'intervient pas dans
          la consultation, qui relève de la seule responsabilité du professionnel de santé.
        </p>
        <p>
          <b>En cas d'urgence, n'utilisez pas {S} : contactez immédiatement les services d'urgence de votre pays.</b>
        </p>
        <p>
          Les professionnels de santé sont vérifiés par un administrateur avant leur publication (contrôle du numéro d'inscription à l'ordre). Les informations
          de leur fiche (spécialité, adresse, tarifs, horaires) sont renseignées sous leur responsabilité.
        </p>
      </Section>
      <Section title="4. Propriété intellectuelle">
        <p>
          La marque {S}, les textes, l'interface et le code du site sont la propriété de l'éditeur. Toute reproduction sans autorisation est interdite.
        </p>
        <p>
          Les cartes sont issues des données Natural Earth (domaine public) ; les drapeaux proviennent de la bibliothèque libre country-flag-icons (licence
          MIT).
        </p>
      </Section>
      <Section title="5. Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la <Link to="/confidentialite">politique de confidentialité</Link>. L'utilisation du service est régie
          par les <Link to="/conditions">conditions générales d'utilisation</Link>.
        </p>
      </Section>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p>
        Cette politique explique quelles données {S} collecte, pourquoi, avec qui elles sont partagées et comment exercer vos droits. Certaines données
        (motif de consultation, rendez-vous médicaux) sont des <b>données de santé</b> : elles font l'objet de précautions particulières.
      </p>
      <Section title="1. Responsable du traitement">
        <p>
          {LEGAL.publisher}, {LEGAL.address}. Contact pour toute question sur vos données : <Mail />.
        </p>
        <p>
          Les traitements sont réalisés conformément au Code du numérique de la République du Bénin (loi n° 2017-20) et, les données étant hébergées en
          France, au Règlement général sur la protection des données (RGPD).
        </p>
      </Section>
      <Section title="2. Données collectées">
        <ul>
          <li>
            <b>Compte</b> : numéro de téléphone et/ou adresse email, prénom, nom, langue ; identifiant Google ou GitHub si vous choisissez ces modes de
            connexion ; date de votre consentement.
          </li>
          <li>
            <b>Proches</b> que vous ajoutez pour leur prendre rendez-vous : prénom, nom, date de naissance, lien avec vous.
          </li>
          <li>
            <b>Rendez-vous</b> : praticien, lieu, date et heure, statut, mode (au cabinet ou en vidéo), première visite ou non, et{" "}
            <b>motif de consultation</b> si vous le renseignez (facultatif).
          </li>
          <li>
            <b>Professionnels de santé</b> : identité, numéro d'inscription à l'ordre, spécialité, lieu et téléphone de consultation, tarif, horaires,
            abonnement (formule, montant, moyen de paiement, référence de transaction).
          </li>
          <li>
            <b>Sécurité</b> : journal des actions sensibles (connexion, consultation d'agenda, validations) avec date et adresse IP ; codes de connexion,
            enregistrés uniquement sous forme chiffrée (empreinte).
          </li>
        </ul>
        <p>{S} ne collecte pas de données bancaires : les paiements PayPal sont saisis sur le site de PayPal, et le mobile money passe par votre opérateur.</p>
      </Section>
      <Section title="3. Finalités et bases légales">
        <ul>
          <li>Créer et gérer votre compte, vous connecter par code à usage unique : exécution du service.</li>
          <li>Prendre, modifier ou annuler vos rendez-vous et vous envoyer confirmations et rappels : exécution du service.</li>
          <li>
            Traiter le motif de consultation et vos rendez-vous médicaux : votre <b>consentement explicite</b>, recueilli avant votre première réservation.
          </li>
          <li>Vérifier les professionnels de santé et gérer leurs abonnements : exécution du contrat et obligations légales.</li>
          <li>Sécuriser le service et prévenir les abus : intérêt légitime de l'éditeur.</li>
        </ul>
        <p>Vos données ne sont ni vendues ni utilisées à des fins publicitaires.</p>
      </Section>
      <Section title="4. Destinataires">
        <ul>
          <li>Le professionnel de santé que vous choisissez : vos rendez-vous avec lui et, le cas échéant, leur motif.</li>
          <li>Les administrateurs {S}, pour la vérification des praticiens et des paiements (accès limité selon leur rôle).</li>
          <li>
            Les prestataires techniques, uniquement pour ce qui les concerne : {LEGAL.host.name} (hébergement en France), les prestataires d'envoi de SMS et
            d'emails, Google ou GitHub (si vous vous connectez avec eux), PayPal (si vous payez par PayPal).
          </li>
          <li>
            Google Fonts : les polices du site sont chargées depuis les serveurs de Google, qui reçoivent alors votre adresse IP.
          </li>
          <li>
            Téléconsultation : l'appel vidéo passe par un serveur Jitsi Meet (par défaut celui de l'association Freifunk München, en Allemagne), qui
            reçoit votre adresse IP et votre nom affiché le temps de l'appel. Chaque rendez-vous a sa salle privée, au nom aléatoire, accessible
            uniquement au patient et au praticien ; <b>l'appel n'est ni enregistré ni conservé</b>.
          </li>
        </ul>
        <p>
          <b>Les SMS et emails ne contiennent jamais le motif de consultation ni la spécialité.</b>
        </p>
      </Section>
      <Section title="5. Transferts hors de votre pays">
        <p>
          Les données sont hébergées en France (Union européenne). Certains prestataires (Google, GitHub, PayPal) peuvent traiter des données dans d'autres
          pays, dans le cadre de leurs propres garanties de protection des données.
        </p>
      </Section>
      <Section title="6. Durées de conservation">
        <ul>
          <li>Codes de connexion : 10 minutes ; sessions de connexion : 30 jours.</li>
          <li>
            Compte, proches et rendez-vous : tant que votre compte est actif. À la suppression du compte, ces données sont supprimées ou anonymisées, sauf
            obligation légale de conservation.
          </li>
          <li>Abonnements et paiements des praticiens : durée imposée par les obligations comptables.</li>
          <li>Journal de sécurité : durée nécessaire à la sécurité du service.</li>
        </ul>
      </Section>
      <Section title="7. Sécurité">
        <p>
          Connexion chiffrée (HTTPS), absence de mot de passe (codes à usage unique enregistrés sous forme chiffrée), accès aux données limité selon le rôle
          (patient, praticien, administrateur), journalisation des accès sensibles.
        </p>
      </Section>
      <Section title="8. Stockage dans votre navigateur">
        <p>
          {S} n'utilise <b>ni cookie publicitaire ni outil de mesure d'audience</b>. Le site enregistre dans votre navigateur (stockage local) votre jeton de
          connexion, votre langue, votre pays et des listes de référence (spécialités, pays, taux de change) pour fonctionner plus vite et hors connexion.
          Vous pouvez les effacer à tout moment depuis les réglages de votre navigateur ou en vous déconnectant.
        </p>
      </Section>
      <Section title="9. Vos droits">
        <p>
          Vous pouvez demander l'accès à vos données, leur rectification, leur suppression, leur portabilité, vous opposer à un traitement ou retirer votre
          consentement à tout moment, en écrivant à <Mail />. Nous répondons dans un délai d'un mois. Votre nom et votre profil se modifient aussi directement
          dans « Mon compte ».
        </p>
        <p>
          Vous pouvez également saisir l'autorité de protection des données de votre pays : l'APDP (Autorité de protection des données à caractère personnel)
          au Bénin, ou par exemple la CDP au Sénégal, l'APDP au Mali, l'ARTCI en Côte d'Ivoire, la CIL au Burkina Faso, la CNDP au Maroc, la CNIL en France.
        </p>
      </Section>
      <Section title="10. Mineurs">
        <p>
          Le compte est ouvert par une personne majeure. Les rendez-vous d'un enfant sont pris par son représentant légal, depuis son propre compte, en
          ajoutant l'enfant comme proche.
        </p>
      </Section>
    </>
  );
}

function Terms() {
  return (
    <>
      <Section title="1. Objet">
        <p>
          Les présentes conditions générales d'utilisation (CGU) encadrent l'utilisation du site et de l'application {S}, plateforme de prise de rendez-vous
          médicaux éditée par {LEGAL.publisher}. Utiliser le service vaut acceptation des CGU.
        </p>
      </Section>
      <Section title="2. Accès et compte">
        <p>
          La recherche de praticiens est libre. La prise de rendez-vous nécessite un compte, créé automatiquement lors de la première connexion par code (SMS
          ou email), par Google ou par GitHub. Vous vous engagez à fournir des informations exactes et à garder l'accès à votre téléphone et à votre
          messagerie sous votre contrôle. Le service est gratuit pour les patients.
        </p>
      </Section>
      <Section title="3. Rôle de la plateforme">
        <p>
          {S} met en relation patients et professionnels de santé et gère les agendas. {S} ne réalise aucun acte médical, ne garantit pas la disponibilité
          des praticiens et n'intervient pas dans la relation de soin. <b>Le service ne doit pas être utilisé en cas d'urgence.</b>
        </p>
      </Section>
      <Section title="4. Engagements du patient">
        <ul>
          <li>Honorer ses rendez-vous ou les annuler au plus tôt pour libérer le créneau.</li>
          <li>Ne réserver pour un proche qu'avec son accord ou en qualité de représentant légal.</li>
          <li>Ne pas faire un usage abusif du service (réservations fictives, contenus illicites).</li>
        </ul>
        <p>Le tarif de la consultation est fixé par le praticien et réglé directement auprès de lui.</p>
      </Section>
      <Section title="4 bis. Téléconsultation">
        <ul>
          <li>
            Certains praticiens proposent la consultation par vidéo. Le patient la choisit lors de la réservation ; la salle d'appel s'ouvre 15 minutes
            avant l'heure du rendez-vous, depuis « Mon compte » (patient) ou l'agenda (praticien).
          </li>
          <li>
            Le praticien juge seul si l'état du patient permet une consultation à distance ; il peut proposer un rendez-vous au cabinet. La
            téléconsultation ne convient pas aux urgences.
          </li>
          <li>
            La qualité de l'appel dépend de la connexion de chacun ; le mode « audio seul » est proposé en cas de réseau faible. Le tarif est celui
            indiqué par le praticien et se règle directement auprès de lui.
          </li>
        </ul>
      </Section>
      <Section title="5. Professionnels de santé">
        <ul>
          <li>
            Le praticien crée sa fiche depuis son compte et garantit l'exactitude des informations fournies, notamment son numéro d'inscription à l'ordre.
          </li>
          <li>
            Sa fiche est publiée uniquement après <b>vérification par un administrateur</b> et tant que son <b>abonnement</b> est actif. Les formules et
            leurs prix sont affichés dans l'espace praticien ; un renouvellement s'ajoute à la fin de la période en cours.
          </li>
          <li>
            Le paiement s'effectue par les moyens proposés dans son pays (mobile money, virement ou PayPal). Pour le mobile money et le virement,
            l'abonnement est activé après confirmation de la réception par un administrateur.
          </li>
          <li>Le praticien reste seul responsable de ses consultations, de ses horaires et de la confidentialité des informations de ses patients.</li>
        </ul>
        <p>
          Toute réclamation relative à un paiement est à adresser à <Mail />.
        </p>
      </Section>
      <Section title="6. Responsabilité">
        <p>
          L'éditeur s'efforce d'assurer la disponibilité et l'exactitude du service sans pouvoir les garantir en permanence (maintenance, réseau, opérateurs
          SMS). Il ne saurait être tenu responsable du contenu des fiches des praticiens ni du déroulement des consultations.
        </p>
      </Section>
      <Section title="7. Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </Section>
      <Section title="8. Suspension et suppression">
        <p>
          L'éditeur peut suspendre un compte ou retirer une fiche en cas de non-respect des CGU ou d'informations inexactes. Vous pouvez demander la
          suppression de votre compte à tout moment à <Mail />.
        </p>
      </Section>
      <Section title="9. Modification des CGU">
        <p>Les CGU peuvent évoluer ; la version en vigueur est celle publiée sur cette page, avec sa date de mise à jour.</p>
      </Section>
      <Section title="10. Droit applicable">
        <p>{LEGAL.jurisdiction}.</p>
      </Section>
    </>
  );
}

const CONTENT: Record<string, () => ReactNode> = {
  "/mentions-legales": Notice,
  "/confidentialite": Privacy,
  "/conditions": Terms,
};

export default function Legal() {
  const { lang, t } = useI18n();
  const { pathname } = useLocation();
  const page = LEGAL_PAGES.find((p) => p.path === pathname);
  useTitle(page ? t(page.title) : "");
  const Body = CONTENT[pathname];
  if (!page || !Body) return <NotFound />;

  return (
    <div className="legal">
      <div className="container">
        <nav className="legal-nav" aria-label={t("legal.documents")}>
          {LEGAL_PAGES.map((p) => (
            <Link key={p.path} to={p.path} aria-current={p.path === pathname ? "page" : undefined}>
              {t(p.title)}
            </Link>
          ))}
        </nav>
        <article className="card legal-doc">
          <h1>{t(page.title)}</h1>
          <p className="muted small">{t("legal.updated", { date: fullDate(LEGAL.updatedAt) })}</p>
          {lang !== "fr" && <p className="alert alert-info small">{t("legal.frenchOnly")}</p>}
          {/* Texte juridique rédigé en français (version de référence). */}
          <div className="legal-body" lang="fr" dir="ltr">
            <Body />
          </div>
        </article>
      </div>
    </div>
  );
}
