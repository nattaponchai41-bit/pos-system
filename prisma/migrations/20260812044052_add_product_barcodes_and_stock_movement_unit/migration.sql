/*
  Warnings:

  - Added the required column `base_quantity` to the `stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `units` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `stock_movements` ADD COLUMN `base_quantity` DECIMAL(19, 4) NOT NULL DEFAULT 0,
    ADD COLUMN `product_unit_id` VARCHAR(191) NULL,
    MODIFY `type` ENUM('INITIAL', 'PURCHASE', 'SALE', 'CREDIT_SALE', 'RETURN', 'DAMAGE', 'STOCK_COUNT', 'ADJUSTMENT', 'CANCEL_SALE') NOT NULL;

-- AlterTable
ALTER TABLE `units` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `product_barcodes` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `product_unit_id` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_barcodes_barcode_key`(`barcode`),
    INDEX `product_barcodes_product_id_idx`(`product_id`),
    INDEX `product_barcodes_product_unit_id_idx`(`product_unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `products_name_idx` ON `products`(`name`);

-- CreateIndex
CREATE INDEX `stock_movements_product_unit_id_idx` ON `stock_movements`(`product_unit_id`);

-- AddForeignKey
ALTER TABLE `product_barcodes` ADD CONSTRAINT `product_barcodes_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_barcodes` ADD CONSTRAINT `product_barcodes_product_unit_id_fkey` FOREIGN KEY (`product_unit_id`) REFERENCES `product_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_product_unit_id_fkey` FOREIGN KEY (`product_unit_id`) REFERENCES `product_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
