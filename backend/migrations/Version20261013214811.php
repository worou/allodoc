<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261013214811 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Téléconsultation : rendez-vous en vidéo et salle Jitsi privée.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE appointment ADD video TINYINT DEFAULT 0 NOT NULL, ADD video_room VARCHAR(64) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE appointment DROP video, DROP video_room');
    }
}
