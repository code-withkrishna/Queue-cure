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
