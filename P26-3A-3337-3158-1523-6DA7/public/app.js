const CHAVE_PROJETO = "P26-3A-3337-3158-1523-6DA7";
const CATEGORY_LABELS = { ensino: "Ensino", pesquisa: "Pesquisa", extensao: "Extensão" };
const CAP = 60;
const REQUIRED = 180;

let sessionUser = null;
let discordConfigured = false;

function $(id) { return document.getElementById(id); }

function show(id, yes) {
  const el = $(id);
  if (el) el.style.display = yes ? "" : "none";
}

function setStatus(elId, msg, ok = true) {
  const el = $(elId);
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? "#166534" : "#991b1b";
}

function renderDiscordHeader() {
  const textEl = $("discordUserText");
  const avatarEl = $("discordAvatar");
  const logoutEl = $("logoutLink");
  const loginLink = $("discordLoginLink");
  if (sessionUser) {
    if (textEl) textEl.textContent = sessionUser.username + " (" + sessionUser.userId + ")";
    if (avatarEl) {
      avatarEl.src = sessionUser.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
      avatarEl.style.display = "inline-block";
    }
    if (logoutEl) logoutEl.style.display = "inline";
    if (loginLink) loginLink.removeAttribute("href");
  } else {
    if (textEl) textEl.textContent = discordConfigured ? "Entrar com Discord OAuth2" : "Entrar em modo demonstração";
    if (avatarEl) avatarEl.style.display = "none";
    if (logoutEl) logoutEl.style.display = "none";
    if (loginLink) loginLink.href = discordConfigured ? "/api/auth/discord" : "/api/auth/demo";
  }
}

async function fetchStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    discordConfigured = Boolean(data.discordOAuthConfigured);
    if (data.sessionUser) {
      sessionUser = data.sessionUser;
    } else {
      sessionUser = null;
    }
    renderDiscordHeader();
    return data;
  } catch {
    sessionUser = null;
    renderDiscordHeader();
    return null;
  }
}

function renderProgress(summary) {
  const container = $("progressContainer");
  const totalEl = $("totalProgress");
  if (!container) return;
  container.innerHTML = "";
  const totals = summary ? summary.totals : { ensino: 0, pesquisa: 0, extensao: 0 };
  const colors = { ensino: "#2563eb", pesquisa: "#7c3aed", extensao: "#059669" };

  for (const cat of ["ensino", "pesquisa", "extensao"]) {
    const val = Number(totals[cat] || 0);
    const pct = Math.min(100, (val / CAP) * 100);
    const wrap = document.createElement("div");
    wrap.className = "progress-row";
    wrap.innerHTML = `
      <div class="progress-label">
        <span>${CATEGORY_LABELS[cat]}</span>
        <span>${val.toFixed(2)} / ${CAP} h</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%;background:${colors[cat]}"></div>
      </div>
      <div class="progress-hint">Faltam ${(CAP - val).toFixed(2)} h para o teto desta modalidade.</div>
    `;
    container.appendChild(wrap);
  }

  if (totalEl && summary) {
    const pct = Math.min(100, (summary.total / REQUIRED) * 100);
    totalEl.innerHTML = `
      <div class="progress-label"><strong>Total validado</strong><strong>${summary.total.toFixed(2)} / ${REQUIRED} h</strong></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;background:#0f172a"></div></div>
      <div class="progress-hint">Integralização curricular: ${pct.toFixed(1)}%.</div>
    `;
  }
}

async function fetchSummary() {
  if (!sessionUser) return null;
  try {
    const res = await fetch("/api/summary");
    if (!res.ok) return null;
    const data = await res.json();
    renderProgress(data);
    return data;
  } catch {
    return null;
  }
}

async function fetchActivities() {
  const listEl = $("recordsList");
  if (!listEl) return;
  if (!sessionUser) {
    listEl.innerHTML = "<li>Faça login com Discord para ver suas atividades.</li>";
    return;
  }
  try {
    const res = await fetch("/api/activities");
    const data = await res.json();
    listEl.innerHTML = "";
    const items = Array.isArray(data.activities) ? data.activities : [];
    if (items.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Nenhuma atividade registrada ainda.";
      listEl.appendChild(li);
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.href = item.certificate_url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "certificado";
      li.innerHTML = "";
      const badge = document.createElement("span");
      badge.className = "badge badge-" + item.category;
      badge.textContent = CATEGORY_LABELS[item.category] || item.category;
      li.appendChild(badge);
      const txt = document.createElement("span");
      txt.textContent = ` ${item.title} — ${Number(item.hours).toFixed(2)}h `;
      li.appendChild(txt);
      li.appendChild(link);
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `${item.username} • ${item.created_at}`;
      li.appendChild(meta);
      listEl.appendChild(li);
    });
  } catch {
    listEl.innerHTML = "<li>Modo estático local. Publique no Cloudflare Pages para ativar a API.</li>";
  }
}

async function submitActivity() {
  const statusEl = $("statusMessage");
  if (!sessionUser) {
    setStatus("statusMessage", "Faça login com Discord antes de registrar.", false);
    return;
  }
  const category = $("categoryInput").value;
  const title = ($("titleInput").value || "").trim();
  const hours = ($("hoursInput").value || "").trim();
  const certificateUrl = ($("certInput").value || "").trim();

  if (!title) { setStatus("statusMessage", "Informe o título da atividade.", false); return; }
  if (!hours) { setStatus("statusMessage", "Informe a carga horária.", false); return; }
  if (!certificateUrl) { setStatus("statusMessage", "Informe o link do certificado.", false); return; }

  setStatus("statusMessage", "Enviando para Cloudflare Function...");
  try {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, title, hours: Number(hours), certificateUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      $("titleInput").value = "";
      $("hoursInput").value = "";
      $("certInput").value = "";
      setStatus("statusMessage", data.message || "Atividade registrada e validada com sucesso.");
      await fetchSummary();
      await fetchActivities();
    } else {
      setStatus("statusMessage", data.error || "Erro ao registrar.", false);
    }
  } catch {
    setStatus("statusMessage", "API disponível após o deploy no Cloudflare Pages.", false);
  }
}

function applyAuthUI() {
  const logged = !!sessionUser;
  show("dashboardCard", logged);
  show("formCard", logged);
  show("listCard", true);
  if (!logged) {
    $("authMessage").textContent = "Autentique-se com Discord para registrar e acompanhar suas horas complementares.";
  } else {
    $("authMessage").textContent = "Sessão ativa. Registre suas atividades abaixo.";
  }
}

async function init() {
  const params = new URLSearchParams(location.search);
  await fetchStatus();
  applyAuthUI();
  if (sessionUser) {
    await fetchSummary();
    await fetchActivities();
  } else {
    renderProgress(null);
    await fetchActivities();
  }
  if (params.get("login") === "success") {
    // refresh session after redirect
    await fetchStatus();
    applyAuthUI();
    if (sessionUser) {
      await fetchSummary();
      await fetchActivities();
    }
  }
  if (params.get("auth_error")) {
    setStatus("authMessage", "Erro de autenticação: " + params.get("auth_error"), false);
  }
}

$("sendBtn")?.addEventListener("click", submitActivity);
init();
