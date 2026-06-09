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
const BOT_SECRET         = process.env.BOT_SECRET      || "Optimus-bot-secret";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL   || "meta-llama/llama-3.3-70b-instruct:free";
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY     || "";
const GEMINI_MODEL       = "gemma-4-31b-it";
const SUPABASE_URL       = (process.env.SUPABASE_API_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY       = process.env.SUPABASE_ANON_KEY  || "";

// ── Gym context cache — rebuild every 5 minutes, not on every message ─────────
let   gymContextCache    = null;
let   gymContextCachedAt = 0;
const GYM_CONTEXT_TTL    = 5 * 60 * 1000; // 5 minutes

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
let botState    = "idle";   // idle | pairing | ready | auth_failed | disconnected
let pairingCode = null;
let client      = null;
let pendingPhone = savedPhone(); // restore from last session

const conversations  = new Map();
const MAX_HISTORY    = 20;

// ── Puppeteer args — Windows-compatible ──────────────────────────────────────
const PUPPETEER_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
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
  // NOTE: --single-process and --no-zygote are Linux-only, removed for Windows compatibility
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
  // Return cached version if still fresh
  if (gymContextCache && (Date.now() - gymContextCachedAt) < GYM_CONTEXT_TTL) {
    return gymContextCache;
  }
  try {
    const rows = await supabaseGet("settings?select=*");
    if (!rows || !rows.length) return buildDefaultContext();

    const get = (key) => rows.find((r) => r.key === key)?.value ?? null;
    const timing    = get("gym_timing")         || {};
    const pricing   = get("membership_pricing") || [];
    const dietPlans = get("diet_plans")         || [];

    // ── System prompt ──────────────────────────────────────────────────────────
    let ctx = `You are OptimusBot, the WhatsApp assistant for Optimus Gym.

CRITICAL: Output ONLY the final reply message. Never show your thinking, reasoning, analysis, bullet points of intent, language detection notes, role descriptions, or any internal processing. Just write the actual reply as if you are texting someone on WhatsApp.

Rules:
1. LANGUAGE: Detect the user's language and reply in that exact same language and script.
2. SCOPE: Only answer gym, fitness, diet, workout, and membership questions. For anything else say: "Sorry, I can only help with gym and fitness questions! 💪"
3. FORMAT: WhatsApp markdown only — *bold* for headings, blank lines between sections, dashes for lists. No tables, no ### headers.
4. TONE: Friendly gym trainer. Short and clear, not walls of text.
5. DIET/WORKOUT PLANS: Never give a plan immediately. Ask ONE question at a time: first age, then height, then current weight, then goal. Only after all 4 answers, give the plan.
6. PROHIBITED: No relationship advice, personal questions, politics, religion, finance, or non-fitness topics.

`;

    // ── Gym hours ──────────────────────────────────────────────────────────────
    const dayLabels  = { mon:"Monday", tue:"Tuesday", wed:"Wednesday", thu:"Thursday", fri:"Friday", sat:"Saturday", sun:"Sunday" };
    const schedule   = timing.schedule || {};
    const holidays   = timing.holidays || [];
    const openDays   = Object.entries(schedule).filter(([,v]) => !v.closed);
    const closedDays = Object.entries(schedule).filter(([,v]) => v.closed);

    if (openDays.length > 0) {
      ctx += "GYM HOURS:\n";
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
      ctx += `GYM HOURS:\nWeekdays: ${timing.weekday_open} to ${timing.weekday_close}\nWeekends: ${timing.weekend_open} to ${timing.weekend_close}\n\n`;
    }

    if (holidays.length > 0) {
      const upcoming = holidays
        .filter((d) => new Date(d) >= new Date())
        .map((d) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }));
      if (upcoming.length > 0)
        ctx += `UPCOMING HOLIDAYS (gym closed): ${upcoming.join(", ")}\n\n`;
    }

    // ── Membership pricing ─────────────────────────────────────────────────────
    if (pricing.length > 0) {
      ctx += "MEMBERSHIP PLANS:\n";
      for (const p of pricing)
        if (p.price) ctx += `- ${p.name}: ₹${p.price} (${p.duration_days} days)\n`;
      ctx += "\n";
    }

    // ── Diet plans (full detail so AI can match & personalise) ─────────────────
    if (dietPlans.length > 0) {
      ctx += "SAVED DIET PLANS (use these when a member's goal matches — personalise based on their stats):\n";
      for (const d of dietPlans) {
        ctx += `\nPlan: ${d.title}\n`;
        ctx += `Goal: ${d.goal.replace(/_/g, " ")}\n`;
        if (d.calories) ctx += `Calories: ${d.calories} kcal/day\n`;
        if (d.protein)  ctx += `Protein: ${d.protein}g | Carbs: ${d.carbs||"?"}g | Fats: ${d.fats||"?"}g\n`;
        if (d.meals)    ctx += `Meals: ${d.meals}\n`;
        if (d.notes)    ctx += `Notes: ${d.notes}\n`;
      }
      ctx += "\n";
    }

    ctx += "If someone asks about joining → tell them to visit the gym or call us.\n";
    ctx += "If someone asks about their membership/attendance → tell them to log in to the member portal or contact the front desk.";

    gymContextCache    = ctx;
    gymContextCachedAt = Date.now();
    return ctx;
  } catch { return buildDefaultContext(); }
}

function buildDefaultContext() {
  return `You are OptimusBot, the WhatsApp assistant for Optimus Gym.
CRITICAL: Output ONLY the final reply. Never show thinking, reasoning, intent analysis, or language detection notes.
Rules: 1) Reply in the user's language always. 2) Only answer gym/fitness/diet/membership questions. 3) WhatsApp markdown only (*bold*, dashes, blank lines). 4) Collect age/height/weight/goal one at a time before giving plans. 5) Friendly trainer tone, short replies.`;
}

// ── Format AI reply for WhatsApp — strip thinking, fix markdown ───────────────
function formatForWhatsApp(text) {
  let t = text;

  // Strip <think>...</think> or <thinking>...</thinking> blocks (some models leak these)
  t = t.replace(/<think[\s\S]*?<\/think>/gi, "");
  t = t.replace(/<thinking[\s\S]*?<\/thinking>/gi, "");

  // Strip lines that look like internal reasoning/analysis the model shouldn't show:
  // e.g. "* Language: English." / "* Intent: Greeting." / "* Role: OptimusBot..."
  // These are lines starting with "* Word: content." pattern
  t = t.replace(/^\*\s+\w[\w\s]+:\s+.+\.\*?\s*$/gm, "");

  // Strip any "User says:" preamble blocks
  t = t.replace(/^User says:.*$/gm, "");

  // Convert **bold** → *bold* (WhatsApp uses single asterisk)
  t = t.replace(/\*\*(.+?)\*\*/g, "*$1*");

  // Convert ### headings → *bold*
  t = t.replace(/^#{1,3}\s+(.+)$/gm, "*$1*");

  // Collapse 3+ blank lines to max 1 blank line
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// ── AI Models Configuration ───────────────────────────────────────────────────
const ALL_MODELS = [
  // OpenRouter
  { id: "or_llama33",     provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free",                        label: "Llama 3.3 70B",         free: true  },
  { id: "or_gptoss120",   provider: "openrouter", model: "openai/gpt-oss-120b:free",                                      label: "GPT-OSS 120B",          free: true  },
  { id: "or_gptoss20",    provider: "openrouter", model: "openai/gpt-oss-20b:free",                                       label: "GPT-OSS 20B",           free: true  },
  { id: "or_nem120",      provider: "openrouter", model: "nvidia/nemotron-3-super-120b-a12b:free",                        label: "Nemotron Super 120B",   free: true  },
  { id: "or_nem550",      provider: "openrouter", model: "nvidia/nemotron-3-ultra-550b-a55b:free",                        label: "Nemotron Ultra 550B",   free: true  },
  { id: "or_nem30",       provider: "openrouter", model: "nvidia/nemotron-3-nano-30b-a3b:free",                           label: "Nemotron Nano 30B",     free: true  },
  { id: "or_nem30o",      provider: "openrouter", model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",            label: "Nemotron Nano Omni",    free: true  },
  { id: "or_nem12",       provider: "openrouter", model: "nvidia/nemotron-nano-12b-v2-vl:free",                           label: "Nemotron Nano VL 12B",  free: true  },
  { id: "or_nem9",        provider: "openrouter", model: "nvidia/nemotron-nano-9b-v2:free",                               label: "Nemotron Nano 9B",      free: true  },
  { id: "or_kimi",        provider: "openrouter", model: "moonshotai/kimi-k2.6:free",                                     label: "Kimi K2.6",             free: true  },
  { id: "or_qwencoder",   provider: "openrouter", model: "qwen/qwen3-coder:free",                                         label: "Qwen3 Coder",           free: true  },
  { id: "or_qwennext",    provider: "openrouter", model: "qwen/qwen3-next-80b-a3b-instruct:free",                         label: "Qwen3 Next 80B",        free: true  },
  { id: "or_glm45",       provider: "openrouter", model: "z-ai/glm-4.5-air:free",                                         label: "GLM 4.5 Air",           free: true  },
  { id: "or_gemma431",    provider: "openrouter", model: "google/gemma-4-31b-it:free",                                    label: "Gemma 4 31B (OR)",      free: true  },
  { id: "or_gemma426",    provider: "openrouter", model: "google/gemma-4-26b-a4b-it:free",                                label: "Gemma 4 26B (OR)",      free: true  },
  { id: "or_hermes",      provider: "openrouter", model: "nousresearch/hermes-3-llama-3.1-405b:free",                     label: "Hermes 3 405B",         free: true  },
  { id: "or_dolphin",     provider: "openrouter", model: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Dolphin Mistral 24B",  free: true  },
  { id: "or_llama32_3b",  provider: "openrouter", model: "meta-llama/llama-3.2-3b-instruct:free",                         label: "Llama 3.2 3B",          free: true  },

  // Gemini
  { id: "gm_25flash",     provider: "gemini", model: "gemini-2.5-flash",                      label: "Gemini 2.5 Flash",      free: true  },
  { id: "gm_25flashlite", provider: "gemini", model: "gemini-2.5-flash-lite-preview-06-17",   label: "Gemini 2.5 Flash Lite", free: true  },
  { id: "gm_31flashlite", provider: "gemini", model: "gemini-3.1-flash-lite",                 label: "Gemini 3.1 Flash Lite", free: true  },
  { id: "gm_31pro",       provider: "gemini", model: "gemini-3.1-pro",                        label: "Gemini 3.1 Pro",        free: false },
  { id: "gm_3flash",      provider: "gemini", model: "gemini-3-flash",                        label: "Gemini 3 Flash",        free: true  },
  { id: "gm_gemma426",    provider: "gemini", model: "gemma-3-27b-it",                        label: "Gemma 4 26B",           free: true  },
  { id: "gm_gemma431",    provider: "gemini", model: "gemma-4-31b",                           label: "Gemma 4 31B",           free: true  },
];

const MAIN_MODELS = [
  { provider: "openrouter", model: "openai/gpt-oss-120b:free" },
  { provider: "openrouter", model: "openai/gpt-oss-20b:free" },
  { provider: "gemini",     model: "gemini-3.1-flash-lite" },
  { provider: "gemini",     model: "gemini-2.5-flash" }
];

const MODEL_SEQUENCE = [
  ...MAIN_MODELS,
  ...ALL_MODELS.filter(m => !MAIN_MODELS.some(main => main.model === m.model && main.provider === m.provider))
];

// ── OpenRouter call ───────────────────────────────────────────────────────────
async function callOpenRouter(messages, modelToUse) {
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://optimus.gym",
      "X-Title":      "OptimusGym Bot",
    },
    body: JSON.stringify({
      model:             modelToUse || OPENROUTER_MODEL,
      messages,
      max_tokens:        350,
      temperature:       0.65,
      include_reasoning: false,   // suppress chain-of-thought from reasoning models
    }),
  });
  const data = await res.json();

  // Rate limit or quota exceeded — signal fallback needed
  if (res.status === 429 || data?.error?.code === 429 ||
      (data?.error?.message || "").toLowerCase().includes("rate limit") ||
      (data?.error?.message || "").toLowerCase().includes("quota")) {
    console.warn(`⚠️  OpenRouter rate limit hit for ${modelToUse || OPENROUTER_MODEL}`);
    throw Object.assign(new Error("rate_limit"), { isRateLimit: true });
  }

  if (!res.ok || data.error) {
    console.error(`OpenRouter error (${modelToUse || OPENROUTER_MODEL}):`, JSON.stringify(data));
    throw new Error("openrouter_error");
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    console.error(`OpenRouter empty content (${modelToUse || OPENROUTER_MODEL}):`, JSON.stringify(data));
    throw new Error("empty_response");
  }
  return text;
}

// ── Gemini fallback call ──────────────────────────────────────────────────────
async function callGemini(messages, modelToUse) {
  if (!GEMINI_API_KEY) throw new Error("no_gemini_key");

  // Convert OpenAI-style messages to Gemini format
  const systemMsg = messages.find((m) => m.role === "system")?.content || "";
  const chatMsgs  = messages.filter((m) => m.role !== "system");

  const geminiContents = chatMsgs.map((m) => ({
    role:  m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemMsg }] },
    contents:           geminiContents,
    generationConfig:   { maxOutputTokens: 350, temperature: 0.65 },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse || GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res  = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (!res.ok || data.error) {
    const msg = data?.error?.message || "";
    const retry = data?.error?.details?.find(d => d["@type"]?.includes("RetryInfo"))?.retryDelay;
    if (res.status === 429 || data?.error?.code === 429 || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("quota")) {
      console.warn(`⚠️  Gemini rate limit hit for ${modelToUse || GEMINI_MODEL}.${retry ? ` Retry in ${retry}.` : ""}`);
      throw Object.assign(new Error("rate_limit"), { isRateLimit: true });
    } else {
      console.error(`Gemini error (${modelToUse || GEMINI_MODEL}):`, JSON.stringify(data));
      throw new Error("gemini_error");
    }
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    console.error(`Gemini empty content (${modelToUse || GEMINI_MODEL}):`, JSON.stringify(data));
    throw new Error("gemini_empty");
  }
  return text;
}

// ── Main AI entry point — Multi-model Fallback ────────────────────────────────
async function askAI(userJid, userMessage) {
  if (!OPENROUTER_API_KEY && !GEMINI_API_KEY)
    return "Hi! I'm OptimusBot 💪 No AI key configured yet. Please contact the gym admin.";

  const gymContext = await getGymContext();
  const history    = conversations.get(userJid) || [];
  const messages   = [
    { role: "system", content: gymContext },
    ...history,
    { role: "user",   content: userMessage },
  ];

  let raw = null;
  let usedModel = null;

  for (const m of MODEL_SEQUENCE) {
    try {
      if (m.provider === "openrouter") {
        if (!OPENROUTER_API_KEY) continue;
        raw = await callOpenRouter(messages, m.model);
      } else if (m.provider === "gemini") {
        if (!GEMINI_API_KEY) continue;
        raw = await callGemini(messages, m.model);
      }
      
      if (raw) {
        usedModel = m;
        console.log(`✅ Replied via ${m.provider} (${m.model})`);
        break; // Successfully got response
      }
    } catch (err) {
      if (err.isRateLimit || err.message === "empty_response" || err.message === "openrouter_error" || err.message === "gemini_error") {
        console.log(`❌ Model ${m.model} failed/rate-limited, trying next...`);
        continue;
      }
      // If some other unknown error, also continue
      console.log(`❌ Model ${m.model} threw unexpected error, trying next...`);
      continue;
    }
  }

  if (!raw) {
    console.error("All fallback models failed.");
    return "Sorry, couldn't process that right now. Please contact us at the gym! 💪";
  }

  const reply = formatForWhatsApp(raw);

  history.push({ role: "user",      content: userMessage });
  history.push({ role: "assistant", content: reply });
  if (history.length > MAX_HISTORY * 2)
    history.splice(0, history.length - MAX_HISTORY * 2);
  conversations.set(userJid, history);
  return reply;
}

// ── Build a WhatsApp client ───────────────────────────────────────────────────
function buildClient(phone) {
  return new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, "wwebjs_auth") }),
    puppeteer: { headless: true, args: PUPPETEER_ARGS },
    webVersionCache: {
      type: "local",
      path: path.join(__dirname, ".wwebjs_cache")
    }
  });
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

  let pairingRequested = false;

  c.on("qr", async () => {
    if (pairingRequested) return;
    pairingRequested = true;
    botState = "pairing";
    console.log("📱 QR ready — requesting pairing code for", phone);
    try {
      const code = await c.requestPairingCode(phone);
      pairingCode = code;
      console.log(`✓ Pairing code: ${code}`);
    } catch (err) {
      console.error("requestPairingCode failed:", err.message);
      setTimeout(async () => {
        try {
          const code = await c.requestPairingCode(phone);
          pairingCode = code;
          console.log(`✓ Pairing code (retry): ${code}`);
        } catch (err2) {
          console.error("requestPairingCode retry failed:", err2.message);
          botState = "auth_failed";
        }
      }, 3000);
    }
  });

  c.on("loading_screen", (pct) => console.log(`⏳ Loading: ${pct}%`));

  c.on("authenticated", () => {
    console.log("✅ WhatsApp authenticated");
    pairingCode = null;
    botState    = "ready";
  });

  c.on("auth_failure", (msg) => {
    console.error("❌ Auth failure:", msg);
    botState    = "auth_failed";
    pairingCode = null;
    client      = null;
  });

  c.on("ready", () => {
    console.log("✅ WhatsApp bot is READY");
    botState    = "ready";
    pairingCode = null;
    if (pendingPhone) savePhone(pendingPhone); // persist phone for manual reconnect
  });

  c.on("disconnected", (reason) => {
    console.log("⚡ Disconnected:", reason);
    client      = null;
    pairingCode = null;
    // No auto-reconnect — set state so UI shows manual reconnect button
    botState = "disconnected";
    console.log("ℹ️  Session disconnected. Use the dashboard to reconnect manually.");
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
    console.error("Full error:", err.stack || err);
    botState = "disconnected";
    client   = null;
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
  const withCode = normalized.length === 10 ? "91" + normalized : normalized;
  if (withCode.length < 11)
    return res.status(400).json({ error: "Invalid phone number — include country code" });

  botState    = "pairing";
  pairingCode = null;

  startClient(withCode);
  res.json({ success: true, state: "pairing" });
});

app.post("/disconnect", auth, async (_req, res) => {
  try {
    if (client) { await client.logout(); await client.destroy(); client = null; }
  } catch {}

  botState     = "idle";
  pairingCode  = null;
  pendingPhone = null;
  clearPhone();
  conversations.clear();
  res.json({ success: true });
});

// POST /reconnect — manual reconnect using saved session (no re-pairing needed)
app.post("/reconnect", auth, (req, res) => {
  const phone = pendingPhone || savedPhone();
  if (!phone) return res.status(400).json({ error: "No saved phone — please pair first" });
  if (botState === "ready") return res.json({ success: true, state: "ready", message: "Already connected" });

  console.log(`🔄 Manual reconnect for +${phone}…`);
  botState = "pairing"; // use pairing state while connecting so UI shows spinner
  startClient(phone);
  res.json({ success: true, state: "reconnecting" });
});

// POST /reset — stop current session without logout (for "start over" flow)
app.post("/reset", auth, async (_req, res) => {
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
  console.log(`\n🤖 OptimusWhatsApp Bot running on port ${PORT}`);
  console.log(`   OpenRouter key:   ${OPENROUTER_API_KEY ? "configured ✓" : "NOT configured ✗"}`);
  console.log(`   OpenRouter model: ${OPENROUTER_MODEL}`);
  console.log(`   Gemini fallback:  ${GEMINI_API_KEY ? "configured ✓" : "not set (optional)"}`);
  console.log(`   OpenRouter URL:   ${OPENROUTER_API_URL}`);

  // ── Restore previous session on startup (session auth still valid, no re-pairing) ──
  const phone = savedPhone();
  if (phone) {
    console.log(`\n🔁 Restoring previous session for +${phone}…`);
    pendingPhone = phone;
    botState     = "pairing";
    startClient(phone);
  } else {
    console.log("   No saved session — waiting for pairing.\n");
  }
});
