import { error, json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { agentRegistrations } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyMessage } from "$lib/server/services/walletVerification";

export const POST = async ({ request, locals }) => {
  // Only authenticated administrators should be able to call this endpoint
  const session = await locals.auth.validate();
  if (!session || !locals.user || locals.user.role !== 'admin') {
    throw error(403, "Forbidden");
  }

  const { userId, walletAddress, chainId, verificationNonce, signature } = await request.json();

  if (!userId || !walletAddress || !chainId || !verificationNonce || !signature) {
    throw error(400, "Missing required fields.");
  }

  const registration = await db.query.agentRegistrations.findFirst({
    where: eq(agentRegistrations.userId, userId),
  });

  if (!registration || registration.verificationNonce !== verificationNonce) {
    throw error(400, "Invalid user or verification nonce.");
  }

  if (registration.verifiedAt) {
    throw error(409, "Wallet already verified for this user.");
  }

  // Verify the signature (using viem's verifyMessage equivalent)
  const isSignatureValid = verifyMessage(
    verificationNonce,
    signature,
    walletAddress
  );

  if (!isSignatureValid) {
    throw error(401, "Invalid signature.");
  }

  // Update the registration as verified
  await db
    .update(agentRegistrations)
    .set({
      signature,
      verifiedAt: new Date(),
    })
    .where(eq(agentRegistrations.userId, userId));

  return json({ message: "Wallet successfully verified." });
};
