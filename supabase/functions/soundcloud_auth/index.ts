import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const CLIENT_ID = Deno.env.get("SOUNDCLOUD_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("SOUNDCLOUD_CLIENT_SECRET");

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("Missing SoundCloud client credentials.");
}

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed." }), {
      status: 405,
      headers: CORS_HEADERS
    });
  }

  try {
    const { code, redirect_uri, code_verifier } = await req.json();
    if (!code || !redirect_uri || !code_verifier) {
      return new Response(JSON.stringify({ message: "code, redirect_uri, and code_verifier are required." }), { status: 400, headers: CORS_HEADERS });
    }

    const response = await fetch("https://secure.soundcloud.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        redirect_uri,
        code_verifier,
        code
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(JSON.stringify({ message: `SoundCloud token exchange failed: ${errorBody}` }), { status: 500, headers: CORS_HEADERS });
    }

    const tokenData = await response.json();
    return new Response(JSON.stringify(tokenData), { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message || "Unable to complete SoundCloud OAuth." }), { status: 500, headers: CORS_HEADERS });
  }
});