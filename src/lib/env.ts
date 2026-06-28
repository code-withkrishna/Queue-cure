// ============================================================
// Environment Variable Guard
//
// Why this exists: the Supabase client factories used to fall
// back to literal 'placeholder' values when an env var was
// missing (e.g. `process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'`).
// That meant a missing env var didn't fail at startup — it failed
// later, deep in a network call to https://placeholder.supabase.co,
// with a confusing error that gave no hint which variable was
// actually missing.
//
// requireEnv() fails loudly and immediately, with the exact
// variable name and a pointer to where to fix it.
// ============================================================

export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `→ Copy .env.example to .env.local and fill in ${name}.\n` +
        `→ See README.md → "Environment Variables" for the full list and where to find each value.`
    );
  }

  return value;
}

/**
 * Same validation as requireEnv(), but takes the VALUE directly instead
 * of looking it up by name. Use this for any NEXT_PUBLIC_* variable that
 * might end up in browser-bundled code.
 *
 * Why: Next.js inlines NEXT_PUBLIC_* vars via a static, compile-time text
 * replacement of the literal pattern `process.env.NEXT_PUBLIC_X`. It cannot
 * resolve a dynamic `process.env[name]` lookup — that pattern is never
 * replaced, so in a browser bundle it silently evaluates to undefined no
 * matter what's actually configured in your deployment. Call sites must
 * write the static literal themselves and pass the result in here:
 *
 *   assertEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
 */
export function assertEnv(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `→ Copy .env.example to .env.local and fill in ${name}.\n` +
        `→ See README.md → "Environment Variables" for the full list and where to find each value.`
    );
  }

  return value;
}
