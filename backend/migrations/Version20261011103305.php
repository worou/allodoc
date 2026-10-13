<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261011103305 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Extension à toute l\'Afrique : sous-région et longueurs de numéro des pays. Les nouveaux pays sont ajoutés par app:install.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE country ADD subregion VARCHAR(10) DEFAULT \'west\' NOT NULL, ADD phone_lengths JSON NOT NULL');
        // Pays déjà présents (Mali, Burkina Faso, Niger) : Afrique de l'Ouest, numéros nationaux à 8 chiffres.
        $this->addSql('UPDATE country SET phone_lengths = \'[8]\'');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE country DROP subregion, DROP phone_lengths');
    }
}
