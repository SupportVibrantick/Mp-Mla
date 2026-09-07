import prisma from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { loginWithApplicationNumber } from "../services/voterPortal/voterAuth.service.js";

async function debugVoter() {
  const appNum = "APP-2026-000004";
  console.log(`=== DEBUGGING LOGIN FOR ${appNum} ===`);

  const voter = await prisma.voter.findFirst({
    where: { applicationNumber: appNum },
    include: {
      accountMemberships: {
        include: { voterAccount: true }
      }
    }
  });

  if (!voter) {
    console.log("❌ Voter NOT found in database with applicationNumber:", appNum);
    process.exit(1);
  }

  console.log("✅ Voter found:", {
    id: voter.id,
    name: voter.name,
    voterIdNumber: voter.voterIdNumber,
    applicationNumber: voter.applicationNumber,
    tenantId: voter.tenantId,
    accountMembershipsCount: voter.accountMemberships.length,
  });

  if (voter.accountMemberships.length > 0) {
    const acc = voter.accountMemberships[0].voterAccount;
    console.log("✅ VoterAccount details:", {
      accountId: acc.id,
      mobile: acc.mobile,
      status: acc.status,
      forcePasswordChange: acc.forcePasswordChange,
      passwordHash: acc.passwordHash,
    });

    const isMatchExact = await bcrypt.compare("APP-2026-000004", acc.passwordHash);
    console.log("🔑 bcrypt.compare('APP-2026-000004', passwordHash):", isMatchExact);

    try {
      const loginRes = await loginWithApplicationNumber("APP-2026-000004", "APP-2026-000004");
      console.log("🎉 loginWithApplicationNumber SUCCESS:", loginRes);
    } catch (err: any) {
      console.error("❌ loginWithApplicationNumber FAILED:", err.message, err);
    }
  }

  process.exit(0);
}

debugVoter().catch(console.error);
