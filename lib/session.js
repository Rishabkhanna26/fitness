export const SESSION_COOKIE = "fit_session";

export function encodeSession(session) {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export function decodeSession(value) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function getClientSession() {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;
  try {
    return JSON.parse(atob(cookie.split("=")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}
