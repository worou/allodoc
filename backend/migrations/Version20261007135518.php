<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261007135518 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE subscription (id BINARY(16) NOT NULL, amount INT NOT NULL, currency VARCHAR(3) NOT NULL, status VARCHAR(255) NOT NULL, reference VARCHAR(12) NOT NULL, payment_method VARCHAR(20) NOT NULL, transaction_id VARCHAR(80) DEFAULT NULL, starts_at DATETIME DEFAULT NULL, ends_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, paid_at DATETIME DEFAULT NULL, practitioner_id INT NOT NULL, plan_id INT NOT NULL, confirmed_by_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_A3C664D3AEA34913 (reference), INDEX IDX_A3C664D37B00651C8B8E8428 (status, created_at), INDEX IDX_A3C664D31121EA2C (practitioner_id), INDEX IDX_A3C664D3E899029B (plan_id), INDEX IDX_A3C664D36F45385D (confirmed_by_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE subscription_plan (id INT AUTO_INCREMENT NOT NULL, code VARCHAR(20) NOT NULL, name VARCHAR(60) NOT NULL, duration_months SMALLINT NOT NULL, price INT NOT NULL, currency VARCHAR(3) NOT NULL, active TINYINT NOT NULL, position SMALLINT NOT NULL, UNIQUE INDEX UNIQ_EA664B6377153098 (code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT FK_A3C664D31121EA2C FOREIGN KEY (practitioner_id) REFERENCES practitioner (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT FK_A3C664D3E899029B FOREIGN KEY (plan_id) REFERENCES subscription_plan (id)');
        $this->addSql('ALTER TABLE subscription ADD CONSTRAINT FK_A3C664D36F45385D FOREIGN KEY (confirmed_by_id) REFERENCES `user` (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE practitioner ADD published_until DATETIME DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE subscription DROP FOREIGN KEY FK_A3C664D31121EA2C');
        $this->addSql('ALTER TABLE subscription DROP FOREIGN KEY FK_A3C664D3E899029B');
        $this->addSql('ALTER TABLE subscription DROP FOREIGN KEY FK_A3C664D36F45385D');
        $this->addSql('DROP TABLE subscription');
        $this->addSql('DROP TABLE subscription_plan');
        $this->addSql('ALTER TABLE practitioner DROP published_until');
    }
}
