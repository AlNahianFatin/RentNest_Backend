/*
  Warnings:

  - You are about to drop the column `paidAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentId` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stripeSubscriptionId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED');

-- DropIndex
DROP INDEX "payments_stripePaymentId_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "paidAt",
DROP COLUMN "status",
DROP COLUMN "stripePaymentId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rentalStatus" "RentalStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "stripeSubscriptionId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeSubscriptionId_key" ON "payments"("stripeSubscriptionId");
