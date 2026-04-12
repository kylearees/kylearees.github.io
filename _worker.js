export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // 1. PUBLIC PAGES
    if (
      url.pathname === "/login.html" ||
      url.pathname === "/login" ||
      url.pathname.startsWith("/mine-maps") ||
      url.pathname.startsWith("/images/") ||
      url.pathname === "/favicon.ico" ||
      url.pathname === "/Current%20Stockpile%20Maps.pdf" ||
      url.pathname === "/Current Stockpile Maps.pdf"
    ) {
      return env.ASSETS.fetch(request);
    }
    // 2. AUTHENTICATION CHECK
    const cookie = request.headers.get("Cookie") || "";
    if (cookie.includes("logged_in=true")) {
      return env.ASSETS.fetch(request);
    }
    // 3. LOGIN SUBMISSION
    if (request.method === "POST" && url.pathname === "/auth") {
      const formData = await request.formData();
      const username = formData.get("username")?.toLowerCase().trim();
      const password = formData.get("password")?.trim();
      if (!username || !password) {
        return new Response(null, { status: 302, headers: { "Location": "/login.html?error=1" } });
      }
      // Convert "firstname lastname" → "firstname.lastname@kennecott.internal"
      const email = username.replace(/\s+/g, '.') + '@kennecott.internal';
      const res = await fetch(
        `${env.SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "apikey": env.SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        }
      );
      if (res.ok) {
        return new Response("Redirecting...", {
          status: 302,
          headers: {
            "Location": "/",
            "Set-Cookie": "logged_in=true; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax"
          }
        });
      } else {
        return new Response(null, { status: 302, headers: { "Location": "/login.html?error=1" } });
      }
    }
    // 4. NOT LOGGED IN - redirect to login
    return new Response("Redirecting to login...", {
      status: 302,
      headers: { "Location": "/login.html" }
    });
  }
};
