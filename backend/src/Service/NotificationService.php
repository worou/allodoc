<?php

namespace App\Service;

use App\Entity\Appointment;
use App\Entity\Notification;
use App\Sms\SmsSenderInterface;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Messages transactionnels. Secret médical : jamais de motif, de spécialité ni de diagnostic dans un SMS.
 * Le message ne contient que la date, l'heure, le nom du praticien et le lieu.
 */
final class NotificationService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SmsSenderInterface $sms,
    ) {
    }

    public function appointmentConfirmed(Appointment $appointment): void
    {
        $this->send($appointment, 'confirmation', 'AlloDoc : RDV confirmé le %s à %s avec %s, %s. Annuler ou déplacer : allodoc.africa/compte');
    }

    public function appointmentCancelled(Appointment $appointment): void
    {
        $this->send($appointment, 'cancellation', 'AlloDoc : votre RDV du %s à %s avec %s (%s) est annulé.');
    }

    public function appointmentReminder(Appointment $appointment): void
    {
        $this->send($appointment, 'reminder', 'AlloDoc : rappel, RDV demain %s à %s avec %s, %s. Empêché ? Annulez pour libérer la place.');
    }

    private function send(Appointment $appointment, string $template, string $format): void
    {
        $local = $appointment->getStartsAt()->setTimezone($appointment->getFacility()->getTimezone());
        $body = sprintf(
            $format,
            $local->format('d/m'),
            $local->format('H\hi'),
            $appointment->getPractitioner()->getFullName(),
            $appointment->getFacility()->getName(),
        );
        $phone = $appointment->getPatient()->getPhone();
        if (null === $phone) {
            return;
        }

        $this->sms->send($phone, $body);
        $this->em->persist(new Notification('sms', $phone, $template, $body));
    }
}
