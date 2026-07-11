/*
  Warnings:

  - The values [BLOCKED] on the enum `ActiveStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ActiveStatus_new" AS ENUM ('ACTIVE', 'BANNED');
ALTER TABLE "public"."users" ALTER COLUMN "activeStatus" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "activeStatus" TYPE "ActiveStatus_new" USING ("activeStatus"::text::"ActiveStatus_new");
ALTER TYPE "ActiveStatus" RENAME TO "ActiveStatus_old";
ALTER TYPE "ActiveStatus_new" RENAME TO "ActiveStatus";
DROP TYPE "public"."ActiveStatus_old";
ALTER TABLE "users" ALTER COLUMN "activeStatus" SET DEFAULT 'ACTIVE';
COMMIT;
