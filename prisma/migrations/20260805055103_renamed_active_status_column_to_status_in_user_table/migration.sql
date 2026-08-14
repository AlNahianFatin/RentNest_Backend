/*
  Warnings:

  - You are about to drop the column `activeStatus` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "activeStatus",
ADD COLUMN     "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE';
