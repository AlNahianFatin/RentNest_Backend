/*
  Warnings:

  - You are about to drop the column `stripeTransactionId` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripePaymentId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stripePaymentId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "payments_stripeTransactionId_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "stripeTransactionId",
ADD COLUMN     "stripePaymentId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentId_key" ON "payments"("stripePaymentId");
