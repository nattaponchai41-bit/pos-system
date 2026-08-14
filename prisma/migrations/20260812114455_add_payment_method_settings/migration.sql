-- AlterTable
ALTER TABLE `product_barcodes` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `store_settings` ADD COLUMN `bank_account_name` VARCHAR(191) NULL,
    ADD COLUMN `bank_account_number` VARCHAR(191) NULL,
    ADD COLUMN `bank_name` VARCHAR(191) NULL,
    ADD COLUMN `enable_cash_payment` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `enable_qr_payment` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `enable_transfer_payment` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `qr_as_cash_in` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `transfer_as_cash_in` BOOLEAN NOT NULL DEFAULT false;
