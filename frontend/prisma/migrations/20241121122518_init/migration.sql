-- CreateTable
CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "logs" TEXT NOT NULL,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);
