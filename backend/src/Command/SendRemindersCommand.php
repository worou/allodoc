<?php

namespace App\Command;

use App\Entity\Appointment;
use App\Enum\AppointmentStatus;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Rappel SMS la veille du rendez-vous. À lancer toutes les 15 minutes (cron ou planificateur Windows).
 */
#[AsCommand(name: 'app:send-reminders', description: 'Envoie les rappels SMS des rendez-vous des prochaines 24 heures')]
final class SendRemindersCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly NotificationService $notifications,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $appointments = $this->em->createQueryBuilder()
            ->select('a')->from(Appointment::class, 'a')
            ->where('a.startsAt BETWEEN :now AND :limit AND a.reminderSentAt IS NULL AND a.status IN (:active)')
            ->setParameter('now', new \DateTimeImmutable('+2 hours'))
            ->setParameter('limit', new \DateTimeImmutable('+24 hours'))
            ->setParameter('active', [AppointmentStatus::Pending->value, AppointmentStatus::Confirmed->value])
            ->getQuery()->getResult();

        foreach ($appointments as $appointment) {
            $this->notifications->appointmentReminder($appointment);
            $appointment->markReminderSent();
        }
        $this->em->flush();
        $output->writeln(sprintf('%d rappel(s) envoyé(s).', \count($appointments)));

        return Command::SUCCESS;
    }
}
