export async function onRequestGet(context) {
  const { env } = context;
  // Desabilitado quando o Discord OAuth2 estiver configurado (login exclusivo via Discord).
  if (env.DISCORD_CLIENT_ID) {
    return new Response("Not found", { status: 404 });
  }
  const sessionPayload = JSON.stringify({
    userId: "demo_user",
    username: "Estudante Demo",
    avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
  });
  const encodedSession = btoa(encodeURIComponent(sessionPayload));
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/?login=success",
      "Set-Cookie": `discord_session=${encodedSession}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400; Secure`,
    },
  });
}
