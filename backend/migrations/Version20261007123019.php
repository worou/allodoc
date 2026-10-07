<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20261007123019 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE absence (id INT AUTO_INCREMENT NOT NULL, starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL, reason VARCHAR(150) DEFAULT NULL, practitioner_id INT NOT NULL, INDEX IDX_765AE0C91121EA2C55A0507C (practitioner_id, starts_at), INDEX IDX_765AE0C91121EA2C (practitioner_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE api_token (id INT AUTO_INCREMENT NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at DATETIME NOT NULL, user_id INT NOT NULL, UNIQUE INDEX UNIQ_7BA2F5EBB3BC57DA (token_hash), INDEX IDX_7BA2F5EBA76ED395 (user_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE appointment (id BINARY(16) NOT NULL, starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL, status VARCHAR(255) NOT NULL, slot_lock SMALLINT DEFAULT NULL, reason VARCHAR(255) DEFAULT NULL, first_visit TINYINT NOT NULL, created_at DATETIME NOT NULL, cancelled_at DATETIME DEFAULT NULL, reminder_sent_at DATETIME DEFAULT NULL, patient_id INT NOT NULL, relative_id INT DEFAULT NULL, practitioner_id INT NOT NULL, facility_id INT NOT NULL, INDEX IDX_FE38F8446B89927955A0507C (patient_id, starts_at), UNIQUE INDEX uniq_active_slot (practitioner_id, starts_at, slot_lock), INDEX IDX_FE38F8446B899279 (patient_id), INDEX IDX_FE38F84488A7E3A9 (relative_id), INDEX IDX_FE38F8441121EA2C (practitioner_id), INDEX IDX_FE38F844A7014910 (facility_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE audit_log (id INT AUTO_INCREMENT NOT NULL, action VARCHAR(60) NOT NULL, subject VARCHAR(120) NOT NULL, ip VARCHAR(45) DEFAULT NULL, created_at DATETIME NOT NULL, actor_id INT DEFAULT NULL, INDEX IDX_F6E1C0F58B8E8428 (created_at), INDEX IDX_F6E1C0F510DAF24A (actor_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE availability_rule (id INT AUTO_INCREMENT NOT NULL, day_of_week SMALLINT NOT NULL, start_time VARCHAR(5) NOT NULL, end_time VARCHAR(5) NOT NULL, slot_minutes SMALLINT NOT NULL, practitioner_id INT NOT NULL, facility_id INT NOT NULL, INDEX IDX_F6C750351121EA2C (practitioner_id), INDEX IDX_F6C75035A7014910 (facility_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE city (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, latitude DOUBLE PRECISION DEFAULT NULL, longitude DOUBLE PRECISION DEFAULT NULL, region_id INT NOT NULL, INDEX IDX_2D5B023498260155 (region_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE country (id INT AUTO_INCREMENT NOT NULL, code VARCHAR(2) NOT NULL, name VARCHAR(80) NOT NULL, capital VARCHAR(80) NOT NULL, timezone VARCHAR(40) NOT NULL, phone_prefix VARCHAR(6) NOT NULL, currency VARCHAR(3) NOT NULL, languages JSON NOT NULL, active TINYINT NOT NULL, position SMALLINT NOT NULL, UNIQUE INDEX UNIQ_5373C96677153098 (code), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE facility (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(150) NOT NULL, type VARCHAR(255) NOT NULL, address VARCHAR(255) NOT NULL, phone VARCHAR(20) DEFAULT NULL, latitude DOUBLE PRECISION DEFAULT NULL, longitude DOUBLE PRECISION DEFAULT NULL, city_id INT NOT NULL, INDEX IDX_105994B28BAC62AF (city_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE notification (id INT AUTO_INCREMENT NOT NULL, channel VARCHAR(10) NOT NULL, recipient VARCHAR(180) NOT NULL, template VARCHAR(30) NOT NULL, body LONGTEXT NOT NULL, status VARCHAR(10) NOT NULL, created_at DATETIME NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE otp_code (id INT AUTO_INCREMENT NOT NULL, phone VARCHAR(20) NOT NULL, code_hash VARCHAR(64) NOT NULL, created_at DATETIME NOT NULL, expires_at DATETIME NOT NULL, attempts SMALLINT NOT NULL, consumed_at DATETIME DEFAULT NULL, INDEX IDX_93FE2319444F97DD8B8E8428 (phone, created_at), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE practitioner (id INT AUTO_INCREMENT NOT NULL, slug VARCHAR(120) NOT NULL, title VARCHAR(10) NOT NULL, first_name VARCHAR(80) NOT NULL, last_name VARCHAR(80) NOT NULL, gender VARCHAR(1) NOT NULL, order_number VARCHAR(40) NOT NULL, verification_status VARCHAR(255) NOT NULL, verified_at DATETIME DEFAULT NULL, bio LONGTEXT DEFAULT NULL, photo_url VARCHAR(255) DEFAULT NULL, fee INT NOT NULL, languages JSON NOT NULL, insurances JSON NOT NULL, degrees JSON NOT NULL, teleconsultation TINYINT NOT NULL, accepts_new_patients TINYINT NOT NULL, created_at DATETIME NOT NULL, user_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_17323CBC989D9B62 (slug), UNIQUE INDEX UNIQ_17323CBCA76ED395 (user_id), INDEX IDX_17323CBC10F5CF49 (verification_status), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE practitioner_specialty (practitioner_id INT NOT NULL, specialty_id INT NOT NULL, INDEX IDX_94A4A9C01121EA2C (practitioner_id), INDEX IDX_94A4A9C09A353316 (specialty_id), PRIMARY KEY (practitioner_id, specialty_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE practitioner_facility (practitioner_id INT NOT NULL, facility_id INT NOT NULL, INDEX IDX_638422311121EA2C (practitioner_id), INDEX IDX_63842231A7014910 (facility_id), PRIMARY KEY (practitioner_id, facility_id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE region (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(100) NOT NULL, slug VARCHAR(100) NOT NULL, capital VARCHAR(100) NOT NULL, former_name VARCHAR(100) DEFAULT NULL, provisional TINYINT NOT NULL, position SMALLINT NOT NULL, country_id INT NOT NULL, UNIQUE INDEX UNIQ_F62F176F92F3E70989D9B62 (country_id, slug), INDEX IDX_F62F176F92F3E70 (country_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE relative (id INT AUTO_INCREMENT NOT NULL, first_name VARCHAR(80) NOT NULL, last_name VARCHAR(80) NOT NULL, birth_date DATE DEFAULT NULL, relation VARCHAR(20) NOT NULL, owner_id INT NOT NULL, INDEX IDX_6E5B37D97E3C61F9 (owner_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE specialty (id INT AUTO_INCREMENT NOT NULL, slug VARCHAR(80) NOT NULL, name VARCHAR(100) NOT NULL, icon VARCHAR(40) NOT NULL, translations JSON NOT NULL, UNIQUE INDEX UNIQ_E066A6EC989D9B62 (slug), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE `user` (id INT AUTO_INCREMENT NOT NULL, phone VARCHAR(20) NOT NULL, email VARCHAR(180) DEFAULT NULL, first_name VARCHAR(80) DEFAULT NULL, last_name VARCHAR(80) DEFAULT NULL, roles JSON NOT NULL, locale VARCHAR(5) NOT NULL, consent_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, admin_country_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_8D93D649444F97DD (phone), INDEX IDX_8D93D649311198F5 (admin_country_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE absence ADD CONSTRAINT FK_765AE0C91121EA2C FOREIGN KEY (practitioner_id) REFERENCES practitioner (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE api_token ADD CONSTRAINT FK_7BA2F5EBA76ED395 FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE appointment ADD CONSTRAINT FK_FE38F8446B899279 FOREIGN KEY (patient_id) REFERENCES `user` (id)');
        $this->addSql('ALTER TABLE appointment ADD CONSTRAINT FK_FE38F84488A7E3A9 FOREIGN KEY (relative_id) REFERENCES relative (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE appointment ADD CONSTRAINT FK_FE38F8441121EA2C FOREIGN KEY (practitioner_id) REFERENCES practitioner (id)');
        $this->addSql('ALTER TABLE appointment ADD CONSTRAINT FK_FE38F844A7014910 FOREIGN KEY (facility_id) REFERENCES facility (id)');
        $this->addSql('ALTER TABLE audit_log ADD CONSTRAINT FK_F6E1C0F510DAF24A FOREIGN KEY (actor_id) REFERENCES `user` (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE availability_rule ADD CONSTRAINT FK_F6C750351121EA2C FOREIGN KEY (practitioner_id) REFERENCES practitioner (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE availability_rule ADD CONSTRAINT FK_F6C75035A7014910 FOREIGN KEY (facility_id) REFERENCES facility (id)');
        $this->addSql('ALTER TABLE city ADD CONSTRAINT FK_2D5B023498260155 FOREIGN KEY (region_id) REFERENCES region (id)');
        $this->addSql('ALTER TABLE facility ADD CONSTRAINT FK_105994B28BAC62AF FOREIGN KEY (city_id) REFERENCES city (id)');
        $this->addSql('ALTER TABLE practitioner ADD CONSTRAINT FK_17323CBCA76ED395 FOREIGN KEY (user_id) REFERENCES `user` (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE practitioner_specialty ADD CONSTRAINT FK_94A4A9C01121EA2C FOREIGN KEY (practitioner_id) REFERENCES practitioner (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE practitioner_specialty ADD CONSTRAINT FK_94A4A9C09A353316 FOREIGN KEY (specialty_id) REFERENCES specialty (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE practitioner_facility ADD CONSTRAINT FK_638422311121EA2C FOREIGN KEY (practitioner_id) REFERENCES practitioner (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE practitioner_facility ADD CONSTRAINT FK_63842231A7014910 FOREIGN KEY (facility_id) REFERENCES facility (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE region ADD CONSTRAINT FK_F62F176F92F3E70 FOREIGN KEY (country_id) REFERENCES country (id)');
        $this->addSql('ALTER TABLE relative ADD CONSTRAINT FK_6E5B37D97E3C61F9 FOREIGN KEY (owner_id) REFERENCES `user` (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE `user` ADD CONSTRAINT FK_8D93D649311198F5 FOREIGN KEY (admin_country_id) REFERENCES country (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE absence DROP FOREIGN KEY FK_765AE0C91121EA2C');
        $this->addSql('ALTER TABLE api_token DROP FOREIGN KEY FK_7BA2F5EBA76ED395');
        $this->addSql('ALTER TABLE appointment DROP FOREIGN KEY FK_FE38F8446B899279');
        $this->addSql('ALTER TABLE appointment DROP FOREIGN KEY FK_FE38F84488A7E3A9');
        $this->addSql('ALTER TABLE appointment DROP FOREIGN KEY FK_FE38F8441121EA2C');
        $this->addSql('ALTER TABLE appointment DROP FOREIGN KEY FK_FE38F844A7014910');
        $this->addSql('ALTER TABLE audit_log DROP FOREIGN KEY FK_F6E1C0F510DAF24A');
        $this->addSql('ALTER TABLE availability_rule DROP FOREIGN KEY FK_F6C750351121EA2C');
        $this->addSql('ALTER TABLE availability_rule DROP FOREIGN KEY FK_F6C75035A7014910');
        $this->addSql('ALTER TABLE city DROP FOREIGN KEY FK_2D5B023498260155');
        $this->addSql('ALTER TABLE facility DROP FOREIGN KEY FK_105994B28BAC62AF');
        $this->addSql('ALTER TABLE practitioner DROP FOREIGN KEY FK_17323CBCA76ED395');
        $this->addSql('ALTER TABLE practitioner_specialty DROP FOREIGN KEY FK_94A4A9C01121EA2C');
        $this->addSql('ALTER TABLE practitioner_specialty DROP FOREIGN KEY FK_94A4A9C09A353316');
        $this->addSql('ALTER TABLE practitioner_facility DROP FOREIGN KEY FK_638422311121EA2C');
        $this->addSql('ALTER TABLE practitioner_facility DROP FOREIGN KEY FK_63842231A7014910');
        $this->addSql('ALTER TABLE region DROP FOREIGN KEY FK_F62F176F92F3E70');
        $this->addSql('ALTER TABLE relative DROP FOREIGN KEY FK_6E5B37D97E3C61F9');
        $this->addSql('ALTER TABLE `user` DROP FOREIGN KEY FK_8D93D649311198F5');
        $this->addSql('DROP TABLE absence');
        $this->addSql('DROP TABLE api_token');
        $this->addSql('DROP TABLE appointment');
        $this->addSql('DROP TABLE audit_log');
        $this->addSql('DROP TABLE availability_rule');
        $this->addSql('DROP TABLE city');
        $this->addSql('DROP TABLE country');
        $this->addSql('DROP TABLE facility');
        $this->addSql('DROP TABLE notification');
        $this->addSql('DROP TABLE otp_code');
        $this->addSql('DROP TABLE practitioner');
        $this->addSql('DROP TABLE practitioner_specialty');
        $this->addSql('DROP TABLE practitioner_facility');
        $this->addSql('DROP TABLE region');
        $this->addSql('DROP TABLE relative');
        $this->addSql('DROP TABLE specialty');
        $this->addSql('DROP TABLE `user`');
    }
}
