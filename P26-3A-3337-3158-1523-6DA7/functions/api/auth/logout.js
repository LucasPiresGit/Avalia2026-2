export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": "discord_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure",
    },
  });
}
