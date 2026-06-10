"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import {
  FiMessageCircle, FiRefreshCw, FiUser, FiPhone, FiClock,
  FiAlertCircle, FiTrendingUp, FiSearch, FiTrash2, FiX,
  FiCalendar, FiTag, FiHelpCircle, FiCoffee,
} from "react-icons/fi";

// ── Interest badge config ──────────────────────────────────────────────────────
const INTEREST = {
  high:    { cls: "bg-green-100 text-green-700 border-green-200",    label: "🔥 High"    },
  medium:  { cls: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "✨ Medium"  },
  low:     { cls: "bg-gray-100 text-gray-500 border-gray-200",       label: "💤 Low"     },
  unknown: { cls: "bg-gray-100 text-gray-400 border-gray-200",       label: "❓ Unknown" },
};

const FILTERS = ["all", "high", "medium", "low", "unknown"];

function timeAgo(iso) {
  if (!iso) return "—";
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function TopicPill({ label }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-semibold border border-indigo-100">
      {label}
    </span>
  );
}

// ── Lead Detail Modal ──────────────────────────────────────────────────────────
function LeadModal({ lead, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const interest    = INTEREST[lead.joining_interest] || INTEREST.unknown;
  const displayName = lead.name || lead.phone || lead.jid?.replace("@c.us", "");
  const displayPhone = lead.phone ? `+${lead.phone}` : "—";
  const tokens      = lead.tokens || {};

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/leads", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ jid: lead.jid }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Delete failed");
        setDeleting(false);
        setConfirmDelete(false);
      } else {
        onDelete(lead.jid);
        onClose();
      }
    } catch {
      alert("Network error — could not delete lead.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl px-6 pt-6 pb-4 border-b border-gray-100 flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-lg font-black text-indigo-700">
              {(displayName?.[0] || "?").toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-gray-900">{displayName}</h2>
              {lead.name_confirmed && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                  ✓ Confirmed
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${interest.cls}`}>
                {interest.label}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <FiPhone size={10} /> {displayPhone}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition"
          >
            <FiX size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <FiCalendar size={10} /> First Contact
              </p>
              <p className="text-sm font-semibold text-gray-800">{fmtDate(lead.first_seen)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                <FiClock size={10} /> Last Seen
              </p>
              <p className="text-sm font-semibold text-gray-800">{timeAgo(lead.last_seen)}</p>
            </div>
            {lead.message_count > 0 && (
              <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                  <FiMessageCircle size={10} /> Messages
                </p>
                <p className="text-sm font-semibold text-gray-800">{lead.message_count}</p>
              </div>
            )}
            {tokens.totalTokens > 0 && (
              <div className="rounded-2xl bg-purple-50 border border-purple-100 px-4 py-3">
                <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wide mb-1">💠 AI Tokens</p>
                <p className="text-sm font-semibold text-purple-700">{tokens.totalTokens.toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Summary */}
          {lead.summary && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Summary</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                {lead.summary}
              </p>
            </div>
          )}

          {/* Joining interest reason */}
          {lead.joining_reason && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FiTrendingUp size={10} /> Joining Reason
              </p>
              <p className="text-sm text-gray-700 leading-relaxed bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
                {lead.joining_reason}
              </p>
            </div>
          )}

          {/* Diet */}
          {lead.diet_preference && lead.diet_preference !== "unknown" && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
              <FiCoffee size={14} className="text-orange-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">Diet Preference</p>
                <p className="text-sm font-semibold text-orange-700 capitalize">{lead.diet_preference}</p>
              </div>
            </div>
          )}

          {/* Main topics */}
          {lead.main_topics?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FiTag size={10} /> Main Topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {lead.main_topics.map((t) => (
                  <TopicPill key={t} label={t} />
                ))}
              </div>
            </div>
          )}

          {/* Asked about */}
          {lead.asked_about?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FiHelpCircle size={10} /> Asked About
              </p>
              <div className="flex flex-wrap gap-1.5">
                {lead.asked_about.map((t) => (
                  <span key={t} className="text-[11px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Token breakdown */}
          {tokens.totalTokens > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Token Usage</p>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xl font-black text-purple-600">{tokens.totalTokens.toLocaleString()}</p>
                    <p className="text-[9px] text-purple-400 font-bold uppercase">Total</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-blue-600">{tokens.inputTokens.toLocaleString()}</p>
                    <p className="text-[9px] text-blue-400 font-bold uppercase">Input</p>
                  </div>
                  <div>
                    <p className="text-xl font-black text-green-600">{tokens.outputTokens.toLocaleString()}</p>
                    <p className="text-[9px] text-green-400 font-bold uppercase">Output</p>
                  </div>
                </div>
                {Object.entries(tokens.byProvider || {}).map(([provider, data]) => (
                  <div key={provider} className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-1.5 border border-purple-100">
                    <span className="font-semibold text-gray-600 capitalize">{provider}</span>
                    <span className="text-purple-600 font-bold">{data.total.toLocaleString()} tokens</span>
                    <span className="text-gray-400">({data.requests} req)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crux updated */}
          {lead.crux_updated_at && (
            <p className="text-[11px] text-gray-400 text-center">
              AI profile last updated {fmtDate(lead.crux_updated_at)}
            </p>
          )}
        </div>

        {/* Footer — delete */}
        <div className="px-6 pb-6">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 py-2.5 text-sm font-semibold transition"
            >
              <FiTrash2 size={14} /> Delete Lead
            </button>
          ) : (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 space-y-3">
              <p className="text-sm font-bold text-red-700 text-center">
                Delete this lead permanently? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-white border border-gray-200 text-gray-600 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white py-2 text-sm font-bold disabled:opacity-50 transition"
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lead Card (list row) ───────────────────────────────────────────────────────
function LeadCard({ lead, onSelect, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const interest    = INTEREST[lead.joining_interest] || INTEREST.unknown;
  const displayName = lead.name || lead.phone || lead.jid?.replace("@c.us", "");
  const displayPhone = lead.phone ? `+${lead.phone}` : "—";
  const tokens      = lead.tokens || {};

  async function handleDelete(e) {
    e.stopPropagation();
    setDeleting(true);
    try {
      const res = await fetch("/api/leads", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ jid: lead.jid }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Delete failed");
        setDeleting(false);
        setConfirmDelete(false);
      } else {
        onDelete(lead.jid);
      }
    } catch {
      alert("Network error — could not delete lead.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-all cursor-pointer hover:shadow-md hover:border-indigo-200 ${
        lead.joining_interest === "high" ? "border-green-200" : "border-gray-100"
      }`}
      onClick={() => onSelect(lead)}
    >
      <div className="px-5 py-4 flex items-start gap-4">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-indigo-700">
            {(displayName?.[0] || "?").toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{displayName}</span>
            {lead.name_confirmed && (
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                ✓ Confirmed
              </span>
            )}
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${interest.cls}`}>
              {interest.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <FiPhone size={10} /> {displayPhone}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <FiClock size={10} /> {timeAgo(lead.last_seen)}
            </span>
            {lead.message_count > 0 && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <FiMessageCircle size={10} /> {lead.message_count} msgs
              </span>
            )}
            {tokens.totalTokens > 0 && (
              <span className="text-xs text-purple-500 font-semibold">
                💠 {tokens.totalTokens.toLocaleString()}
              </span>
            )}
          </div>
          {lead.main_topics?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.main_topics.slice(0, 4).map((t) => (
                <TopicPill key={t} label={t} />
              ))}
            </div>
          )}
          {lead.summary && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{lead.summary}</p>
          )}
        </div>

        {/* Delete control */}
        <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-gray-300 hover:text-red-400 transition p-1 rounded-lg hover:bg-red-50"
              title="Delete lead"
            >
              <FiTrash2 size={14} />
            </button>
          ) : (
            <div className="flex flex-col gap-1 items-end">
              <span className="text-[10px] text-red-600 font-bold">Sure?</span>
              <div className="flex gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[10px] bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-0.5 rounded-lg disabled:opacity-50 transition"
                >
                  {deleting ? "…" : "Yes"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                  disabled={deleting}
                  className="text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-2 py-0.5 rounded-lg disabled:opacity-50 transition"
                >
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [botAvailable, setBotAvailable] = useState(true);
  const [filter, setFilter]             = useState("all");
  const [search, setSearch]             = useState("");
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  const [selectedLead, setSelectedLead] = useState(null);

  async function loadLeads() {
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/leads");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setLeads(data.leads || []);
      setTotalTokensUsed(data.totalTokensUsed || 0);
      setBotAvailable(data.botAvailable !== false);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLeads(); }, []);

  function handleDeleteLead(jid) {
    setLeads((prev) => prev.filter((l) => l.jid !== jid));
  }

  // ── Filtered + searched leads ──────────────────────────────────────────────
  const filtered = leads.filter((l) => {
    const matchFilter = filter === "all" || l.joining_interest === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (l.name  || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q) ||
      (l.summary || "").toLowerCase().includes(q) ||
      (l.joining_reason || "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:  leads.length,
    high:   leads.filter(l => l.joining_interest === "high").length,
    medium: leads.filter(l => l.joining_interest === "medium").length,
    named:  leads.filter(l => l.name_confirmed).length,
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 flex-1 flex flex-col">

        {/* Header */}
        <header className="bg-white border-b border-gray-100 pl-14 pr-4 sm:px-8 py-4 sticky top-0 z-10 shadow-sm lg:pl-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
              <p className="text-sm text-gray-400 mt-0.5">WhatsApp contacts and their joining interest</p>
            </div>
            <button
              onClick={loadLeads}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              <FiRefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </header>

        <main className="px-4 sm:px-8 py-6 space-y-5 max-w-5xl w-full">

          {/* Bot offline banner */}
          {!botAvailable && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-start gap-3">
              <FiAlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">WhatsApp bot is offline</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Start the bot from Settings → WhatsApp Chatbot to collect leads. Showing cached data if available.
                </p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Contacts",  value: stats.total,  icon: FiUser,          color: "text-indigo-600 bg-indigo-50"  },
              { label: "High Interest",   value: stats.high,   icon: FiTrendingUp,    color: "text-green-600 bg-green-50"    },
              { label: "Medium Interest", value: stats.medium, icon: FiMessageCircle, color: "text-yellow-600 bg-yellow-50"  },
              { label: "Names Confirmed", value: stats.named,  icon: FiUser,          color: "text-purple-600 bg-purple-50"  },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl bg-white border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-xl font-black text-gray-900">{value}</p>
                  <p className="text-[11px] text-gray-400 font-medium">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Token usage stat */}
          {totalTokensUsed > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 shadow-sm px-6 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <span className="text-xl font-bold text-purple-600">💠</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Total AI Tokens Used</p>
                <p className="text-xs text-gray-500 mt-0.5">Across all chats with contacts</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-purple-600">{totalTokensUsed.toLocaleString()}</p>
                <p className="text-[10px] text-purple-500 font-semibold uppercase">tokens</p>
              </div>
            </div>
          )}

          {/* Search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or summary…"
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition capitalize ${
                    filter === f
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {f === "all"    ? `All (${leads.length})` :
                   f === "high"   ? `🔥 High (${stats.high})` :
                   f === "medium" ? `✨ Medium (${stats.medium})` : f}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          )}

          {/* Lead list */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white px-5 py-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-100 rounded w-32" />
                      <div className="h-3 bg-gray-100 rounded w-48" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FiMessageCircle size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">
                {leads.length === 0
                  ? "No leads yet — connect the WhatsApp bot to start collecting contacts."
                  : "No leads match your filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((lead) => (
                <LeadCard
                  key={lead.jid || lead.phone}
                  lead={lead}
                  onSelect={setSelectedLead}
                  onDelete={handleDeleteLead}
                />
              ))}
            </div>
          )}

          {lastRefresh && !loading && (
            <p className="text-xs text-gray-400 text-center pb-2">
              Last updated {lastRefresh.toLocaleTimeString("en-IN")}
            </p>
          )}
        </main>
      </div>

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onDelete={handleDeleteLead}
        />
      )}
    </div>
  );
}
