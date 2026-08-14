-- AlterTable
ALTER TABLE `cash_movements` MODIFY `type` ENUM('EXPENSE', 'CASH_IN', 'CASH_OUT', 'REFUND', 'DEBT_PAYMENT') NOT NULL;

-- AlterTable
ALTER TABLE `customers` ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `tax_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `debt_payments` ADD COLUMN `remaining_after` DECIMAL(19, 4) NOT NULL;

-- AlterTable
ALTER TABLE `product_barcodes` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `sale_invoices` ADD COLUMN `due_date` DATETIME(3) NULL,
    ADD COLUMN `paid_amount` DECIMAL(19, 4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `stock_movements` ALTER COLUMN `base_quantity` DROP DEFAULT;

-- AlterTable
ALTER TABLE `units` DROP COLUMN `updated_at`;

-- CreateIndex
CREATE UNIQUE INDEX `customers_email_key` ON `customers`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `customers_tax_id_key` ON `customers`(`tax_id`);

-- CreateIndex
CREATE INDEX `customers_name_idx` ON `customers`(`name`);

-- CreateIndex
CREATE INDEX `customers_is_active_idx` ON `customers`(`is_active`);

