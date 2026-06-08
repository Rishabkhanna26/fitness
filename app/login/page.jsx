"use client";

import { useState } from "react";
import { FiActivity, FiClock, FiLock, FiMail, FiPhone, FiUser, FiX } from "react-icons/fi";
import { saveAutoLoginData, getAutoLoginData } from "@/components/AutoLoginProvider";

const DURATIONS = ["1 Month", "3 Months", "Custom"];

export default function LoginPage() {
  const [role, setRole] = useState("member");
  const [form, setForm] = useState({ phone: "", email: "", password: "" });
  const [createForm, setCreateForm] = useState({ phone: "", name: "", email: "", duration: "1 Month", customDays: "" });
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const payload =
      role === "member"
        ? { role, phone: form.phone.trim() }
        : { role, email: form.email.trim(), password: form.password };

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        if (role === "member" && data.code === "member_not_found") {
          setCreateForm((prev) => ({ ...prev, phone: form.phone.trim() }));
          setShowCreateModal(true);
          return;
        }
        setError(data.error || "Login failed.");
        return;
      }

      // Save admin credentials for auto-login if feature is enabled
      if (role === "admin") {
        const existing = getAutoLoginData();
        if (existing?.enabled) {
          saveAutoLoginData(form.email.trim(), form.password);
        }
      }

      window.location.href = data.redirectTo;
    } catch {
      setError("Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function createMember(event) {
    event.preventDefault();
    setCreateError("");

    if (!createForm.name.trim() || !createForm.phone.trim()) {
      setCreateError("Name and phone number are required.");
      return;
    }
    if (createForm.duration === "Custom" && (!createForm.customDays || Number(createForm.customDays) < 1)) {
      setCreateError("Enter a valid number of days for custom duration.");
      return;
    }

    setCreateLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          email: createForm.email.trim(),
          phone: createForm.phone.trim(),
          duration: createForm.duration,
          customDays: createForm.customDays,
          signIn: true,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setCreateError(data.error || "Failed to create member.");
        return;
      }

      window.location.href = data.redirectTo || "/member";
    } catch {
      setCreateError("Failed to create member.");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 flex items-center justify-center">
      <section className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <FiActivity className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">FitNation Login</h1>
            <p className="text-sm text-gray-400">Access your gym CRM account</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
          {["member", "admin"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setRole(item);
                setError("");
              }}
              className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${
                role === item ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {role === "member" ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">Phone Number</span>
              <p className="mb-2 text-xs text-gray-400">Enter your phone number to sign in.</p>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  placeholder="9876543210"
                />
              </div>
            </label>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Admin Email</span>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="admin@fitnation.in"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Password</span>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Password"
                  />
                </div>
              </label>
            </>
          )}

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </form>
      </section>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Member not found</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Create a new member record for this phone number to continue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError("");
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={createMember} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Full Name</span>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Rahul Sharma"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Phone Number</span>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    required
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="9876543210"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Email Address (optional)</span>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="rahul@email.com"
                  />
                </div>
              </label>

              <div>
                <span className="mb-2 block text-xs font-semibold text-gray-500">Membership Pack</span>
                <div className="grid grid-cols-3 gap-2">
                  {DURATIONS.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, duration })}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                        createForm.duration === duration
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {duration}
                    </button>
                  ))}
                </div>
                {createForm.duration === "Custom" && (
                  <div className="mt-3 relative">
                    <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="number"
                      min="1"
                      value={createForm.customDays}
                      onChange={(e) => setCreateForm({ ...createForm, customDays: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Number of days"
                    />
                  </div>
                )}
              </div>

              {createError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{createError}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError("");
                  }}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  disabled={createLoading}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createLoading ? "Creating..." : "Create Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
