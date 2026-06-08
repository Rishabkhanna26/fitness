"use client";

import { useEffect } from "react";

const STORAGE_KEY = "fitnation_auto_login";

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getAutoLoginData() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveAutoLoginData(email, password) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password, enabled: true }));
}

export function setAutoLoginEnabled(enabled) {
  if (typeof window === "undefined") return;
  const data = getAutoLoginData();
  if (!data) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, enabled }));
}

export function clearAutoLoginData() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

function hasSessionCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("fit_session="));
}

// ── Provider — mounts once in root layout ─────────────────────────────────────
export default function AutoLoginProvider() {
  useEffect(() => {
    // Only run on admin pages (not /login, /member, /checkin)
    const path = window.location.pathname;
    if (path.startsWith("/login") || path.startsWith("/member") || path.startsWith("/checkin")) return;

    // Already logged in
    if (hasSessionCookie()) return;

    const data = getAutoLoginData();
    if (!data?.enabled || !data?.email || !data?.password) return;

    // Session expired — silently re-login
    (async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin", email: data.email, password: data.password }),
        });
        if (res.ok) {
          // Reload to apply the new session cookie
          window.location.reload();
        }
      } catch {}
    })();
  }, []);

  return null; // renders nothing
}
