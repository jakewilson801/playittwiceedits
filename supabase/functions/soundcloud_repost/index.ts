import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
};

serve(async (req: Request) => {
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
    const { track_url, access_token } = await req.json();
    if (!track_url || !access_token) {
      return new Response(JSON.stringify({ message: "track_url and access_token are required." }), { status: 400, headers: CORS_HEADERS });
    }

    const resolved = await resolveSoundCloudUrl(track_url, access_token);
    const trackId = resolved.id;
    if (!trackId) {
      throw new Error("Resolved SoundCloud resource has no track ID.");
    }

    const reposted = await checkUserRepost(trackId, access_token);
    const liked = await checkUserLike(trackId, access_token);
    return new Response(JSON.stringify({ reposted, liked }), { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to validate repost and like.";
    return new Response(JSON.stringify({ message }), { status: 500, headers: CORS_HEADERS });
  }
});

function normalizeSoundCloudUrl(url: string) {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function resolveSoundCloudUrl(url: string, accessToken: string) {
  const normalizedUrl = normalizeSoundCloudUrl(url);
  const response = await fetch(`https://api.soundcloud.com/resolve?url=${encodeURIComponent(normalizedUrl)}`, {
    headers: {
      "Accept": "application/json; charset=utf-8",
      "Authorization": `OAuth ${accessToken}`
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SoundCloud URL could not be resolved. (${response.status}) ${text}`);
  }
  return response.json();
}

async function checkUserRepost(trackId: string, accessToken: string) {
  return checkSoundCloudPost(trackId, accessToken, "reposts");
}

async function checkUserLike(trackId: string, accessToken: string) {
  return checkSoundCloudPost(trackId, accessToken, "likes");
}

async function checkSoundCloudPost(trackId: string, accessToken: string, type: "reposts" | "likes") {
  const trackUrn = `soundcloud:tracks:${trackId}`;
  const response = await fetch(`https://api.soundcloud.com/${type}/tracks/${encodeURIComponent(trackUrn)}`, {
    method: "POST",
    headers: {
      "Accept": "application/json; charset=utf-8",
      "Authorization": `OAuth ${accessToken}`
    }
  });

  if (response.ok) {
    return true;
  }

  if (response.status === 401) {
    throw new Error("Unauthorized. Please sign in again.");
  }

  if (response.status === 409 || response.status === 422) {
    return true;
  }

  const text = await response.text().catch(() => "");
  throw new Error(`Unable to ${type.slice(0, -1)} track on SoundCloud. (${response.status}) ${text}`);
}