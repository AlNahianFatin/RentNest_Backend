/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,propertyId]` on the table `rentalRequests` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[landlordId,propertyId]` on the table `rentalRequests` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "rentalRequests_propertyId_idx" ON "rentalRequests"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "rentalRequests_tenantId_propertyId_key" ON "rentalRequests"("tenantId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "rentalRequests_landlordId_propertyId_key" ON "rentalRequests"("landlordId", "propertyId");
