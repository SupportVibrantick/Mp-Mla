import prisma from "../../lib/prisma.js";

/**
 * Generates the next sequential application number for a voter in a given tenant.
 * Format: APP-{YEAR}-{SIX_DIGIT_SEQ} (e.g. APP-2026-000001)
 */
export async function generateApplicationNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();

  const seq = await prisma.$transaction(async (tx) => {
    let sequence = await tx.voterApplicationSequence.findUnique({
      where: { tenantId },
    });

    if (!sequence) {
      sequence = await tx.voterApplicationSequence.create({
        data: {
          tenantId,
          prefix: "APP",
          currentNumber: 1,
        },
      });
      return sequence.currentNumber;
    } else {
      const updated = await tx.voterApplicationSequence.update({
        where: { tenantId },
        data: {
          currentNumber: { increment: 1 },
        },
      });
      return updated.currentNumber;
    }
  });

  const formattedNum = String(seq).padStart(6, "0");
  return `APP-${currentYear}-${formattedNum}`;
}

/**
 * Reserve a batch range of application numbers for bulk upload.
 * Returns an array of formatted application numbers.
 */
export async function generateApplicationNumberBatch(
  tenantId: string,
  count: number
): Promise<string[]> {
  if (count <= 0) return [];
  const currentYear = new Date().getFullYear();

  const startSeq = await prisma.$transaction(async (tx) => {
    let sequence = await tx.voterApplicationSequence.findUnique({
      where: { tenantId },
    });

    if (!sequence) {
      await tx.voterApplicationSequence.create({
        data: {
          tenantId,
          prefix: "APP",
          currentNumber: count,
        },
      });
      return 1;
    } else {
      const prev = sequence.currentNumber;
      await tx.voterApplicationSequence.update({
        where: { tenantId },
        data: {
          currentNumber: { increment: count },
        },
      });
      return prev + 1;
    }
  });

  const appNumbers: string[] = [];
  for (let i = 0; i < count; i++) {
    const num = String(startSeq + i).padStart(6, "0");
    appNumbers.push(`APP-${currentYear}-${num}`);
  }

  return appNumbers;
}
