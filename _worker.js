export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. PUBLIC PAGES
    if (
      url.pathname === "/login.html" ||
      url.pathname === "/login" ||
      url.pathname.startsWith("/mine-maps") ||
      url.pathname.startsWith("/images/") ||
      url.pathname === "/favicon.ico"
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
        return new Response("Invalid Name or Payroll Number", { status: 401 });
      }

      // Look up user in Supabase
      const supabaseUrl = env.SUPABASE_URL;
      const supabaseKey = env.SUPABASE_SERVICE_KEY;

      const res = await fetch(
        `${supabaseUrl}/rest/v1/kw_users?username=eq.${encodeURIComponent(username)}&select=password_hash`,
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`
          }
        }
      );

      const users = await res.json();

      if (!users || users.length === 0) {
        return new Response("Invalid Name or Payroll Number", { status: 401 });
      }

      // Verify password using bcrypt
      // Since we can't run bcrypt in a Worker, we'll verify via a Supabase function
      // Instead, store a simple hash we can verify here
      const storedHash = users[0].password_hash;

      // Use the Web Crypto API to compare
      // We'll do a direct payroll comparison against the hash via Supabase RPC
      const rpcRes = await fetch(
        `${supabaseUrl}/rest/v1/rpc/verify_user`,
        {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ p_username: username, p_password: password })
        }
      );

      const valid = await rpcRes.json();

      if (valid === true) {
        return new Response("Redirecting...", {
          status: 302,
          headers: {
            "Location": "/",
            
            "Set-Cookie": "logged_in=true; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax"
          }
        });
      } else {
        return new Response("Invalid Name or Payroll Number", { status: 401 });
      }
    }

    // 4. NOT LOGGED IN - redirect to login
    return new Response("Redirecting to login...", {
      status: 302,
      headers: { "Location": "/login.html" }
    });
  }
};
