<?php

namespace App\Command;

use App\Entity\Country;
use App\Entity\User;
use App\Reference\ReferenceLoader;
use App\Service\AccountResolver;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Installation en production (sans données de démonstration) : référentiels et compte super-administrateur.
 * Sans danger si relancée : rien n'est recréé si déjà présent.
 *
 *   php bin/console app:install --admin-email=vous@exemple.com
 */
#[AsCommand(name: 'app:install', description: 'Charge les référentiels (pays, régions, spécialités, formules) et crée le super-administrateur')]
final class InstallCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('admin-email', null, InputOption::VALUE_REQUIRED, 'Email du super-administrateur (connexion par code email)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if (0 === $this->em->getRepository(Country::class)->count([])) {
            ReferenceLoader::load($this->em);
            $this->em->flush();
            $io->success('Référentiels chargés : 3 pays, 45 régions, 18 spécialités, 2 formules d\'abonnement.');
        } else {
            $io->note('Référentiels déjà présents : inchangés.');
        }

        $email = $input->getOption('admin-email');
        if (null !== $email) {
            $email = AccountResolver::normalizeEmail((string) $email);
            if (null === $email) {
                $io->error('Adresse email invalide.');

                return Command::FAILURE;
            }
            $admin = (new AccountResolver($this->em))->findByVerifiedEmail($email);
            if (null === $admin) {
                $admin = (new User(null))->setVerifiedEmail($email)->setFirstName('Administrateur')->setLastName('AlloDoc')->giveConsent();
                $this->em->persist($admin);
            }
            $admin->setRoles(array_values(array_unique([...$admin->getRoles(), User::ROLE_SUPER_ADMIN])));
            $this->em->flush();
            $io->success(sprintf('Super-administrateur : %s (connexion sur /connexion, onglet "Par email").', $email));
        }

        return Command::SUCCESS;
    }
}
