<?php

namespace App\Service;

use App\Entity\Appointment;
use App\Entity\Facility;
use App\Entity\Practitioner;
use App\Entity\Relative;
use App\Entity\User;

/**
 * Représentations JSON renvoyées par les contrôleurs métier (recherche, réservation, espaces patient/praticien).
 */
final class Presenter
{
    public const LANGUAGES = [
        'fr' => 'Français', 'en' => 'Anglais', 'ar' => 'Arabe', 'bm' => 'Bambara', 'mos' => 'Mooré',
        'ha' => 'Haoussa', 'dje' => 'Zarma', 'ff' => 'Peul', 'son' => 'Songhaï', 'tmh' => 'Tamasheq', 'dyu' => 'Dioula',
        'wo' => 'Wolof', 'yo' => 'Yoruba', 'ig' => 'Igbo', 'sw' => 'Swahili', 'ber' => 'Amazighe', 'zu' => 'Zoulou',
        'xh' => 'Xhosa', 'af' => 'Afrikaans', 'pt' => 'Portugais', 'es' => 'Espagnol', 'ln' => 'Lingala', 'am' => 'Amharique',
        'bci' => 'Baoulé', 'fon' => 'Fon', 'ee' => 'Éwé', 'ak' => 'Akan', 'rw' => 'Kinyarwanda', 'mg' => 'Malgache',
    ];

    public function practitionerSummary(Practitioner $p): array
    {
        $facility = $p->getMainFacility();

        return [
            'id' => $p->getId(),
            'slug' => $p->getSlug(),
            'title' => $p->getTitle(),
            'firstName' => $p->getFirstName(),
            'lastName' => $p->getLastName(),
            'fullName' => $p->getFullName(),
            'gender' => $p->getGender(),
            'photoUrl' => $p->getPhotoUrl(),
            'fee' => $p->getFee(),
            'currency' => $facility?->getCity()->getRegion()->getCountry()->getCurrency() ?? 'XOF',
            'teleconsultation' => $p->hasTeleconsultation(),
            'acceptsNewPatients' => $p->acceptsNewPatients(),
            'languages' => array_map(fn (string $code) => ['code' => $code, 'name' => self::LANGUAGES[$code] ?? $code], $p->getLanguages()),
            'insurances' => $p->getInsurances(),
            'specialties' => array_map(fn ($s) => ['slug' => $s->getSlug(), 'name' => $s->getName()], $p->getSpecialties()->toArray()),
            'facility' => $facility ? $this->facility($facility) : null,
        ];
    }

    public function practitionerDetail(Practitioner $p): array
    {
        $rules = [];
        foreach ($p->getAvailabilityRules() as $rule) {
            $rules[] = [
                'dayOfWeek' => $rule->getDayOfWeek(),
                'start' => $rule->getStartTime(),
                'end' => $rule->getEndTime(),
                'facilityId' => $rule->getFacility()->getId(),
            ];
        }
        usort($rules, fn ($a, $b) => [$a['dayOfWeek'], $a['start']] <=> [$b['dayOfWeek'], $b['start']]);

        return $this->practitionerSummary($p) + [
            'bio' => $p->getBio(),
            'degrees' => $p->getDegrees(),
            'orderNumber' => $p->getOrderNumber(),
            'verified' => $p->isVerified(),
            'facilities' => array_map(fn (Facility $f) => $this->facility($f), $p->getFacilities()->toArray()),
            'openingHours' => $rules,
        ];
    }

    public function facility(Facility $f): array
    {
        $region = $f->getCity()->getRegion();
        $country = $region->getCountry();

        return [
            'id' => $f->getId(),
            'name' => $f->getName(),
            'type' => $f->getType()->value,
            'typeLabel' => $f->getType()->label(),
            'address' => $f->getAddress(),
            'phone' => $f->getPhone(),
            'latitude' => $f->getLatitude(),
            'longitude' => $f->getLongitude(),
            'city' => $f->getCity()->getName(),
            'region' => ['slug' => $region->getSlug(), 'name' => $region->getName()],
            'country' => ['code' => $country->getCode(), 'name' => $country->getName(), 'subregion' => $country->getSubregion()->value, 'currency' => $country->getCurrency()],
            'timezone' => $country->getTimezone(),
        ];
    }

    /** @param bool $withReason le motif n'est montré qu'au patient et au praticien concernés */
    public function appointment(Appointment $a, bool $withPatient = false, bool $withReason = true): array
    {
        $tz = $a->getFacility()->getTimezone();
        $data = [
            'id' => (string) $a->getId(),
            'startsAt' => $a->getStartsAt()->format(\DATE_ATOM),
            'endsAt' => $a->getEndsAt()->format(\DATE_ATOM),
            'localDate' => $a->getStartsAt()->setTimezone($tz)->format('Y-m-d'),
            'localTime' => $a->getStartsAt()->setTimezone($tz)->format('H:i'),
            'status' => $a->getStatus()->value,
            'firstVisit' => $a->isFirstVisit(),
            // Téléconsultation : la salle elle-même n'est donnée que par /api/appointments/{id}/video, pendant la fenêtre d'ouverture.
            'video' => $a->isVideo(),
            'videoOpensAt' => $a->isVideo() ? $a->getStartsAt()->modify(VideoConsultation::OPENS_BEFORE)->format(\DATE_ATOM) : null,
            'videoClosesAt' => $a->isVideo() ? $a->getEndsAt()->modify(VideoConsultation::CLOSES_AFTER)->format(\DATE_ATOM) : null,
            'reason' => $withReason ? $a->getReason() : null,
            'practitioner' => $this->practitionerSummary($a->getPractitioner()),
            'facility' => $this->facility($a->getFacility()),
            'relative' => $a->getRelative() ? $this->relative($a->getRelative()) : null,
            'createdAt' => $a->getCreatedAt()->format(\DATE_ATOM),
        ];
        if ($withPatient) {
            $data['patient'] = [
                'firstName' => $a->getRelative()?->getFirstName() ?? $a->getPatient()->getFirstName(),
                'lastName' => $a->getRelative()?->getLastName() ?? $a->getPatient()->getLastName(),
                'phone' => $a->getPatient()->getPhone(),
            ];
        }

        return $data;
    }

    public function relative(Relative $r): array
    {
        return [
            'id' => $r->getId(),
            'firstName' => $r->getFirstName(),
            'lastName' => $r->getLastName(),
            'relation' => $r->getRelation(),
            'birthDate' => $r->getBirthDate()?->format('Y-m-d'),
        ];
    }

    public function user(User $u): array
    {
        return [
            'id' => $u->getId(),
            'phone' => $u->getPhone(),
            'email' => $u->getEmail(),
            'emailVerified' => $u->isEmailVerified(),
            'linkedAccounts' => array_values(array_filter([
                null !== $u->getGoogleId() ? 'google' : null,
                null !== $u->getGithubId() ? 'github' : null,
            ])),
            'firstName' => $u->getFirstName(),
            'lastName' => $u->getLastName(),
            'locale' => $u->getLocale(),
            'roles' => $u->getRoles(),
            'consent' => null !== $u->getConsentAt(),
            'adminCountry' => $u->getAdminCountry()?->getCode(),
            'relatives' => array_map(fn (Relative $r) => $this->relative($r), $u->getRelatives()->toArray()),
        ];
    }
}
