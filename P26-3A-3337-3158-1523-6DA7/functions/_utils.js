/**
 * Utilitarios compartilhados pelas Cloudflare Pages Functions.
 * Arquivo com prefixo "_" para nao ser exposto como rota publica.
 */

export const CHAVE_PROJETO = "P26-3A-3337-3158-1523-6DA7";
export const CATEGORIES = ["ensino", "pesquisa", "extensao"];
export const CATEGORY_LABELS = {
  ensino: "Ensino",
  pesquisa: "Pesquisa",
  extensao: "Extensão",
};
export const CAP_PER_CATEGORY = 60;
export const TOTAL_REQUIRED = 180;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export function getSessionUser(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/discord_session=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(match[1])));
  } catch {
    return null;
  }
}

export function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function ensureSchema(env) {
  if (!env || !env.DB) return;
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS discord_users (
      user_id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      avatar TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('ensino','pesquisa','extensao')),
      title TEXT NOT NULL,
      hours REAL NOT NULL,
      certificate_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id)"
  ).run();
  await env.DB.prepare(
    "CREATE INDEX IF NOT EXISTS idx_activities_user_cat ON activities(user_id, category)"
  ).run();
}
