import { NextResponse } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const BOT_URL    = (process.env.WHATSAPP_BOT_URL   || "http://localhost:3002").replace(/\/+$/, "");
const BOT_SECRET = process.env.WHATSAPP_BOT_SECRET || "optimus-gym-secret";

async function botFetch(path) {
  const res = await fetch(`${BOT_URL}${path}`, {
    headers: { "x-bot-secret": BOT_SECRET },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Bot returned ${res.status}`);
  return res.json();
}

// Simple Supabase client for token fetching
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function supabaseGet(query) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: {
      apikey:        SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    signal: AbortSignal.timeout(3000),
  });
  return res.ok ? res.json() : [];
}

// ── Auth helper ───────────────────────────────────────────────────────────────
async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? decodeSession(token) : null;
  return session?.role === "admin" ? session : null;
}

// ── GET /api/leads ────────────────────────────────────────────────────────────
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch contacts and crux data in parallel
    const [contacts, highLeads] = await Promise.allSettled([
      botFetch("/contacts"),
      botFetch("/leads"),   // high joining_interest crux rows
    ]);

    const contactList = contacts.status  === "fulfilled" ? (contacts.value  || []) : [];
    const cruxList    = highLeads.status === "fulfilled" ? (highLeads.value || []) : [];

    // Fetch token usage data from Supabase
    const tokenRows   = await supabaseGet("chat_tokens?order=created_at.desc");
    const tokensByJid = {};
    for (const row of tokenRows) {
      if (!tokensByJid[row.jid]) {
        tokensByJid[row.jid] = {
          totalTokens: 0, inputTokens: 0, outputTokens: 0,
          requestCount: 0, byProvider: {}, history: [],
        };
      }
      tokensByJid[row.jid].totalTokens  += row.total_tokens  || 0;
      tokensByJid[row.jid].inputTokens  += row.input_tokens  || 0;
      tokensByJid[row.jid].outputTokens += row.output_tokens || 0;
      tokensByJid[row.jid].requestCount += 1;

      if (!tokensByJid[row.jid].byProvider[row.provider]) {
        tokensByJid[row.jid].byProvider[row.provider] = { total: 0, requests: 0 };
      }
      tokensByJid[row.jid].byProvider[row.provider].total    += row.total_tokens || 0;
      tokensByJid[row.jid].byProvider[row.provider].requests += 1;

      if (tokensByJid[row.jid].history.length < 20) {
        tokensByJid[row.jid].history.push({
          provider: row.provider, model: row.model,
          totalTokens: row.total_tokens, createdAt: row.created_at,
        });
      }
    }

    // Merge: attach crux data to matching contact by jid
    const cruxByJid = Object.fromEntries(cruxList.map(c => [c.jid, c]));

    const leads = contactList.map(contact => ({
      jid:            contact.jid,
      phone:          contact.phone,
      name:           contact.name || null,
      name_confirmed: contact.name_confirmed || false,
      first_seen:     contact.first_seen,
      last_seen:      contact.last_seen,
      summary:          cruxByJid[contact.jid]?.summary          || null,
      joining_interest: cruxByJid[contact.jid]?.joining_interest  || "unknown",
      joining_reason:   cruxByJid[contact.jid]?.joining_reason    || null,
      main_topics:      cruxByJid[contact.jid]?.main_topics        || [],
      asked_about:      cruxByJid[contact.jid]?.asked_about        || [],
      diet_preference:  cruxByJid[contact.jid]?.diet_preference    || "unknown",
      message_count:    cruxByJid[contact.jid]?.message_count      || null,
      crux_updated_at:  cruxByJid[contact.jid]?.updated_at         || null,
      tokens: tokensByJid[contact.jid] || {
        totalTokens: 0, inputTokens: 0, outputTokens: 0,
        requestCount: 0, byProvider: {}, history: [],
      },
    }));

    const totalTokensUsed = Object.values(tokensByJid).reduce((s, t) => s + t.totalTokens, 0);

    return NextResponse.json({ leads, botAvailable: true, totalTokensUsed });
  } catch {
    return NextResponse.json({
      leads: [], botAvailable: false, totalTokensUsed: 0,
      error: "Bot service unavailable — start the bot to see leads.",
    });
  }
}

// ── DELETE /api/leads ─────────────────────────────────────────────────────────
export async function DELETE(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jid } = await request.json();
    // JIDs can be plain (1234@c.us) or linked-device (1234:5@c.us)
    if (!jid || !/^\d+(?::\d+)?@[a-z.]+$/.test(jid)) {
      return NextResponse.json({ error: "Invalid JID" }, { status: 400 });
    }

    const res = await fetch(`${BOT_URL}/contact/${encodeURIComponent(jid)}`, {
      method:  "DELETE",
      headers: { "x-bot-secret": BOT_SECRET },
      signal:  AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || "Delete failed" }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
