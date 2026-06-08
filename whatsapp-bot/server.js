require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const express = require("express");
const cors    = require("cors");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fetch   = require("node-fetch");
const fs      = require("fs");
const path    = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT               = process.env.BOT_PORT        || 3002;
const BOT_SECRET         = process.env.BOT_SECRET      || "fitnation-bot-secret";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL   || "openai/gpt-4o-mini";
const SUPABASE_URL       = (process.env.SUPABASE_API_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY       = process.env.SUPABASE_ANON_KEY  || "";

// ── Saved-phone file — survives bot restarts ──────────────────────────────────
const PHONE_FILE = path.join(__dirname, ".saved_phone");

function savedPhone() {
  try { return fs.readFileSync(PHONE_FILE, "utf8").trim(); } catch { return null; }
}
function savePhone(phone) {
  try { fs.writeFileSync(PHONE_FILE, phone, "utf8"); } catch {}
}
function clearPhone() {
  try { fs.unlinkSync(PHONE_FILE); } catch {}
}

// ── State ─────────────────────────────────────────────────────────────────────
let botState    = "idle";   // idle | pairing | reconnecting | ready | auth_failed
let pairingCode = null;
let client      = null;
let pendingPhone = savedPhone(); // restore from last session

const conversations  = new Map();
const MAX_HISTORY    = 10;
let   reconnectTimer = null;

// ── Puppeteer args — optimised for fast launch ────────────────────────────────
const PUPPETEER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-zygote",
  "--single-process",
  "--disable-accelerated-2d-canvas",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-default-apps",
  "--disable-sync",
  "--disable-translate",
  "--hide-scrollbars",
  "--metrics-recording-only",
  "--mute-audio",
  "--safebrowsing-disable-auto-update",
];

// ── Supabase helper ───────────────────────────────────────────────────────────
async function supabaseGet(p) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/${p}`, {
      headers: {
        apikey:        SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type":"application/json",
      },
    });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

// ── Gym context ───────────────────────────────────────────────────────────────
async function getGymContext() {
  try {
    const rows = await supabaseGet("settings?select=*");
    if (!rows || !rows.length) return buildDefaultContext();

    const get = (key) => rows.find((r) => r.key === key)?.value ?? null;
    const timing    = get("gym_timing")         || {};
    const pricing   = get("membership_pricing") || [];
    const dietPlans = get("diet_plans")         || [];

    let ctx = "You are a helpful assistant for FitNation Gym, replying on WhatsApp. ";
    ctx += "Write like a real person — short sentences, casual but professional tone, no emojis. ";
    ctx += "Don't use bullet points or bold text. Just plain conversational replies. ";
    ctx += "Keep answers brief. If you don't know something specific, say so honestly and suggest they call or visit the gym. ";
    ctx += "Only answer questions related to the gym, fitness, diet, or membership.\n\n";

    // New per-day schedule format
    const dayLabels  = { mon:"Monday", tue:"Tuesday", wed:"Wednesday", thu:"Thursday", fri:"Friday", sat:"Saturday", sun:"Sunday" };
    const schedule   = timing.schedule || {};
    const holidays   = timing.holidays || [];
    const openDays   = Object.entries(schedule).filter(([,v]) => !v.closed);
    const closedDays = Object.entries(schedule).filter(([,v]) => v.closed);

    if (openDays.length > 0) {
      ctx += "GYM HOURS:\n";
      // Group days with same hours
      const groups = {};
      for (const [d, v] of openDays) {
        const key = `${v.open}-${v.close}`;
        if (!groups[key]) groups[key] = { open: v.open, close: v.close, days: [] };
        groups[key].days.push(dayLabels[d]);
      }
      for (const g of Object.values(groups))
        ctx += `${g.days.join(", ")}: ${g.open} to ${g.close}\n`;
      if (closedDays.length > 0)
        ctx += `Weekly off: ${closedDays.map(([d]) => dayLabels[d]).join(", ")}\n`;
      ctx += "\n";
    } else if (timing.weekday_open) {
      // Backwards compatibility with old format
      ctx += `GYM HOURS:\nWeekdays: ${timing.weekday_open} to ${timing.weekday_close}\nWeekends: ${timing.weekend_open} to ${timing.weekend_close}\n\n`;
    }

    if (holidays.length > 0) {
      const upcoming = holidays
        .filter((d) => new Date(d) >= new Date())
        .map((d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }));
      if (upcoming.length > 0)
        ctx += `UPCOMING HOLIDAYS (gym closed): ${upcoming.join(", ")}\n\n`;
    }
    if (pricing.length > 0) {
      ctx += "MEMBERSHIP PLANS:\n";
      for (const p of pricing)
        if (p.price) ctx += `• ${p.name}: ₹${p.price} (${p.duration_days} days)\n`;
      ctx += "\n";
    }
    if (dietPlans.length > 0) {
      ctx += "DIET PLANS WE OFFER:\n";
      for (const d of dietPlans) {
        ctx += `• ${d.title} (Goal: ${d.goal.replace(/_/g, " ")})\n`;
        if (d.calories) ctx += `  Calories: ${d.calories} kcal/day\n`;
        if (d.protein)  ctx += `  Protein: ${d.protein}g | Carbs: ${d.carbs||"?"}g | Fats: ${d.fats||"?"}g\n`;
        if (d.meals)    ctx += `  Meals: ${d.meals}\n`;
        if (d.notes)    ctx += `  Notes: ${d.notes}\n`;
      }
      ctx += "\n";
    }
    ctx += "If someone asks about joining, tell them to visit the gym or call us. ";
    ctx += "If someone asks their membership status or attendance, tell them to log in to the member portal or contact the front desk.";
    return ctx;
  } catch { return buildDefaultContext(); }
}

function buildDefaultContext() {
  return "You are a helpful assistant for FitNation Gym replying on WhatsApp. Write like a real person — short, casual, no emojis, no bullet points, plain text only. Only answer questions about the gym, fitness, diet, or membership. If you don't have specific info, tell them to visit or call the gym.";
}

// ── OpenRouter AI ─────────────────────────────────────────────────────────────
async function askAI(userJid, userMessage) {
  if (!OPENROUTER_API_KEY)
    return "Hi! I'm the FitNation bot. OpenRouter API key not configured yet.";

  const gymContext = await getGymContext();
  const history    = conversations.get(userJid) || [];
  const messages   = [
    { role: "system", content: gymContext },
    ...history,
    { role: "user",   content: userMessage },
  ];

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fitnation.gym",
        "X-Title":      "FitNation Gym Bot",
      },
      body: JSON.stringify({ model: OPENROUTER_MODEL, messages, max_tokens: 400, temperature: 0.7 }),
    });
    const data  = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty response");

    history.push({ role: "user",      content: userMessage });
    history.push({ role: "assistant", content: reply });
    if (history.length > MAX_HISTORY * 2)
      history.splice(0, history.length - MAX_HISTORY * 2);
    conversations.set(userJid, history);
    return reply;
  } catch (err) {
    console.error("OpenRouter error:", err.message);
    return "Sorry, I couldn't process that right now. Please contact us at the gym!";
  }
}

// ── Build a WhatsApp client ───────────────────────────────────────────────────
function buildClient(phone) {
  return new Client({
    authStrategy: new LocalAuth({ dataPath: "./wwebjs_auth" }),
    puppeteer: { headless: true, args: PUPPETEER_ARGS },
    // Disable unnecessary web features for faster load
    webVersionCache: { type: "remote", remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html" },
  });
}

// ── Schedule an auto-reconnect ────────────────────────────────────────────────
function scheduleReconnect(delayMs = 5000) {
  if (reconnectTimer) return; // already scheduled
  const phone = pendingPhone || savedPhone();
  if (!phone) return;         // no phone saved → can't auto-reconnect

  console.log(`🔄 Auto-reconnect in ${delayMs / 1000}s for ${phone}…`);
  botState = "reconnecting";

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    startClient(phone);
  }, delayMs);
}

// ── Start (or restart) the WhatsApp client ───────────────────────────────────
function startClient(phone) {
  if (client) {
    try { client.destroy(); } catch {}
    client = null;
  }

  pendingPhone = phone;
  pairingCode  = null;

  const c = buildClient(phone);
  client  = c;

  c.on("qr", async () => {
    // QR event = WhatsApp needs fresh auth — request pairing code instead
    botState = "pairing";
    console.log("📱 QR ready — requesting pairing code for", phone);
    try {
      const code = await c.requestPairingCode(phone);
      pairingCode = code;
      console.log(`✓ Pairing code: ${code}`);
    } catch (err) {
      console.error("requestPairingCode failed:", err.message);
      botState = "auth_failed";
    }
  });

  c.on("loading_screen", (pct) => console.log(`⏳ Loading: ${pct}%`));

  c.on("authenticated", () => {
    console.log("✅ WhatsApp authenticated");
    pairingCode = null;
    botState    = "ready"; // set ready immediately on auth (ready event confirms)
  });

  c.on("auth_failure", (msg) => {
    console.error("❌ Auth failure:", msg);
    botState    = "auth_failed";
    pairingCode = null;
    client      = null;
    // Don't auto-reconnect on auth failure — user needs to re-pair
  });

  c.on("ready", () => {
    console.log("✅ WhatsApp bot is READY");
    botState    = "ready";
    pairingCode = null;
    if (pendingPhone) savePhone(pendingPhone); // persist for next restart
  });

  c.on("disconnected", (reason) => {
    console.log("⚡ Disconnected:", reason);
    client   = null;
    botState = "reconnecting";
    pairingCode = null;
    // Auto-reconnect — LocalAuth session is still saved, so no pairing needed
    scheduleReconnect(5000);
  });

  c.on("message", async (msg) => {
    if (msg.from === "status@broadcast" || msg.isStatus) return;
    if (msg.from.endsWith("@g.us") || msg.fromMe) return;
    const body = (msg.body || "").trim();
    if (!body) return;
    console.log(`📩 ${msg.from}: ${body}`);
    try {
      const reply = await askAI(msg.from, body);
      await msg.reply(reply);
    } catch (err) {
      console.error("Reply error:", err.message);
    }
  });

  c.initialize().catch((err) => {
    console.error("initialize() error:", err.message);
    botState = "reconnecting";
    client   = null;
    scheduleReconnect(8000);
  });
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const secret = req.headers["x-bot-secret"] || req.query.secret;
  if (secret !== BOT_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── API Routes ────────────────────────────────────────────────────────────────

app.get("/status", auth, (_req, res) => {
  res.json({
    state:          botState,
    pairingCode:    pairingCode || null,
    hasPairingCode: Boolean(pairingCode),
    phone:          pendingPhone,
  });
});

app.post("/start-pairing", auth, (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone is required" });

  const normalized = String(phone).replace(/\D/g, "");
  // Auto-prepend India country code if only 10 digits given
  const withCode = normalized.length === 10 ? "91" + normalized : normalized;
  if (withCode.length < 11)
    return res.status(400).json({ error: "Invalid phone number — include country code" });

  // Cancel any pending reconnect timer
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  botState    = "pairing";
  pairingCode = null;

  // Non-blocking — pairing code arrives via /status polling
  startClient(withCode);

  res.json({ success: true, state: "pairing" });
});

app.post("/disconnect", auth, async (_req, res) => {
  // Cancel auto-reconnect so we don't reconnect right after manual disconnect
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  try {
    if (client) { await client.logout(); await client.destroy(); client = null; }
  } catch {}

  botState     = "idle";
  pairingCode  = null;
  pendingPhone = null;
  clearPhone();                // remove saved phone so no auto-reconnect on restart
  conversations.clear();
  res.json({ success: true });
});

// POST /reset — stop current session without logout (for "start over" flow)
app.post("/reset", auth, async (_req, res) => {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  try {
    if (client) { await client.destroy(); client = null; }
  } catch {}
  botState     = "idle";
  pairingCode  = null;
  pendingPhone = null;
  clearPhone();
  res.json({ success: true });
});

app.post("/send", auth, async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "to and message required" });
  if (botState !== "ready") return res.status(503).json({ error: "Bot not ready" });
  try {
    const chatId = to.includes("@") ? to : `${to.replace(/\D/g, "")}@c.us`;
    await client.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true, state: botState }));

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🤖 FitNation WhatsApp Bot running on port ${PORT}`);
  console.log(`   OpenRouter key:   ${OPENROUTER_API_KEY ? "configured ✓" : "NOT configured ✗"}`);
  console.log(`   OpenRouter URL:   ${OPENROUTER_API_URL}`);
  console.log(`   OpenRouter model: ${OPENROUTER_MODEL}`);

  // ── Auto-restore previous session on startup ────────────────────────────
  const phone = savedPhone();
  if (phone) {
    console.log(`\n🔁 Restoring previous session for +${phone}…`);
    botState = "reconnecting";
    startClient(phone);
  } else {
    console.log("   No saved session — waiting for pairing.\n");
  }
});
