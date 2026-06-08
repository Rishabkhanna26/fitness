"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  saveAutoLoginData, setAutoLoginEnabled, clearAutoLoginData, getAutoLoginData
} from "@/components/AutoLoginProvider";
import {
  FiCalendar, FiSave, FiGift, FiPlus, FiTrash2,
  FiEdit2, FiCheck, FiX, FiToggleLeft, FiToggleRight,
  FiClock, FiDollarSign, FiActivity, FiMessageCircle,
  FiSun, FiMoon, FiAlertCircle, FiShield, FiLock,
} from "react-icons/fi";

const UNIT_LABELS = { days: "Days", months: "Months", years: "Years", visits: "Visits" };

// ── Shared input style ────────────────────────────────────────────────────────
const inp = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300";

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon: Icon, iconBg, title, subtitle, children, action }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon size={18} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ── SaveBar ───────────────────────────────────────────────────────────────────
function SaveBar({ onSave, saving, message }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-60">
        <FiSave size={14} /> {saving ? "Saving…" : "Save"}
      </button>
      {message && (
        <span className={`text-sm font-semibold ${message.startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>
          {message}
        </span>
      )}
    </div>
  );
}

// ── Offer Form ────────────────────────────────────────────────────────────────
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
            placeholder="Loyalty Renewal Offer" className={inp} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Offer Type</span>
          <select value={form.offer_type} onChange={(e) => setForm({ ...form, offer_type: e.target.value })}
            className={inp + " bg-white"}>
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
            placeholder={form.offer_type === "percentage" ? "10" : "500"} className={inp} />
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
              <option value="visits">Visits</option>
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

// ── Diet plan row editor ──────────────────────────────────────────────────────
const GOAL_OPTIONS = [
  { value: "lean", label: "Lean / Cut", color: "bg-blue-100 text-blue-700" },
  { value: "fat_loss", label: "Fat Loss", color: "bg-orange-100 text-orange-700" },
  { value: "weight_loss", label: "Weight Loss", color: "bg-red-100 text-red-700" },
  { value: "muscle_gain", label: "Muscle Gain", color: "bg-green-100 text-green-700" },
];

const goalColor = Object.fromEntries(GOAL_OPTIONS.map((g) => [g.value, g.color]));
const goalLabel = Object.fromEntries(GOAL_OPTIONS.map((g) => [g.value, g.label]));

function DietPlanForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    goal: initial.goal || "lean",
    title: initial.title || "",
    calories: initial.calories || "",
    protein: initial.protein || "",
    carbs: initial.carbs || "",
    fats: initial.fats || "",
    meals: initial.meals || "",
    notes: initial.notes || "",
  });
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setErr("Plan title is required."); return; }
    setErr("");
    onSave({ ...form, id: initial.id || Date.now().toString() });
  }

  return (
    <form onSubmit={submit} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Goal</span>
          <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}
            className={inp + " bg-white"}>
            {GOAL_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Plan Title</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. High Protein Cut" className={inp} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Daily Calories (kcal)</span>
          <input type="number" min="0" value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
            placeholder="e.g. 2200" className={inp} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Protein (g)</span>
          <input type="number" min="0" value={form.protein}
            onChange={(e) => setForm({ ...form, protein: e.target.value })}
            placeholder="e.g. 160" className={inp} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Carbs (g)</span>
          <input type="number" min="0" value={form.carbs}
            onChange={(e) => setForm({ ...form, carbs: e.target.value })}
            placeholder="e.g. 200" className={inp} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Fats (g)</span>
          <input type="number" min="0" value={form.fats}
            onChange={(e) => setForm({ ...form, fats: e.target.value })}
            placeholder="e.g. 60" className={inp} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Meals per Day</span>
          <input value={form.meals} onChange={(e) => setForm({ ...form, meals: e.target.value })}
            placeholder="e.g. Breakfast, Lunch, Pre-workout snack, Dinner" className={inp} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-gray-500 mb-1 block">Notes / Restrictions</span>
          <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Avoid sugar, lactose-free, vegetarian…"
            className={inp + " resize-none"} />
        </label>
      </div>
      {err && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
          <FiCheck size={13} /> Save Plan
        </button>
        <button type="button" onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <FiX size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  // ── Reminder intervals ────────────────────────────────
  const [intervalDate, setIntervalDate] = useState({ renewal_reminder_days: 7, attendance_alert_days: 5 });
  const [intervalMsg, setIntervalMsg] = useState("");
  const [intervalSaving, setIntervalSaving] = useState(false);

  // ── Loyalty offers ────────────────────────────────────
  const [offers, setOffers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [offerSaving, setOfferSaving] = useState(false);

  // ── Gym timing ───────────────────────────────────────
  const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const DAY_KEYS  = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  const defaultDaySchedule = () => DAY_KEYS.reduce((acc, d) => ({
    ...acc,
    [d]: { open: "06:00", close: "22:00", closed: d === "sun" }
  }), {});

  const [timing, setTiming] = useState({
    schedule: defaultDaySchedule(),
    holidays: [],          // array of "YYYY-MM-DD" strings
  });
  const [timingMsg, setTimingMsg]       = useState("");
  const [timingSaving, setTimingSaving] = useState(false);
  const [holidayInput, setHolidayInput] = useState("");

  // ── Membership pricing ───────────────────────────────
  const [pricing, setPricing] = useState([
    { id: "1", name: "1 Month", price: "", duration_days: 30 },
    { id: "2", name: "3 Months", price: "", duration_days: 90 },
    { id: "3", name: "6 Months", price: "", duration_days: 180 },
    { id: "4", name: "12 Months", price: "", duration_days: 365 },
  ]);
  const [pricingMsg, setPricingMsg] = useState("");
  const [pricingSaving, setPricingSaving] = useState(false);

  // ── Diet plans ───────────────────────────────────────
  const [dietPlans, setDietPlans] = useState([]);
  const [showDietForm, setShowDietForm] = useState(false);
  const [editDietId, setEditDietId] = useState(null);
  const [dietMsg, setDietMsg] = useState("");

  // ── WhatsApp ─────────────────────────────────────────
  const [whatsapp, setWhatsapp] = useState({ phone: "", api_key: "", enabled: false });
  const [waMsg, setWaMsg] = useState("");
  const [waSaving, setWaSaving] = useState(false);

  // ── Load settings from API ────────────────────────────
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const settings = data.settings || [];
        const get = (key, fallback) => settings.find((s) => s.key === key)?.value ?? fallback;
        setIntervalDate(get("interval_date", intervalDate));
        setTiming((prev) => {
          const saved = get("gym_timing", null);
          if (!saved) return prev;
          return {
            schedule: saved.schedule || prev.schedule,
            holidays: saved.holidays || [],
          };
        });
        setPricing((prev) => {
          const saved = get("membership_pricing", null);
          return saved ? saved : prev;
        });
        setDietPlans(get("diet_plans", []));
        setWhatsapp((prev) => ({ ...prev, ...get("whatsapp", {}) }));
      })
      .catch(() => {});

    fetch("/api/loyalty-offers")
      .then((r) => r.json())
      .then((data) => setOffers(data.offers || []))
      .catch(() => {});
  }, []);

  // ── Save helpers ──────────────────────────────────────
  async function saveSetting(key, value, setSaving, setMsg) {
    setSaving(true); setMsg("");
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setMsg("✓ Saved successfully.");
    } catch {
      setMsg("Failed to save. Please try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  // ── Offer helpers ─────────────────────────────────────
  async function addOffer(form) {
    setOfferSaving(true);
    const res = await fetch("/api/loyalty-offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.offer) setOffers((prev) => [data.offer, ...prev]);
    setShowAddForm(false); setOfferSaving(false);
  }

  async function updateOffer(id, form) {
    setOfferSaving(true);
    const res = await fetch(`/api/loyalty-offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.offer) setOffers((prev) => prev.map((o) => (o.id === id ? data.offer : o)));
    setEditId(null); setOfferSaving(false);
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

  // ── Diet plan helpers ─────────────────────────────────
  function saveDietPlan(plan) {
    const updated = editDietId
      ? dietPlans.map((d) => (d.id === editDietId ? plan : d))
      : [...dietPlans, plan];
    setDietPlans(updated);
    setShowDietForm(false);
    setEditDietId(null);
    saveSetting("diet_plans", updated, () => {}, setDietMsg);
  }

  function deleteDietPlan(id) {
    if (!confirm("Delete this diet plan?")) return;
    const updated = dietPlans.filter((d) => d.id !== id);
    setDietPlans(updated);
    saveSetting("diet_plans", updated, () => {}, setDietMsg);
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 pl-14 pr-4 sm:px-8 py-4 sticky top-0 z-10 shadow-sm lg:pl-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure your gym — timing, pricing, diet plans and more.</p>
        </header>

        <main className="px-4 sm:px-8 py-6 max-w-5xl w-full space-y-6">

          {/* ── 1. Gym Timing ─────────────────────────────────── */}
          <Section
            icon={FiClock}
            iconBg="bg-sky-50 text-sky-600"
            title="Gym Timing"
            subtitle="Set hours for each day, weekly offs, and holiday dates"
          >
            {/* ── Per-day schedule ── */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Weekly Schedule</p>
              {DAY_KEYS.map((d, i) => (
                <div key={d} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition ${
                  timing.schedule[d]?.closed ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-100"
                }`}>
                  {/* Day name */}
                  <span className="text-sm font-semibold text-gray-700 w-24 shrink-0">{DAY_NAMES[i]}</span>

                  {/* Closed toggle */}
                  <button
                    type="button"
                    onClick={() => setTiming((prev) => ({
                      ...prev,
                      schedule: { ...prev.schedule, [d]: { ...prev.schedule[d], closed: !prev.schedule[d]?.closed } }
                    }))}
                    className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border transition ${
                      timing.schedule[d]?.closed
                        ? "bg-red-50 border-red-200 text-red-500"
                        : "bg-green-50 border-green-200 text-green-600"
                    }`}
                  >
                    {timing.schedule[d]?.closed ? "Closed" : "Open"}
                  </button>

                  {/* Time inputs */}
                  {!timing.schedule[d]?.closed && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={timing.schedule[d]?.open || "06:00"}
                        onChange={(e) => setTiming((prev) => ({
                          ...prev,
                          schedule: { ...prev.schedule, [d]: { ...prev.schedule[d], open: e.target.value } }
                        }))}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <span className="text-xs text-gray-400 shrink-0">to</span>
                      <input
                        type="time"
                        value={timing.schedule[d]?.close || "22:00"}
                        onChange={(e) => setTiming((prev) => ({
                          ...prev,
                          schedule: { ...prev.schedule, [d]: { ...prev.schedule[d], close: e.target.value } }
                        }))}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  )}
                  {timing.schedule[d]?.closed && (
                    <span className="text-xs text-gray-400 italic">Weekly off</span>
                  )}
                </div>
              ))}
            </div>

            {/* ── Holiday calendar ── */}
            <div className="mt-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <FiCalendar size={12} /> Holiday Dates
              </p>

              {/* Add date */}
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  value={holidayInput}
                  onChange={(e) => setHolidayInput(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  type="button"
                  disabled={!holidayInput || timing.holidays.includes(holidayInput)}
                  onClick={() => {
                    if (!holidayInput || timing.holidays.includes(holidayInput)) return;
                    setTiming((prev) => ({ ...prev, holidays: [...prev.holidays, holidayInput].sort() }));
                    setHolidayInput("");
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-40 transition"
                >
                  <FiPlus size={14} /> Add
                </button>
              </div>

              {/* Holiday list */}
              {timing.holidays.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
                  No holidays added yet. Pick a date above to mark a closure.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {timing.holidays.map((date) => (
                    <div key={date} className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-full px-3 py-1">
                      <FiCalendar size={11} className="text-red-400" />
                      <span className="text-xs font-semibold text-red-700">
                        {new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTiming((prev) => ({ ...prev, holidays: prev.holidays.filter((h) => h !== date) }))}
                        className="text-red-400 hover:text-red-600 transition ml-0.5"
                      >
                        <FiX size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <SaveBar
              onSave={() => saveSetting("gym_timing", timing, setTimingSaving, setTimingMsg)}
              saving={timingSaving} message={timingMsg}
            />
          </Section>

          {/* ── 2. Membership Pricing ─────────────────────────── */}
          <Section
            icon={FiDollarSign}
            iconBg="bg-green-50 text-green-600"
            title="Membership Pricing"
            subtitle="Set the price for each membership plan"
          >
            <div className="space-y-3">
              {pricing.map((plan, i) => (
                <div key={plan.id} className="flex items-center gap-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                  <div className="flex-1">
                    <label className="block">
                      <span className="text-xs font-semibold text-gray-600">{plan.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({plan.duration_days} days)</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400 font-semibold">₹</span>
                    <input
                      type="number" min="0" placeholder="0"
                      value={plan.price}
                      onChange={(e) => {
                        const updated = [...pricing];
                        updated[i] = { ...plan, price: e.target.value };
                        setPricing(updated);
                      }}
                      className="w-28 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                </div>
              ))}
            </div>
            <SaveBar
              onSave={() => saveSetting("membership_pricing", pricing, setPricingSaving, setPricingMsg)}
              saving={pricingSaving} message={pricingMsg}
            />
          </Section>

          {/* ── 3. Reminder Intervals ─────────────────────────── */}
          <Section
            icon={FiCalendar}
            iconBg="bg-emerald-50 text-emerald-600"
            title="Reminder Intervals"
            subtitle="Reminder windows for admin follow-up"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Renewal Reminder (days before expiry)</span>
                <input type="number" min="1" value={intervalDate.renewal_reminder_days || 7}
                  onChange={(e) => setIntervalDate({ ...intervalDate, renewal_reminder_days: Number(e.target.value) })}
                  className={inp} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-500">Attendance Alert (days since last visit)</span>
                <input type="number" min="1" value={intervalDate.attendance_alert_days || 5}
                  onChange={(e) => setIntervalDate({ ...intervalDate, attendance_alert_days: Number(e.target.value) })}
                  className={inp} />
              </label>
            </div>
            <SaveBar
              onSave={async () => {
                setIntervalSaving(true); setIntervalMsg("");
                await fetch("/api/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ intervalDate }),
                });
                setIntervalSaving(false); setIntervalMsg("✓ Saved successfully.");
                setTimeout(() => setIntervalMsg(""), 3000);
              }}
              saving={intervalSaving} message={intervalMsg}
            />
          </Section>

          {/* ── 4. Loyalty Offers ─────────────────────────────── */}
          <Section
            icon={FiGift}
            iconBg="bg-indigo-50 text-indigo-600"
            title="Loyalty / Renewal Offers"
            subtitle="Rewards for members who stay consistent"
            action={!showAddForm && (
              <button onClick={() => { setShowAddForm(true); setEditId(null); }}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition">
                <FiPlus size={13} /> Add Offer
              </button>
            )}
          >
            {showAddForm && (
              <div className="mb-4">
                <OfferForm onSave={addOffer} onCancel={() => setShowAddForm(false)} saving={offerSaving} />
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
                        onCancel={() => setEditId(null)} saving={offerSaving} />
                    ) : (
                      <div className={`flex items-center gap-3 rounded-2xl border p-4 transition ${offer.active ? "border-gray-100 bg-gray-50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">{offer.title}</span>
                            {offer.active
                              ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                              : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">Inactive</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {offer.offer_type === "percentage" ? `${offer.amount}% discount` : `₹${offer.amount} off`}
                            {" · "}Valid for {offer.interval_value} {UNIT_LABELS[offer.interval_unit] || offer.interval_unit}
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
          </Section>

          {/* ── 5. Diet Plans ─────────────────────────────────── */}
          <Section
            icon={FiActivity}
            iconBg="bg-emerald-50 text-emerald-600"
            title="Diet Plans"
            subtitle="Create plans for lean, fat loss, weight loss or muscle gain goals"
            action={!showDietForm && !editDietId && (
              <button onClick={() => setShowDietForm(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition">
                <FiPlus size={13} /> Add Plan
              </button>
            )}
          >
            {dietMsg && (
              <p className={`text-sm font-semibold mb-3 ${dietMsg.startsWith("✓") ? "text-emerald-600" : "text-red-500"}`}>{dietMsg}</p>
            )}

            {showDietForm && (
              <div className="mb-4">
                <DietPlanForm onSave={saveDietPlan} onCancel={() => setShowDietForm(false)} />
              </div>
            )}

            {dietPlans.length === 0 && !showDietForm ? (
              <p className="text-sm text-gray-400 text-center py-6">No diet plans yet. Click "Add Plan" to create one.</p>
            ) : (
              <div className="space-y-3">
                {dietPlans.map((plan) => (
                  <div key={plan.id}>
                    {editDietId === plan.id ? (
                      <DietPlanForm initial={plan} onSave={saveDietPlan} onCancel={() => setEditDietId(null)} />
                    ) : (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${goalColor[plan.goal] || "bg-gray-100 text-gray-600"}`}>
                                {goalLabel[plan.goal] || plan.goal}
                              </span>
                              <span className="text-sm font-bold text-gray-900">{plan.title}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                              {plan.calories && <span>🔥 {plan.calories} kcal</span>}
                              {plan.protein && <span>💪 {plan.protein}g protein</span>}
                              {plan.carbs && <span>🌾 {plan.carbs}g carbs</span>}
                              {plan.fats && <span>🫒 {plan.fats}g fats</span>}
                            </div>
                            {plan.meals && <p className="text-xs text-gray-500 mt-1">🍽 {plan.meals}</p>}
                            {plan.notes && <p className="text-xs text-gray-400 mt-1 italic">{plan.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => { setEditDietId(plan.id); setShowDietForm(false); }}
                              className="text-gray-400 hover:text-emerald-600 transition"><FiEdit2 size={15} /></button>
                            <button onClick={() => deleteDietPlan(plan.id)}
                              className="text-gray-400 hover:text-red-500 transition"><FiTrash2 size={15} /></button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* ── 6. WhatsApp Bot (Code-based Pairing) ───────── */}
          <WhatsAppBotSection />

          {/* ── 7. Auto Login ─────────────────────────────────── */}
          <AutoLoginSection />

        </main>
      </div>
    </div>
  );
}

// ── WhatsApp Bot Section Component ──────────────────────────────────────────
function WhatsAppBotSection() {
  const [botStatus, setBotStatus]   = useState("idle");
  const [botPhone, setBotPhone]     = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [loading, setLoading]       = useState(false);
  const [pairing, setPairing]       = useState(false); // waiting for code to arrive
  const [message, setMessage]       = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  useEffect(() => {
    checkBotStatus();
    const interval = setInterval(checkBotStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  async function checkBotStatus() {
    try {
      const res  = await fetch("/api/whatsapp/status");
      const data = await res.json();
      setBotStatus(data.state);
      setBotPhone(data.phone || "");
      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
        setPairing(false); // code arrived, stop spinner
      }
    } catch {
      setBotStatus("offline");
    }
  }

  async function startPairing(e) {
    e.preventDefault();
    if (!phoneInput.trim()) { setMessage("Please enter a phone number."); return; }
    setLoading(true);
    setPairing(false);
    setPairingCode("");
    setMessage("");
    try {
      const res  = await fetch("/api/whatsapp/start-pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Server responds immediately; pairing code will arrive via polling
      setPairing(true);
      setBotPhone(phoneInput);
      setMessage("Starting WhatsApp session… pairing code will appear below.");
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect WhatsApp bot?")) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBotStatus("idle");
      setBotPhone("");
      setPairingCode("");
      setPairing(false);
      setPhoneInput("");
      setMessage("Disconnected.");
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const connected      = botStatus === "ready";
  const isPairing      = botStatus === "pairing" || pairing;
  const isReconnecting = botStatus === "reconnecting";

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <FiMessageCircle />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">WhatsApp Chatbot</h2>
            <p className="text-xs text-gray-400">Code-based login · powered by OpenRouter AI</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
          connected      ? "bg-green-100 text-green-700"  :
          isPairing      ? "bg-yellow-100 text-yellow-700" :
          isReconnecting ? "bg-blue-100 text-blue-700"    :
                           "bg-gray-100 text-gray-500"
        }`}>
          {connected      ? "🟢 Connected"    :
           isPairing      ? "🟡 Pairing…"     :
           isReconnecting ? "🔵 Reconnecting…":
                            "⚫ " + botStatus}
        </span>
      </div>

      <div className="space-y-4">

        {/* ── Connected ── */}
        {connected && (
          <>
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
              <p className="text-xs font-semibold text-green-700">✓ WhatsApp Connected</p>
              <p className="text-sm font-semibold text-green-900 mt-0.5">+{botPhone}</p>
              <p className="text-xs text-green-600 mt-1">
                Bot is live — replies to all incoming messages with gym info using AI.
              </p>
            </div>
            <button
              onClick={disconnect}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60 transition"
            >
              <FiX size={14} /> Disconnect
            </button>
          </>
        )}

        {/* ── Idle: enter phone ── */}
        {!connected && !isPairing && !pairingCode && (
          <>
            <p className="text-sm text-gray-500">
              Enter your WhatsApp number. A pairing code will appear here — enter it in WhatsApp to link the bot.
            </p>
            <form onSubmit={startPairing} className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-500 mb-1.5 block">WhatsApp Phone Number</span>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-gray-500">+91</span>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    disabled={loading}
                    className={`${inp} pl-12`}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter your 10-digit mobile number</p>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 transition"
              >
                {loading ? "Starting…" : "Get Pairing Code"}
              </button>
            </form>
          </>
        )}

        {/* ── Auto-reconnecting ── */}
        {!connected && isReconnecting && (
          <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-4 flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-800">Reconnecting…</p>
              <p className="text-xs text-blue-600 mt-0.5">Lost connection — restoring your WhatsApp session automatically.</p>
            </div>
          </div>
        )}

        {/* ── Waiting for pairing code to arrive ── */}
        {!connected && isPairing && !pairingCode && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-100 px-4 py-4 flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-yellow-500 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-yellow-800">Starting WhatsApp session…</p>
              <p className="text-xs text-yellow-700 mt-0.5">Pairing code will appear here in a few seconds. Please wait.</p>
            </div>
          </div>
        )}

        {/* ── Pairing code ready ── */}
        {!connected && pairingCode && (
          <div className="space-y-3">
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-4">
              <p className="text-xs font-semibold text-blue-600 mb-2">📱 Your Pairing Code</p>
              <p className="text-3xl font-black text-blue-700 tracking-[0.3em] mb-3">{pairingCode}</p>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>Open WhatsApp on your phone</li>
                <li>Go to <strong>Settings → Linked Devices → Link a Device</strong></li>
                <li>Tap <strong>"Link with phone number instead"</strong></li>
                <li>Enter the code above</li>
              </ol>
              <p className="text-xs text-blue-500 mt-2">Status will update automatically once WhatsApp confirms.</p>
            </div>
            <button
              onClick={async () => {
                // Reset bot state without full logout — just stops the current init
                try {
                  await fetch("/api/whatsapp/reset", { method: "POST" });
                } catch {}
                setPairingCode("");
                setPairing(false);
                setBotStatus("idle");
                setPhoneInput("");
                setMessage("");
              }}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              ↩ Start over with a different number
            </button>
          </div>
        )}

        {/* ── Auth failed ── */}
        {botStatus === "auth_failed" && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-sm font-semibold text-red-700">Authentication failed.</p>
            <p className="text-xs text-red-600 mt-0.5">Make sure you entered the correct code before it expired. Try again.</p>
            <button
              onClick={() => { setBotStatus("idle"); setPairingCode(""); setPairing(false); }}
              className="mt-2 text-xs font-semibold text-red-600 hover:underline"
            >Try again</button>
          </div>
        )}

        {message && (
          <p className={`text-xs font-semibold rounded-lg px-3 py-2 ${
            message.startsWith("Error") ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
          }`}>{message}</p>
        )}

        {/* ── How it works ── */}
        {!connected && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-start gap-3">
            <FiAlertCircle size={14} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="text-xs text-gray-500 space-y-0.5">
              <p className="font-semibold text-gray-600">How it works</p>
              <p>Enter your number → get a pairing code → enter it in WhatsApp → bot is live.</p>
              <p>The bot answers questions about gym timing, membership prices, and diet plans using your saved settings.</p>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

// ── Auto Login Section ───────────────────────────────────────────────────────
function AutoLoginSection() {
  const [enabled, setEnabled]       = useState(false);
  const [hasCreds, setHasCreds]     = useState(false);
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [msg, setMsg]               = useState("");

  useEffect(() => {
    const data = getAutoLoginData();
    if (data) {
      setEnabled(!!data.enabled);
      setHasCreds(!!(data.email && data.password));
      setEmail(data.email || "");
    }
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setAutoLoginEnabled(next);
    setMsg(next ? "Auto-login activated." : "Auto-login deactivated.");
    setTimeout(() => setMsg(""), 2500);
  }

  function save(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setMsg("Fill in both fields."); return; }
    saveAutoLoginData(email.trim(), password);
    setHasCreds(true);
    setShowForm(false);
    setPassword("");
    setMsg("Credentials saved. Auto-login is now active.");
    setEnabled(true);
    setTimeout(() => setMsg(""), 3000);
  }

  function remove() {
    if (!confirm("Remove saved credentials? Auto-login will be disabled.")) return;
    clearAutoLoginData();
    setEnabled(false);
    setHasCreds(false);
    setEmail("");
    setPassword("");
    setMsg("Credentials removed.");
    setTimeout(() => setMsg(""), 2500);
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FiShield size={18} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Auto Login</h2>
            <p className="text-xs text-gray-400">Stay logged in — restore session automatically if it expires</p>
          </div>
        </div>
        {/* Activate / Deactivate toggle */}
        <button
          onClick={toggle}
          disabled={!hasCreds}
          title={!hasCreds ? "Save credentials first" : ""}
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold border transition disabled:opacity-40 ${
            enabled
              ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          {enabled
            ? <><FiToggleRight size={15}/> Active</>
            : <><FiToggleLeft size={15}/> Inactive</>}
        </button>
      </div>

      <div className="space-y-4">
        {hasCreds && !showForm ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <FiLock size={13} className="text-gray-400" />
              <span className="text-sm text-gray-700 font-medium">{email}</span>
              <span className="text-xs text-gray-400">· password saved</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >Edit</button>
              <button
                onClick={remove}
                className="text-xs font-semibold text-red-500 hover:underline"
              >Remove</button>
            </div>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-3">
            <p className="text-sm text-gray-500">
              Save your admin credentials here. If your session expires, the app will log you back in silently.
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500 mb-1 block">Admin Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@Optimus.in"
                required
                className={inp}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500 mb-1 block">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inp}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
              >
                <FiCheck size={14} /> Save & Activate
              </button>
              {hasCreds && (
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setPassword(""); }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                >Cancel</button>
              )}
            </div>
          </form>
        )}

        {msg && (
          <p className={`text-xs font-semibold rounded-lg px-3 py-2 ${
            msg.includes("removed") || msg.includes("deactivated")
              ? "bg-gray-50 text-gray-500"
              : "bg-indigo-50 text-indigo-700"
          }`}>{msg}</p>
        )}

        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-start gap-2.5">
          <FiAlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Credentials are stored only in this browser's local storage — never sent to any server other than your own login API. Use only on trusted devices.
          </p>
        </div>
      </div>
    </section>
  );
}
