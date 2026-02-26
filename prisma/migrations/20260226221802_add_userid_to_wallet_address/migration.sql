-- AlterTable
ALTER TABLE "WalletAddress" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "WalletAddress_userId_chain_idx" ON "WalletAddress"("userId", "chain");

-- AddForeignKey
ALTER TABLE "WalletAddress" ADD CONSTRAINT "WalletAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
