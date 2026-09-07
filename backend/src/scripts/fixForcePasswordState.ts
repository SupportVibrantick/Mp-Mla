import prisma from "../lib/prisma.js";

async function fixState() {
  console.log("Fixing forcePasswordChange state across database...");

  // Synchronize Voter table forcePasswordChange with VoterAccount status
  const accountsWithPasswordChanged = await prisma.voterAccount.findMany({
    where: { forcePasswordChange: false },
    include: { memberships: { select: { voterId: true } } }
  });

  for (const acc of accountsWithPasswordChanged) {
    const voterIds = acc.memberships.map(m => m.voterId);
    if (voterIds.length > 0) {
      await prisma.voter.updateMany({
        where: { id: { in: voterIds } },
        data: { forcePasswordChange: false }
      });
      console.log(`Updated ${voterIds.length} voters for account ${acc.id} (${acc.mobile}) to forcePasswordChange: false`);
    }
  }

  console.log("Done!");
  process.exit(0);
}

fixState().catch(console.error);
