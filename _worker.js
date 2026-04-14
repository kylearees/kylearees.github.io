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
      const username = (formData.get("username") || "").toLowerCase().trim();
      const password = (formData.get("password") || "").trim();

      if (!username || !password) {
        return new Response(null, { status: 302, headers: { "Location": "/login.html?error=1" } });
      }

      try {
        // Look up by payroll number in kw_users
        const supabaseKey = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY;
        const res = await fetch(
          `${env.SUPABASE_URL}/rest/v1/kw_users?payroll=eq.${encodeURIComponent(password)}&select=display_name&limit=1`,
          {
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`
            }
          }
        );

        if (res.ok) {
          const users = await res.json();
          if (users && users.length > 0) {
            // Normalize stored name to lowercase for comparison
            const storedName = (users[0].display_name || "").toLowerCase().trim();
            // Split both into words and check the submitted words all appear in the stored name
            const submittedWords = username.split(/\s+/).filter(Boolean);
            const nameMatches = submittedWords.length > 0 &&
              submittedWords.every(word => storedName.includes(word));

            if (nameMatches) {
              return new Response("Redirecting...", {
                status: 302,
                headers: {
                  "Location": "/",
                  "Set-Cookie": "logged_in=true; Path=/; HttpOnly; Max-Age=2592000; SameSite=Lax"
                }
              });
            }
          }
        }
      } catch (e) {
        // Network/Supabase error — fall through to error redirect
      }

      return new Response(null, { status: 302, headers: { "Location": "/login.html?error=1" } });
    }

    // 4. NOT LOGGED IN - redirect to login
    return new Response("Redirecting to login...", {
      status: 302,
      headers: { "Location": "/login.html" }
    });
  }
};
