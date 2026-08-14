-- AlterTable
ALTER TABLE `product_barcodes` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `sale_invoices` ADD COLUMN `refund_amount` DECIMAL(19, 4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `sale_items` ADD COLUMN `returned_quantity` DECIMAL(19, 4) NOT NULL DEFAULT 0;
