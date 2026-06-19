import { randomFillSync } from 'node:crypto';

// ============================================================
// Token Generator
// Format: A001, A002 ... A999, B001 ...
// Unique per day, sequential, never manually entered
// ============================================================

export function generateTokenNumber(lastTokenNumber: string | null): string {
  if (!lastTokenNumber) return 'A001';

  const prefix = lastTokenNumber.charAt(0).toUpperCase();
  const num    = parseInt(lastTokenNumber.slice(1), 10);

  if (isNaN(num)) return 'A001';
  if (num >= 999) {
    const nextChar = String.fromCharCode(prefix.charCodeAt(0) + 1);
    if (nextChar > 'Z') return 'A001';
    return `${nextChar}001`;
  }

  return `${prefix}${String(num + 1).padStart(3, '0')}`;
}

// SECURITY FIX: crypto.getRandomValues() instead of Math.random()
// Eliminates predictable access code generation.
// Works in both browser (Web Crypto) and Node.js (crypto module).
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes ambiguous: 0,1,I,O
  const array = new Uint8Array(6);

  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    // Node.js fallback (used in API routes during SSR)
    randomFillSync(array);
  }

  return Array.from(array)
    .map((byte) => chars[byte % chars.length])
    .join('');
}
