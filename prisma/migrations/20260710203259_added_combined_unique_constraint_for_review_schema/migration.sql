/*
  Warnings:

  - A unique constraint covering the columns `[reviewerId,propertyId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "payments_stripeCustomerId_key";

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewerId_propertyId_key" ON "reviews"("reviewerId", "propertyId");
