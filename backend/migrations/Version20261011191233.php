<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261011191233 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Paiement PayPal des abonnements : identifiant de commande PayPal et montant facturé en dollars.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription ADD provider_order_id VARCHAR(40) DEFAULT NULL, ADD amount_usd_cents INT DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE subscription DROP provider_order_id, DROP amount_usd_cents');
    }
}
