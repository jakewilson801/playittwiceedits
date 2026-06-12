import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed." }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { track_url, access_token } = await req.json();
    if (!track_url || !access_token) {
      return new Response(JSON.stringify({ message: "track_url and access_token are required." }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const resolved = await resolveSoundCloudUrl(track_url, access_token);
    const trackId = resolved.id;
    if (!trackId) {
      throw new Error("Resolved SoundCloud resource has no track ID.");
    }

    const reposted = await checkUserRepost(trackId, access_token);
    return new Response(JSON.stringify({ reposted }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ message: error.message || "Unable to validate repost." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

async function resolveSoundCloudUrl(url: string, accessToken: string) {
  const response = await fetch(`https://api.soundcloud.com/resolve?url=${encodeURIComponent(url)}&oauth_token=${encodeURIComponent(accessToken)}`);
  if (!response.ok) {
    throw new Error("SoundCloud URL could not be resolved.");
  }
  return response.json();
}

async function checkUserRepost(trackId: string, accessToken: string) {
  const response = await fetch(`https://api-v2.soundcloud.com/me/reposts?oauth_token=${encodeURIComponent(accessToken)}`);
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized. Please sign in again.");
    }
    throw new Error("Unable to fetch user reposts from SoundCloud.");
  }

  const reposts = await response.json();
  return (reposts.collection || []).some((item: any) => item.track?.id === trackId || item.track_id === trackId);
}