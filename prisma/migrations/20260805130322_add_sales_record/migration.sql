-- CreateTable
CREATE TABLE "SalesRecord" (
    "orderNo" TEXT NOT NULL,
    "customerNo" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "orderBookRef" TEXT,
    "quoteNo" TEXT,
    "details" TEXT,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "vat" DOUBLE PRECISION NOT NULL,
    "totalWithVat" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "profitPercent" DOUBLE PRECISION NOT NULL,
    "sourceMonth" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRecord_pkey" PRIMARY KEY ("orderNo")
);
