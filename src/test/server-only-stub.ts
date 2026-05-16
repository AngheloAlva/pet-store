// Stub for `server-only` in test environments.
// The real package throws when imported outside an RSC context.
// Vitest runs in jsdom (not RSC), so we replace it with a no-op.
export {};
