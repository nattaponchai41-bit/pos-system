-- AlterTable
ALTER TABLE `product_barcodes` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `store_settings` ADD COLUMN `qr_payment_phone` VARCHAR(191) NULL;
