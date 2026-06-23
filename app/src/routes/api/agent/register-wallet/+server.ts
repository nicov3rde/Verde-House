import { error, json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { agentRegistrations } from "$lib/db/schema";
import { eq } from "drizzle-orm";
import { generateNonce } from "$lib/server/services/walletVerification"; // We will create this service

export const POST = async ({ request, locals }) => {
  // Only authenticated administrators should be able to call this endpoint
  // For now, we'll assume a basic check, but a full admin check would be needed
  const session = await locals.auth.validate();
  if (!session || !locals.user || locals.user.role !== 'admin') {
    throw error(403, "Forbidden");
  }

  const { userId, walletAddress, chainId } = await request.json();

  if (!userId || !walletAddress || !chainId) {
    throw error(400, "Missing userId, walletAddress, or chainId");
  }

  // Check if a registration already exists for this user
  const existingRegistration = await db.query.agentRegistrations.findFirst({
    where: eq(agentRegistrations.userId, userId),
  });

  if (existingRegistration && existingRegistration.verifiedAt) {
    throw error(409, "User already has a verified wallet registration.");
  }

  const verificationNonce = generateNonce(); // Generate a unique nonce

  let result;
  if (existingRegistration) {
    // Update existing unverified registration
    result = await db
      .update(agentRegistrations)
      .set({
        walletAddress,
        chainId,
        verificationNonce,
        signature: null, // Clear previous signature if any
        verifiedAt: null, // Clear previous verification if any
        registeredBy: session.user.userId,
        createdAt: new Date(), // Update creation time
      })
      .where(eq(agentRegistrations.userId, userId))
      .returning();
  } else {
    // Create new registration
    result = await db
      .insert(agentRegistrations)
      .values({
        userId,
        walletAddress,
        chainId,
        verificationNonce,
        registeredBy: session.user.userId,
      })
      .returning();
  }

  if (result.length === 0) {
    throw error(500, "Failed to create or update agent registration.");
  }

  return json({
    message: "Verification nonce generated. Please sign it with your wallet.",
    userId: result[0].userId,
    walletAddress: result[0].walletAddress,
    chainId: result[0].chainId,
    verificationNonce: result[0].verificationNonce,
  });
};
