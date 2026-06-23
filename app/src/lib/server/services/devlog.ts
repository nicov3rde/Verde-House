import type { RequestEvent } from '@sveltejs/kit';

interface PostData {
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  placeName?: string;
  placeAddress?: string;
  lat?: number;
  lng?: number;
}

export const handleLoginAndPost = async (caption: string) => {
  const HERMES_DEVLOG_EMAIL = process.env.HERMES_DEVLOG_EMAIL;
  const HERMES_DEVLOG_PASSWORD = process.env.HERMES_DEVLOG_PASSWORD;

  if (!HERMES_DEVLOG_EMAIL || !HERMES_DEVLOG_PASSWORD) {
    throw new Error("HERMES_DEVLOG_EMAIL and HERMES_DEVLOG_PASSWORD must be set in the environment.");
  }

  const loginUrl = "http://localhost:5173/auth/login?/login";
  const postUrl = "http://localhost:5173/api/posts";

  // 1. Log in the bot account
  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      email: HERMES_DEVLOG_EMAIL,
      password: HERMES_DEVLOG_PASSWORD,
    }).toString(),
  });

  if (!loginResponse.ok) {
    const errorBody = await loginResponse.text();
    throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText} - ${errorBody}`);
  }

  const setCookieHeader = loginResponse.headers.get('set-cookie');
  if (!setCookieHeader) {
    throw new Error("Login successful, but no session cookie received.");
  }

  const sessionCookie = setCookieHeader.split(';')[0];

  // 2. Post to the feed
  const postData: PostData = {
    caption: caption,
  };

  const postResponse = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify(postData),
  });

  if (!postResponse.ok) {
    const errorBody = await postResponse.text();
    throw new Error(`Post failed: ${postResponse.status} ${postResponse.statusText} - ${errorBody}`);
  }

  console.log("Post successful.");
};