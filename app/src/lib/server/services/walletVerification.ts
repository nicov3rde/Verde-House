import crypto from 'crypto';
import { verifyMessage as viemVerifyMessage } from 'viem';

export function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function verifyMessage(
  message: string,
  signature: `0x${string}`,
  address: `0x${string}`
): Promise<boolean> {
  try {
    return await viemVerifyMessage({
      message,
      signature,
      address,
    });
  } catch (e) {
    console.error("Error verifying message:", e);
    return false;
  }
}