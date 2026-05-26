// Centralized, type-safe access to environment variables.
// Fails loudly at startup if a required variable is missing.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill in the value.`
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : undefined;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: optional("BETTER_AUTH_URL") ?? "http://localhost:3000",
  BETTER_AUTH_EXTRA_HOSTS: optional("BETTER_AUTH_EXTRA_HOSTS"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
