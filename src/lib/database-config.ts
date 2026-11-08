export function databaseConfig() {
  return {
    url:
      process.env.DATABASE_URL?.trim() ||
      process.env.TURSO_DATABASE_URL?.trim(),
    authToken:
      process.env.DATABASE_AUTH_TOKEN?.trim() ||
      process.env.TURSO_AUTH_TOKEN?.trim(),
  };
}

export function hasRemoteDatabase(url = databaseConfig().url): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      ["libsql:", "https:", "wss:"].includes(parsed.protocol) &&
      !!parsed.hostname
    );
  } catch {
    return false;
  }
}

export function catalogPreviewMode(): boolean {
  return !!process.env.VERCEL && !hasRemoteDatabase();
}
