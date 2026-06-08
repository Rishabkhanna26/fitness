"use client";

import { useEffect, useRef, useState } from "react";
import { FiActivity, FiPhone, FiRefreshCw } from "react-icons/fi";

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function CheckInPage() {
  // Read qr_scanned cookie directly on client — no API round-trip needed
  // null = not yet checked, false = blocked, true = allowed
  const [qrAllowed, setQrAllowed] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [step, setStep] = useState("phone"); // "phone" | "code"
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [code, setCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef(null);

  // On mount: check cookie directly — instant, no API call
  useEffect(() => {
    // Check qr_scanned cookie client-side (it's NOT httpOnly so JS can read it)
    const hasQr = document.cookie.split("; ").some((c) => c.startsWith("qr_scanned="));

    if (!hasQr) {
      setQrAllowed(false);
      return;
    }

    setQrAllowed(true);

    // Check if already logged in via fit_session cookie
    const hasSession = document.cookie.split("; ").some((c) => c.startsWith("fit_session="));
    if (hasSession) {
      // Parse role from session to confirm it's a member
      try {
        const sessionCookie = document.cookie
          .split("; ")
          .find((c) => c.startsWith("fit_session="))
          ?.split("=")[1];
        if (sessionCookie) {
          const session = JSON.parse(atob(sessionCookie.replace(/-/g, "+").replace(/_/g, "/")));
          if (session?.role === "member" && session?.memberId) {
            setLoggedIn(true);
            generateCode(null);
          }
        }
      } catch {
        // session unreadable, fall through to phone step
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;
    clearInterval(timerRef.current);

    function tick() {
      const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) {
        setExpired(true);
        clearInterval(timerRef.current);
      }
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [expiresAt]);

  async function generateCode(phoneNumber) {
    setPhoneLoading(true);
    setPhoneError("");
    try {
      const body = phoneNumber ? { phone: phoneNumber } : {};
      const res = await fetch("/api/attendance/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhoneError(data.error || "Failed to generate code.");
        return;
      }
      setCode(data.code);
      setExpiresAt(data.expiresAt);
      setExpired(false);
      setStep("code");
    } catch {
      setPhoneError("Something went wrong. Please try again.");
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (!phone.trim()) {
      setPhoneError("Please enter your phone number.");
      return;
    }
    await generateCode(phone.trim());
  }

  // Loading — extremely brief, cookie read is synchronous
  if (qrAllowed === null) return null;

  // Blocked — no QR scan flag
  if (!qrAllowed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <FiActivity size={24} className="text-gray-400" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Scan Required</h1>
          <p className="text-sm text-gray-500">
            Please scan the QR code at the gym to check in. This page cannot be accessed by typing or pasting the URL.
          </p>
        </div>
      </main>
    );
  }

  // Phone entry step
  if (step === "phone") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <FiActivity size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Gym Check-In</h1>
              <p className="text-xs text-gray-400">Enter your number to get a code</p>
            </div>
          </div>

          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">Mobile Number</span>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="numeric"
                  placeholder="9876543210"
                  required
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </label>

            {phoneError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{phoneError}</p>
            )}

            <button
              disabled={phoneLoading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {phoneLoading ? "Generating..." : "Get Attendance Code"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Code display step
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
          <FiActivity size={24} className="text-white" />
        </div>

        <h1 className="text-base font-bold text-gray-900 mb-1">Your Attendance Code</h1>
        <p className="text-xs text-gray-400 mb-6">Enter this code on your dashboard to mark attendance</p>

        {!expired ? (
          <>
            <div className="mb-5 rounded-2xl bg-indigo-50 px-6 py-6 border-2 border-indigo-200">
              <span className="text-5xl font-black tracking-widest text-indigo-700 select-all">
                {code}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-600">
              <FiActivity size={14} className="text-indigo-400" />
              <span>
                Valid for{" "}
                <span className={`font-black ${secondsLeft <= 30 ? "text-red-500" : "text-indigo-600"}`}>
                  {pad(mins)}:{pad(secs)}
                </span>
              </span>
            </div>

            <p className="mt-4 text-xs text-gray-400">
              Go to your dashboard and enter this code to mark today's attendance.
            </p>
          </>
        ) : (
          <>
            <div className="mb-5 rounded-2xl bg-gray-100 px-6 py-6">
              <span className="text-5xl font-black tracking-widest text-gray-300 select-none">
                ----
              </span>
            </div>
            <p className="mb-4 text-sm font-semibold text-red-500">Code expired</p>
            <button
              onClick={() => generateCode(phone || null)}
              className="flex items-center gap-2 mx-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
            >
              <FiRefreshCw size={14} />
              Generate New Code
            </button>
          </>
        )}
      </div>
    </main>
  );
}
