<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Nouvelle offre praticiens : publication gratuite 3 mois à la validation (practitioner.trial_until), puis
 * 5 000 FCFA par mois, réglables pour 1, 3, 6 ou 12 mois. Les commandes déjà passées gardent leur montant.
 */
final class Version20261013205202 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Gratuité de 3 mois à la validation, abonnement à 5 000 FCFA par mois (1, 3, 6 ou 12 mois).';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE practitioner ADD trial_until DATETIME DEFAULT NULL');

        $plans = [['monthly', 'Mensuel', 1, 5000, 0], ['quarterly', 'Trimestriel', 3, 15000, 1], ['semester', 'Semestriel', 6, 30000, 2], ['annual', 'Annuel', 12, 60000, 3]];
        foreach ($plans as [$code, $name, $months, $price, $position]) {
            // Met à jour la formule si elle existe, sinon la crée.
            $this->addSql('UPDATE subscription_plan SET name = ?, duration_months = ?, price = ?, position = ?, active = 1 WHERE code = ?', [$name, $months, $price, $position, $code]);
            $this->addSql(
                "INSERT INTO subscription_plan (code, name, duration_months, price, currency, active, position) SELECT ?, ?, ?, ?, 'XOF', 1, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM subscription_plan WHERE code = ?)",
                [$code, $name, $months, $price, $position, $code],
            );
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE practitioner DROP trial_until');
        $this->addSql("DELETE FROM subscription_plan WHERE code IN ('monthly', 'quarterly') AND id NOT IN (SELECT plan_id FROM subscription)");
        $this->addSql("UPDATE subscription_plan SET price = 6000, position = 0 WHERE code = 'semester'");
        $this->addSql("UPDATE subscription_plan SET price = 10000, position = 1 WHERE code = 'annual'");
    }
}
