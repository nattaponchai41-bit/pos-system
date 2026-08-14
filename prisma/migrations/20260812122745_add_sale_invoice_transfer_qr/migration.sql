-- AlterTable
ALTER TABLE `product_barcodes` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `sale_invoices` MODIFY `type` ENUM('CASH', 'TRANSFER', 'QR', 'CREDIT') NOT NULL;
