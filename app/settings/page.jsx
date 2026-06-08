"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { FiCalendar, FiPercent, FiSave } from "react-icons/fi";

export default function SettingsPage() {
  const [offer, setOffer] = useState({ title: "", discount_percent: 0, active: true });
  const [intervalDate, setIntervalDate] = useState({ renewal_reminder_days: 7, attendance_alert_days: 5 });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data) => {
        const settings = data.settings || [];
        setOffer(settings.find((item) => item.key === "offer")?.value || offer);
        setIntervalDate(settings.find((item) => item.key === "interval_date")?.value || intervalDate);
      })
      .catch(() => {});
  }, []);

  async function save() {
    setMessage("");
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer, intervalDate }),
    });
    setMessage("Settings saved.");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 sticky top-0 z-10 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure gym offers and reminder intervals.</p>
        </header>
        <main className="px-4 sm:px-8 py-6 max-w-5xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FiPercent />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Offer</h2>
                  <p className="text-xs text-gray-400">Public membership offer</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-500">Offer Title</span>
                  <input
                    value={offer.title || ""}
                    onChange={(e) => setOffer({ ...offer, title: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="Summer Offer"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-500">Discount Percent</span>
                  <input
                    type="number"
                    min="0"
                    value={offer.discount_percent || 0}
                    onChange={(e) => setOffer({ ...offer, discount_percent: Number(e.target.value) })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-700">
                  Active Offer
                  <input
                    type="checkbox"
                    checked={Boolean(offer.active)}
                    onChange={(e) => setOffer({ ...offer, active: e.target.checked })}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FiCalendar />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Interval Date</h2>
                  <p className="text-xs text-gray-400">Reminder windows for admin follow-up</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-500">Renewal Reminder Days</span>
                  <input
                    type="number"
                    min="1"
                    value={intervalDate.renewal_reminder_days || 7}
                    onChange={(e) => setIntervalDate({ ...intervalDate, renewal_reminder_days: Number(e.target.value) })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-gray-500">Attendance Alert Days</span>
                  <input
                    type="number"
                    min="1"
                    value={intervalDate.attendance_alert_days || 5}
                    onChange={(e) => setIntervalDate({ ...intervalDate, attendance_alert_days: Number(e.target.value) })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={save}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700"
            >
              <FiSave /> Save Settings
            </button>
            {message && <p className="text-sm font-semibold text-emerald-600">{message}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
