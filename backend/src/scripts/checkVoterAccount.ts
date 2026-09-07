import prisma from "../lib/prisma.js";
import { createVoterAccountForVoter } from "../services/voterPortal/voterAuth.service.js";

async function checkAndFixVoterAccounts() {
  const voters = await prisma.voter.findMany({
    where: { isDeleted: false },
    include: {
      accountMemberships: {
        include: { voterAccount: true }
      }
    }
  });

  console.log(`Checking ${voters.length} total voters in database...`);

  for (const voter of voters) {
    if (!voter.applicationNumber) continue;

    console.log(`Voter: ${voter.name}, AppNo: ${voter.applicationNumber}, Memberships: ${voter.accountMemberships.length}`);

    if (voter.accountMemberships.length === 0) {
      console.log(` -> Creating missing account for ${voter.applicationNumber}...`);
      await createVoterAccountForVoter(voter.tenantId, voter.id, voter.applicationNumber, voter.phone);
    } else {
      // Re-hash default password to ensure clean uppercase match
      const account = voter.accountMemberships[0].voterAccount;
      if (account.forcePasswordChange) {
        console.log(` -> Re-syncing default password for ${voter.applicationNumber}...`);
        await createVoterAccountForVoter(voter.tenantId, voter.id, voter.applicationNumber, voter.phone);
      }
    }
  }

  console.log("Sync completed!");
  process.exit(0);
}

checkAndFixVoterAccounts().catch((err) => {
  console.error("Check failed:", err);
  process.exit(1);
});
