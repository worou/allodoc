<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261007134257 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP INDEX IDX_93FE2319444F97DD8B8E8428 ON otp_code');
        $this->addSql('ALTER TABLE otp_code ADD destination VARCHAR(180) NOT NULL, DROP phone');
        $this->addSql('CREATE INDEX IDX_93FE23193EC63EAA8B8E8428 ON otp_code (destination, created_at)');
        $this->addSql('ALTER TABLE user ADD email_verified_at DATETIME DEFAULT NULL, ADD google_id VARCHAR(64) DEFAULT NULL, ADD github_id VARCHAR(64) DEFAULT NULL, CHANGE phone phone VARCHAR(20) DEFAULT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8D93D64976F5C865 ON user (google_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8D93D649D4327649 ON user (github_id)');
        $this->addSql('CREATE INDEX IDX_8D93D649E7927C74 ON user (email)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP INDEX IDX_93FE23193EC63EAA8B8E8428 ON otp_code');
        $this->addSql('ALTER TABLE otp_code ADD phone VARCHAR(20) NOT NULL, DROP destination');
        $this->addSql('CREATE INDEX IDX_93FE2319444F97DD8B8E8428 ON otp_code (phone, created_at)');
        $this->addSql('DROP INDEX UNIQ_8D93D64976F5C865 ON `user`');
        $this->addSql('DROP INDEX UNIQ_8D93D649D4327649 ON `user`');
        $this->addSql('DROP INDEX IDX_8D93D649E7927C74 ON `user`');
        $this->addSql('ALTER TABLE `user` DROP email_verified_at, DROP google_id, DROP github_id, CHANGE phone phone VARCHAR(20) NOT NULL');
    }
}
