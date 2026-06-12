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
    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ message: "code and redirect_uri are required." }), { status: 400, headers: CORS_HEADERS });
    }

    const authHeader = `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`;
    const response = await fetch("https://api.soundcloud.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": authHeader
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri,
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