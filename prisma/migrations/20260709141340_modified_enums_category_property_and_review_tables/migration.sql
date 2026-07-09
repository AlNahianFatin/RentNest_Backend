/*
  Warnings:

  - You are about to drop the column `propertType` on the `categories` table. All the data in the column will be lost.
  - Added the required column `propertyType` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `properties` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'PENDING', 'SOLD');

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "propertType",
ADD COLUMN     "propertyType" "PropertyType" NOT NULL;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "status" "PropertyStatus" NOT NULL;
