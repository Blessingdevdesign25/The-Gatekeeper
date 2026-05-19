import bcrypt from 'bcrypt';

// Cost factor 12: ~250-400ms per hash on modern hardware.
// This limits brute-force attempts to a few per second even with specialised hardware.
// Increase this as hardware gets faster (re-hash on next login is the standard approach).
const COST_FACTOR = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

// bcrypt.compare is timing-safe — it does not short-circuit on the first
// differing character, preventing timing-based user enumeration.
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
