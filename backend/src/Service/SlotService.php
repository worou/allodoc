<?php

namespace App\Service;

use App\Entity\Absence;
use App\Entity\Appointment;
use App\Entity\Facility;
use App\Entity\Practitioner;
use App\Enum\AppointmentStatus;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Calcule les créneaux libres d'un praticien à partir de ses horaires récurrents, de ses absences et des
 * rendez-vous déjà pris. Les horaires sont exprimés en heure locale du pays de la structure, les créneaux
 * retournés portent leur instant UTC.
 */
final class SlotService
{
    /** Délai minimal entre la réservation et le rendez-vous. */
    private const MIN_LEAD_TIME = '+1 hour';
    public const MAX_DAYS = 28;

    public function __construct(private readonly EntityManagerInterface $em)
    {
    }

    /**
     * @return list<array{date: string, slots: list<array{start: string, time: string, facilityId: int}>}>
     */
    public function getDays(Practitioner $practitioner, \DateTimeImmutable $fromLocalDate, int $days): array
    {
        $days = max(1, min($days, self::MAX_DAYS));
        $rules = $practitioner->getAvailabilityRules()->toArray();
        if ([] === $rules) {
            return $this->emptyDays($fromLocalDate, $days);
        }

        $timezone = $rules[0]->getFacility()->getTimezone();
        $firstDay = new \DateTimeImmutable($fromLocalDate->format('Y-m-d'), $timezone);
        $rangeStart = $firstDay->setTimezone(new \DateTimeZone('UTC'));
        $rangeEnd = $firstDay->modify(sprintf('+%d days', $days))->setTimezone(new \DateTimeZone('UTC'));

        $taken = $this->takenStarts($practitioner, $rangeStart, $rangeEnd);
        $absences = $this->absences($practitioner, $rangeStart, $rangeEnd);
        $earliest = new \DateTimeImmutable(self::MIN_LEAD_TIME);

        $result = [];
        for ($i = 0; $i < $days; ++$i) {
            $day = $firstDay->modify(sprintf('+%d days', $i));
            $slots = [];
            foreach ($rules as $rule) {
                if ($rule->getDayOfWeek() !== (int) $day->format('N')) {
                    continue;
                }
                foreach ($this->expand($day, $rule->getStartTime(), $rule->getEndTime(), $rule->getSlotMinutes(), $rule->getFacility()) as [$start, $facility]) {
                    $utc = $start->setTimezone(new \DateTimeZone('UTC'));
                    if ($start < $earliest || isset($taken[$utc->format('Y-m-d H:i')]) || $this->inAbsence($utc, $absences)) {
                        continue;
                    }
                    $slots[$start->format('H:i')] = [
                        'start' => $utc->format(\DATE_ATOM),
                        'time' => $start->format('H:i'),
                        'facilityId' => $facility->getId(),
                    ];
                }
            }
            ksort($slots);
            $result[] = ['date' => $day->format('Y-m-d'), 'slots' => array_values($slots)];
        }

        return $result;
    }

    /**
     * Retourne la règle correspondant exactement à un créneau proposé, ou null si l'instant n'est pas réservable.
     *
     * @return array{facility: Facility, endsAt: \DateTimeImmutable}|null
     */
    public function resolveSlot(Practitioner $practitioner, \DateTimeImmutable $startsAtUtc): ?array
    {
        foreach ($practitioner->getAvailabilityRules() as $rule) {
            $facility = $rule->getFacility();
            $local = $startsAtUtc->setTimezone($facility->getTimezone());
            $day = new \DateTimeImmutable($local->format('Y-m-d'), $facility->getTimezone());
            if ($rule->getDayOfWeek() !== (int) $local->format('N')) {
                continue;
            }
            foreach ($this->expand($day, $rule->getStartTime(), $rule->getEndTime(), $rule->getSlotMinutes(), $facility) as [$start]) {
                if ($start == $local) {
                    return [
                        'facility' => $facility,
                        'endsAt' => $startsAtUtc->modify(sprintf('+%d minutes', $rule->getSlotMinutes())),
                    ];
                }
            }
        }

        return null;
    }

    public function isAvailable(Practitioner $practitioner, \DateTimeImmutable $startsAtUtc): bool
    {
        if ($startsAtUtc < new \DateTimeImmutable(self::MIN_LEAD_TIME) || null === $this->resolveSlot($practitioner, $startsAtUtc)) {
            return false;
        }
        $end = $startsAtUtc->modify('+1 minute');

        return [] === $this->takenStarts($practitioner, $startsAtUtc, $end)
            && !$this->inAbsence($startsAtUtc, $this->absences($practitioner, $startsAtUtc, $end));
    }

    /** @return \Generator<array{0: \DateTimeImmutable, 1: Facility}> */
    private function expand(\DateTimeImmutable $day, string $from, string $to, int $minutes, Facility $facility): \Generator
    {
        [$fh, $fm] = array_map('intval', explode(':', $from));
        [$th, $tm] = array_map('intval', explode(':', $to));
        $cursor = $day->setTime($fh, $fm);
        $end = $day->setTime($th, $tm);
        while ($cursor->modify(sprintf('+%d minutes', $minutes)) <= $end) {
            yield [$cursor, $facility];
            $cursor = $cursor->modify(sprintf('+%d minutes', $minutes));
        }
    }

    /** @return array<string, true> instants UTC "Y-m-d H:i" déjà réservés */
    private function takenStarts(Practitioner $practitioner, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        $rows = $this->em->createQueryBuilder()
            ->select('a.startsAt')
            ->from(Appointment::class, 'a')
            ->where('a.practitioner = :p AND a.startsAt >= :from AND a.startsAt < :to AND a.status IN (:active)')
            ->setParameter('p', $practitioner)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->setParameter('active', [AppointmentStatus::Pending->value, AppointmentStatus::Confirmed->value])
            ->getQuery()->getArrayResult();

        $taken = [];
        foreach ($rows as $row) {
            $taken[$row['startsAt']->format('Y-m-d H:i')] = true;
        }

        return $taken;
    }

    /** @return list<Absence> */
    private function absences(Practitioner $practitioner, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return $this->em->createQueryBuilder()
            ->select('ab')
            ->from(Absence::class, 'ab')
            ->where('ab.practitioner = :p AND ab.startsAt < :to AND ab.endsAt > :from')
            ->setParameter('p', $practitioner)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->getQuery()->getResult();
    }

    /** @param list<Absence> $absences */
    private function inAbsence(\DateTimeImmutable $instant, array $absences): bool
    {
        foreach ($absences as $absence) {
            if ($instant >= $absence->getStartsAt() && $instant < $absence->getEndsAt()) {
                return true;
            }
        }

        return false;
    }

    private function emptyDays(\DateTimeImmutable $from, int $days): array
    {
        $result = [];
        for ($i = 0; $i < $days; ++$i) {
            $result[] = ['date' => $from->modify(sprintf('+%d days', $i))->format('Y-m-d'), 'slots' => []];
        }

        return $result;
    }
}
