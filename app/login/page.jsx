"use client";

import Link from "next/link";
import { useState } from "react";
import { FiActivity, FiLock, FiMail, FiPhone, FiUser } from "react-icons/fi";

export default function LoginPage() {
  const [role, setRole] = useState("member");
  const [form, setForm] = useState({ identifier: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, ...form }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Login failed.");
      return;
    }
    window.location.href = data.redirectTo;
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
              onClick={() => setRole(item)}
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
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Name or Email</span>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    value={form.identifier}
                    onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Rahul Sharma or rahul@email.com"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Phone Number</span>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="9876543210"
                  />
                </div>
              </label>
            </>
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
    </main>
  );
}
