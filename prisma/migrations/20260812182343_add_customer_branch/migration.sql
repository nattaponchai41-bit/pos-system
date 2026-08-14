-- AlterTable
ALTER TABLE `customers` ADD COLUMN `branch` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product_barcodes` ALTER COLUMN `updated_at` DROP DEFAULT;
