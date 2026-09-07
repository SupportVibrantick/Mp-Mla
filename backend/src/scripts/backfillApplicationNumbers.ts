import prisma from "../lib/prisma.js";
import { generateApplicationNumber } from "../services/voterPortal/applicationNumber.service.js";
import { createVoterAccountForVoter } from "../services/voterPortal/voterAuth.service.js";

async function backfillVoterApplicationNumbers() {
  console.log("🔍 Checking for existing voters without application numbers...");

  const votersWithoutAppNum = await prisma.voter.findMany({
    where: {
      OR: [
        { applicationNumber: null },
        { applicationNumber: "" },
      ],
    },
    select: {
      id: true,
      tenantId: true,
      phone: true,
      name: true,
    },
  });

  console.log(`📊 Found ${votersWithoutAppNum.length} voters needing application numbers.`);

  if (votersWithoutAppNum.length === 0) {
    console.log("✅ All voters already have application numbers!");
    process.exit(0);
  }

  let count = 0;
  for (const voter of votersWithoutAppNum) {
    try {
      const appNumber = await generateApplicationNumber(voter.tenantId);

      await prisma.voter.update({
        where: { id: voter.id },
        data: {
          applicationNumber: appNumber,
          forcePasswordChange: true,
        },
      });

      await createVoterAccountForVoter(voter.tenantId, voter.id, appNumber, voter.phone ?? undefined);
      count++;
      if (count % 50 === 0 || count === votersWithoutAppNum.length) {
        console.log(`  Processed ${count}/${votersWithoutAppNum.length} voters...`);
      }
    } catch (err: any) {
      console.error(`❌ Failed for voter ${voter.id} (${voter.name}): ${err.message}`);
    }
  }

  console.log(`🎉 Backfill complete! ${count} voters updated with application numbers and portal accounts.`);
  process.exit(0);
}

backfillVoterApplicationNumbers().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
