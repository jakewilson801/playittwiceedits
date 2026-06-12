import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const SOUNDCLOUD_CLIENT_ID = Deno.env.get("SOUNDCLOUD_CLIENT_ID");
const SOUNDCLOUD_CLIENT_SECRET = Deno.env.get("SOUNDCLOUD_CLIENT_SECRET");

if (!SOUNDCLOUD_CLIENT_ID || !SOUNDCLOUD_CLIENT_SECRET) {
  throw new Error("Missing SoundCloud credentials in environment variables.");
}

async function resolveSoundCloudUrl(url: string) {
  const response = await fetch(`https://api.soundcloud.com/resolve?url=${encodeURIComponent(url)}&client_id=${SOUNDCLOUD_CLIENT_ID}`);
  if (!response.ok) {
    throw new Error("SoundCloud URL could not be resolved.");
  }
  return response.json();
}

async function getSoundCloudReposters(trackId: string) {
  const response = await fetch(`https://api-v2.soundcloud.com/tracks/${trackId}/reposts?client_id=${SOUNDCLOUD_CLIENT_ID}`);
  if (!response.ok) {
    throw new Error("Unable to fetch SoundCloud reposts.");
  }
  return response.json();
}

function cleanUrl(url: string) {
  return url.trim().replace(/\/?$/, "").toLowerCase();
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { track_url, soundcloud_profile_url } = body;

    if (!track_url || !soundcloud_profile_url) {
      return new Response(JSON.stringify({ message: "track_url and soundcloud_profile_url are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const trackData = await resolveSoundCloudUrl(track_url);
    const trackId = trackData.id;
    if (!trackId) {
      throw new Error("Resolved SoundCloud resource has no track ID.");
    }

    const reposts = await getSoundCloudReposters(trackId);
    const profileUrl = cleanUrl(soundcloud_profile_url);
    const reposted = (reposts.collection || []).some((item: any) => {
      const user = item.user || item.reposter;
      if (!user) return false;
      const permalink = cleanUrl(user.permalink_url || "");
      return permalink === profileUrl;
    });

    return new Response(JSON.stringify({ reposted }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message || "Unable to validate repost." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});