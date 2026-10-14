<?php

namespace App\Command;

use App\Entity\Practitioner;
use App\Service\SubscriptionService;
use App\Sms\SmsSenderInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * À lancer UNE FOIS PAR JOUR (cron ou Planificateur de tâches) : prévient les praticiens dont l'abonnement
 * expire dans 7 jours puis dans 1 jour, et annule les commandes restées impayées plus de 14 jours.
 */
#[AsCommand(name: 'app:subscription-reminders', description: 'Rappels SMS de renouvellement d\'abonnement (J-7 et J-1)')]
final class SubscriptionRemindersCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly SmsSenderInterface $sms,
        private readonly SubscriptionService $subscriptions,
        #[Autowire('%env(BRAND_NAME)%')] private readonly string $brand,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $sent = 0;
        foreach ([7, 1] as $days) {
            // Fenêtre d'un jour : chaque praticien reçoit un seul rappel par échéance si la commande tourne quotidiennement.
            $practitioners = $this->em->createQueryBuilder()
                ->select('p')->from(Practitioner::class, 'p')
                ->where('p.publishedUntil > :from AND p.publishedUntil <= :to AND p.user IS NOT NULL')
                ->setParameter('from', new \DateTimeImmutable(sprintf('+%d days', $days - 1)))
                ->setParameter('to', new \DateTimeImmutable(sprintf('+%d days', $days)))
                ->getQuery()->getResult();

            foreach ($practitioners as $practitioner) {
                $phone = $practitioner->getUser()?->getPhone();
                if (null === $phone) {
                    continue;
                }
                $this->sms->send($phone, sprintf(
                    $practitioner->isInTrial()
                        ? $this->brand.' : votre période gratuite se termine le %s. Souscrivez depuis votre espace praticien pour rester visible des patients.'
                        : $this->brand.' : votre abonnement expire le %s. Renouvelez-le depuis votre espace praticien pour rester visible des patients.',
                    $practitioner->getPublishedUntil()->format('d/m/Y'),
                ));
                ++$sent;
            }
        }
        $expired = $this->subscriptions->expireAbandonedOrders();
        $output->writeln(sprintf('%d rappel(s) envoyé(s), %d commande(s) impayée(s) annulée(s).', $sent, $expired));

        return Command::SUCCESS;
    }
}
