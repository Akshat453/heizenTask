/*
  Warnings:

  - Made the column `status` on table `DeliveryDrop` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_ownerEmployeeId_fkey";

-- DropIndex
DROP INDEX "Order_companyId_deliveryDate_status_idx";

-- AlterTable
ALTER TABLE "DeliveryDrop" ALTER COLUMN "status" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Order_status_deliveryDate_idx" ON "Order"("status", "deliveryDate");

-- CreateIndex
CREATE INDEX "Order_companyId_status_deliveryDate_idx" ON "Order"("companyId", "status", "deliveryDate");

-- CreateIndex
CREATE INDEX "Order_companyId_billableTotalCents_idx" ON "Order"("companyId", "billableTotalCents");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerEmployeeId_fkey" FOREIGN KEY ("ownerEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
