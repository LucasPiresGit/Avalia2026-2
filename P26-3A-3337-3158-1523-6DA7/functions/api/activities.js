import {
  json,
  getSessionUser,
  ensureSchema,
  CATEGORIES,
  CAP_PER_CATEGORY,
  isValidUrl,
} from "../_utils.js";

export async function onRequest(context) {
  const { request, env } = context;
  const user = getSessionUser(request);

  if (!user) {
    return json({ ok: false, error: "Autenticação via Discord obrigatória." }, 401);
  }
  if (!env.DB) {
    return json({ ok: false, error: "Banco D1 não disponível." }, 503);
  }

  await ensureSchema(env);

  if (request.method === "GET") {
    const res = await env.DB.prepare(
      "SELECT id, user_id, username, category, title, hours, certificate_url, created_at FROM activities WHERE user_id = ? ORDER BY id DESC"
    )
      .bind(user.userId)
      .all();
    return json({ ok: true, activities: res.results || [] });
  }

  if (request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "JSON inválido." }, 400);
    }

    const category = String(body.category || "")
      .trim()
      .toLowerCase();
    const title = String(body.title || "").trim().slice(0, 200);
    const hours = Number(body.hours);
    const certificateUrl = String(
      body.certificateUrl || body.certificate_url || ""
    )
      .trim()
      .slice(0, 2000);

    if (!CATEGORIES.includes(category)) {
      return json({ ok: false, error: "Categoria inválida. Use ensino, pesquisa ou extensão." }, 400);
    }
    if (!title) {
      return json({ ok: false, error: "Título/descrição da atividade é obrigatório." }, 400);
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 1000) {
      return json({ ok: false, error: "Carga horária deve ser um número positivo." }, 400);
    }
    if (!certificateUrl || !isValidUrl(certificateUrl)) {
      return json({ ok: false, error: "Link do certificado digital inválido (URL http/https)." }, 400);
    }

    // Garante que o usuario exista em discord_users (FK) mesmo em modo demo
    await env.DB.prepare(
      "INSERT INTO discord_users (user_id, username, avatar, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, updated_at = CURRENT_TIMESTAMP"
    )
      .bind(user.userId, user.username, user.avatar || null)
      .run();

    // Regra de teto maximo por categoria (validada no servidor)
    const sumRow = await env.DB.prepare(
      "SELECT COALESCE(SUM(hours), 0) AS total FROM activities WHERE user_id = ? AND category = ?"
    )
      .bind(user.userId, category)
      .first();
    const current = Number(sumRow?.total || 0);
    if (current + hours > CAP_PER_CATEGORY) {
      const available = Math.max(0, CAP_PER_CATEGORY - current);
      return json(
        {
          ok: false,
          error: `Teto de ${CAP_PER_CATEGORY}h atingido para a categoria ${category}. Disponível: ${available.toFixed(2)}h.`,
        },
        409
      );
    }

    await env.DB.prepare(
      "INSERT INTO activities (user_id, username, category, title, hours, certificate_url) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(user.userId, user.username, category, title, hours, certificateUrl)
      .run();

    return json({ ok: true, message: "Atividade registrada e validada com sucesso." }, 201);
  }

  if (request.method === "DELETE") {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return json({ ok: false, error: "Parâmetro id obrigatório." }, 400);
    }
    await env.DB.prepare("DELETE FROM activities WHERE id = ? AND user_id = ?")
      .bind(id, user.userId)
      .run();
    return json({ ok: true });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}
