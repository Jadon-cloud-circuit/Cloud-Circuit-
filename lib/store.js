// lib/store.js
// Simple in-memory store. For an MVP this is fine - calls and config
// live as long as the server process is running. Restarting clears it.
// (If you need persistence across restarts later, swap this for a small DB.)

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "data", "config.json");

const defaultConfig = {
  agentName: process.env.AGENT_NAME || "Sarah",
  voiceId: process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL",
  companyName: process.env.COMPANY_NAME || "Cloud Circuit",
  yourName: process.env.YOUR_NAME || "",
  productService:
    "We automate appointment booking - leads get captured 24/7 and booked straight into the business owner's calendar automatically, no manual follow-up needed.",
  keyBenefit:
    "Businesses stop losing leads to missed calls and slow follow-up - every enquiry gets booked automatically, even after hours.",
  targetBusiness: "local service businesses",
  availableSlots: [
    "Monday 10:00 AM", "Monday 2:00 PM",
    "Tuesday 10:00 AM", "Tuesday 2:00 PM",
    "Wednesday 11:00 AM", "Wednesday 3:00 PM",
    "Thursday 10:00 AM", "Thursday 2:00 PM",
    "Friday 10:00 AM", "Friday 1:00 PM",
  ],
  callDelaySeconds: 45, // wait between outbound calls in a campaign
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      return { ...defaultConfig, ...saved };
    }
  } catch (e) {
    console.error("[store] failed to load config:", e.message);
  }
  return { ...defaultConfig };
}

function saveConfig(config) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error("[store] failed to save config:", e.message);
  }
}

// ── In-memory state ──
const state = {
  config: loadConfig(),
  contacts: [],         // queue of { name, business, phone, status }
  calls: new Map(),      // callSid -> { contact, transcript, stage, booking, startedAt, status }
  campaignRunning: false,
};

function addCallLog(callSid, entry) {
  const call = state.calls.get(callSid);
  if (!call) return;
  call.transcript.push({ ...entry, timestamp: Date.now() });
}

module.exports = { state, saveConfig, loadConfig };
