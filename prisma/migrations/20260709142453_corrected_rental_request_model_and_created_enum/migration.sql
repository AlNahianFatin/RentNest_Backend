/*
  Warnings:

  - You are about to drop the column `content` on the `rentalRequests` table. All the data in the column will be lost.
  - You are about to drop the column `isFeatured` on the `rentalRequests` table. All the data in the column will be lost.
  - You are about to drop the column `isPremium` on the `rentalRequests` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `rentalRequests` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `rentalRequests` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `rentalRequests` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `rentalRequests` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('ACCEPTED', 'PENDING', 'REJECTED');

-- AlterTable
ALTER TABLE "rentalRequests" DROP COLUMN "content",
DROP COLUMN "isFeatured",
DROP COLUMN "isPremium",
DROP COLUMN "tags",
DROP COLUMN "thumbnail",
DROP COLUMN "title",
DROP COLUMN "views",
ADD COLUMN     "status" "RequestStatus" NOT NULL DEFAULT 'PENDING';
