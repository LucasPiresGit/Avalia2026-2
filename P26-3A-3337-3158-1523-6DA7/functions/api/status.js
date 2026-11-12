import {
  json,
  getSessionUser,
  ensureSchema,
  CHAVE_PROJETO,
  TOTAL_REQUIRED,
  CAP_PER_CATEGORY,
} from "../_utils.js";

export async function onRequest(context) {
  const { request, env } = context;
  const user = getSessionUser(request);

  if (request.method === "GET") {
    let dbConnected = false;
    let totalAtividades = 0;
    let totalHoras = 0;

    if (env.DB) {
      try {
        await ensureSchema(env);
        const countRow = await env.DB.prepare(
          "SELECT COUNT(*) AS total FROM activities"
        ).first();
        const sumRow = await env.DB.prepare(
          "SELECT COALESCE(SUM(hours),0) AS total FROM activities"
        ).first();
        dbConnected = true;
        totalAtividades = Number(countRow?.total || 0);
        totalHoras = Number(sumRow?.total || 0);
      } catch (err) {
        dbConnected = false;
      }
    }

    return json({
      ok: true,
      chave: CHAVE_PROJETO,
      projectId: 20,
      projectTitle: "Gerenciador de Horas Complementares",
      d1Connected: dbConnected,
      discordOAuthConfigured: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
      sessionUser: user,
      totalAtividades,
      totalHoras,
      requiredHours: TOTAL_REQUIRED,
      capPerCategory: CAP_PER_CATEGORY,
      serverTimestamp: new Date().toISOString(),
    });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
}
