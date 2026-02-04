export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. PUBLIC PAGES: Allow everyone to see these without logging in
    // This includes the login page itself, your mine maps, and the image assets
    if (
      url.pathname === "/login.html" || 
      url.pathname === "/login" || 
      url.pathname.startsWith("/mine-maps") || 
      url.pathname.startsWith("/images/")
    ) {
      return env.ASSETS.fetch(request);
    }

    // 2. AUTHENTICATION CHECK: Check if they have the 'logged_in' cookie
    const cookie = request.headers.get("Cookie") || "";
    if (cookie.includes("logged_in=true")) {
      return env.ASSETS.fetch(request);
    }

    // 3. LOGIN SUBMISSION: Handle the POST request from your HTML login form
    if (request.method === "POST" && url.pathname === "/auth") {
      const formData = await request.formData();
      const userFullname = formData.get("username")?.toLowerCase().trim();
      const userPayroll = formData.get("password");

      // Look up the name in your STAFF_LIST KV database
      const storedPayroll = await env.STAFF_LIST.get(userFullname);

      if (storedPayroll && storedPayroll === userPayroll) {
        // Success! Give them a cookie valid for 24 hours and redirect to homepage
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

    // 4. PROTECT ALL OTHER PAGES: If not logged in, redirect to the login page
    return Response.redirect(`${url.origin}/login.html`, 302);
  }
};
