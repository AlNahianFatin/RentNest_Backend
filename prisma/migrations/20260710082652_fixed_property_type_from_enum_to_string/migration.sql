/*
  Warnings:

  - A unique constraint covering the columns `[propertyType]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `propertyType` on the `categories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `price` on the `properties` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "categories" DROP COLUMN "propertyType",
ADD COLUMN     "propertyType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "price",
ADD COLUMN     "price" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "PropertyType";

-- CreateIndex
CREATE UNIQUE INDEX "categories_propertyType_key" ON "categories"("propertyType");
