"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  FiCalendar, FiSave, FiGift, FiPlus, FiTrash2,
  FiEdit2, FiCheck, FiX, FiToggleLeft, FiToggleRight,
} from "react-icons/fi";

const UNIT_LABELS = { days: "Days", months: "Months", years: "Years" };

function OfferForm({ initial = {}, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    title: initial.title || "",
    offer_type: initial.offer_type || "percentage",
    amount: initial.amount ?? "",
    interval_unit: initial.interval_unit || "months",
    interval_value: initial.interval_value ?? 1,
    active: initial.active ?? true,
  });
  const [err, setErr] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setErr("Title is required."); return; }
    if (form.amount === "" || Number(form.amount) < 0) { setErr("Amount must be 0 or more."); return; }
    if (!form.interval_value || Number(form.interval_value) < 1) { setErr("Interval must be at least 1."); return; }
    setErr("");
    onSave({ ...form, amount: Number(form.amount), interval_value: Number(form.interval_value) });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Offer Title</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Loyalty Renewal Offer"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Offer Type</span>
          <select value={form.offer_type} onChange={(e) => setForm({ ...form, offer_type: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Price (₹)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">
            Amount {form.offer_type === "percentage" ? "(%)" : "(₹)"}
          </span>
          <input type="number" min="0" step="0.01" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder={form.offer_type === "percentage" ? "10" : "500"}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </label>
        <div>
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Renewal Interval</span>
          <div className="flex gap-2">
            <input type="number" min="1" value={form.interval_value}
              onChange={(e) => setForm({ ...form, interval_value: e.target.value })}
              className="w-20 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <select value={form.interval_unit} onChange={(e) => setForm({ ...form, interval_unit: e.target.value })}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
        <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}
          className="accent-indigo-600 w-4 h-4" />
        Active Offer
      </label>
      {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
          <FiCheck size={13} /> {saving ? "Saving..." : "Save Offer"}
        </button>
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <FiX size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const [intervalDate, setIntervalDate] = useState({ renewal_reminder_days: 7, attendance_alert_days: 5 });
  const [offers, setOffers] = useState([]);
  const [message, setMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const settings = data.settings || [];
        setIntervalDate(settings.find((item) => item.key === "interval_date")?.value || intervalDate);
      })
      .catch(() => {});
    fetch("/api/loyalty-offers")
      .then((r) => r.json())
      .then((data) => setOffers(data.offers || []))
      .catch(() => {});
  }, []);

  async function saveInterval() {
    setSaving(true); setMessage("");
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intervalDate }),
    });
    setSaving(false); setMessage("Settings saved.");
    setTimeout(() => setMessage(""), 3000);
  }

  async function addOffer(form) {
    setSaving(true);
    const res = await fetch("/api/loyalty-offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.offer) setOffers((prev) => [data.offer, ...prev]);
    setShowAddForm(false); setSaving(false);
  }

  async function updateOffer(id, form) {
    setSaving(true);
    const res = await fetch(`/api/loyalty-offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.offer) setOffers((prev) => prev.map((o) => (o.id === id ? data.offer : o)));
    setEditId(null); setSaving(false);
  }

  async function toggleOfferActive(offer) {
    const res = await fetch(`/api/loyalty-offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !offer.active }),
    });
    const data = await res.json();
    if (data.offer) setOffers((prev) => prev.map((o) => (o.id === offer.id ? data.offer : o)));
  }

  async function deleteOffer(id) {
    if (!confirm("Delete this offer?")) return;
    await fetch(`/api/loyalty-offers/${id}`, { method: "DELETE" });
    setOffers((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 sticky top-0 z-10 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure gym offers and reminder intervals.</p>
        </header>
        <main className="px-4 sm:px-8 py-6 max-w-5xl w-full space-y-6">

          {/* Interval Date Settings */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FiCalendar />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Reminder Intervals</h2>
                <p className="text-xs text-gray-400">Reminder windows for admin follow-up</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Renewal Reminder Days</span>
                <input type="number" min="1" value={intervalDate.renewal_reminder_days || 7}
                  onChange={(e) => setIntervalDate({ ...intervalDate, renewal_reminder_days: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Attendance Alert Days</span>
                <input type="number" min="1" value={intervalDate.attendance_alert_days || 5}
                  onChange={(e) => setIntervalDate({ ...intervalDate, attendance_alert_days: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={saveInterval} disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60">
                <FiSave /> Save Settings
              </button>
              {message && <p className="text-sm font-semibold text-emerald-600">{message}</p>}
            </div>
          </section>

          {/* Loyalty Offers */}
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <FiGift />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Loyalty / Renewal Offers</h2>
                  <p className="text-xs text-gray-400">Rewards for members who renew after a period</p>
                </div>
              </div>
              {!showAddForm && (
                <button onClick={() => { setShowAddForm(true); setEditId(null); }}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition">
                  <FiPlus size={13} /> Add Offer
                </button>
              )}
            </div>

            {showAddForm && (
              <div className="mb-4">
                <OfferForm onSave={addOffer} onCancel={() => setShowAddForm(false)} saving={saving} />
              </div>
            )}

            {offers.length === 0 && !showAddForm ? (
              <p className="text-sm text-gray-400 text-center py-6">No offers configured yet. Click "Add Offer" to create one.</p>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <div key={offer.id}>
                    {editId === offer.id ? (
                      <OfferForm initial={offer} onSave={(form) => updateOffer(offer.id, form)}
                        onCancel={() => setEditId(null)} saving={saving} />
                    ) : (
                      <div className={`flex items-center gap-3 rounded-2xl border p-4 transition ${offer.active ? "border-gray-100 bg-gray-50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">{offer.title}</span>
                            {offer.active ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">Inactive</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {offer.offer_type === "percentage" ? `${offer.amount}% discount` : `₹${offer.amount} off`}
                            {" · "}
                            Valid for {offer.interval_value} {UNIT_LABELS[offer.interval_unit] || offer.interval_unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => toggleOfferActive(offer)} title={offer.active ? "Deactivate" : "Activate"}
                            className="text-gray-400 hover:text-indigo-600 transition">
                            {offer.active ? <FiToggleRight size={20} className="text-indigo-500" /> : <FiToggleLeft size={20} />}
                          </button>
                          <button onClick={() => { setEditId(offer.id); setShowAddForm(false); }}
                            className="text-gray-400 hover:text-indigo-600 transition"><FiEdit2 size={15} /></button>
                          <button onClick={() => deleteOffer(offer.id)}
                            className="text-gray-400 hover:text-red-500 transition"><FiTrash2 size={15} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
