-- AlterTable
ALTER TABLE `product_barcodes` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `store_settings` ADD COLUMN `purchase_order_next_number` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `purchase_order_prefix` VARCHAR(191) NOT NULL DEFAULT 'PO';
