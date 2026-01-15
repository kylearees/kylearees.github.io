export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Let people see the login page so they can actually log in
    if (url.pathname === "/login.html" || url.pathname === "/login") {
      return env.ASSETS.fetch(request);
    }

    // 2. Check if they have a 'permission slip' (cookie) already
    const cookie = request.headers.get("Cookie") || "";
    if (cookie.includes("logged_in=true")) {
      return env.ASSETS.fetch(request);
    }

    // 3. Handle the actual Login Form Submission
    if (request.method === "POST" && url.pathname === "/auth") {
      const formData = await request.formData();
      const userFullname = formData.get("username")?.toLowerCase().trim();
      const userPayroll = formData.get("password");

      // Look up the name in your STAFF_LIST KV database
      const storedPayroll = await env.STAFF_LIST.get(userFullname);

      if (storedPayroll && storedPayroll === userPayroll) {
        // Success! Give them a cookie and send them to the homepage
        return new Response("Redirecting...", {
          status: 302,
          headers: {
            "Location": "/",
            "Set-Cookie": "logged_in=true; Path=/; HttpOnly; Max-Age=86400"
          }
        });
      } else {
        return new Response("Invalid Name or Payroll Number", { status: 401 });
      }
    }

    // 4. If they aren't logged in, kick them to the login page
    return Response.redirect(`${url.origin}/login.html`, 302);
  }
};
