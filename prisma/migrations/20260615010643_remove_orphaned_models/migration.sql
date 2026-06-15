/*
  Warnings:

  - You are about to drop the `BillingCheckout` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Entitlement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ToolRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UploadedFile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UsageLedger` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BillingCheckout" DROP CONSTRAINT "BillingCheckout_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_uploadedFileId_fkey";

-- DropForeignKey
ALTER TABLE "Entitlement" DROP CONSTRAINT "Entitlement_userId_fkey";

-- DropForeignKey
ALTER TABLE "ToolRequest" DROP CONSTRAINT "ToolRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "UploadedFile" DROP CONSTRAINT "UploadedFile_userId_fkey";

-- DropForeignKey
ALTER TABLE "UsageLedger" DROP CONSTRAINT "UsageLedger_userId_fkey";

-- DropTable
DROP TABLE "BillingCheckout";

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "Entitlement";

-- DropTable
DROP TABLE "PaymentEvent";

-- DropTable
DROP TABLE "ToolRequest";

-- DropTable
DROP TABLE "UploadedFile";

-- DropTable
DROP TABLE "UsageLedger";
