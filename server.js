// ═══════════════════════════════════════════════════════════
//  GOLDEN HOUR AI — server.js  (SMS FIXED v3)
//  Real Twilio SMS — messages go to actual phones
//
//  SETUP (one time):
//    npm install express cors twilio
//
//  Then fill the 3 values below and run: node server.js
// ═══════════════════════════════════════════════════════════

const express = require("express");
const cors    = require("cors");
const twilio  = require("twilio");          // npm install twilio

const app  = express();
const PORT = 3000;

// ╔══════════════════════════════════════════════════════╗
// ║         🔑  YOUR TWILIO CREDENTIALS  🔑              ║
// ║  Get free account → https://www.twilio.com/try-twilio ║
// ║  Account SID + Auth Token → twilio.com/console       ║
// ║  Get free number → Console → Phone Numbers           ║
// ╚══════════════════════════════════════════════════════╝
const TWILIO_ACCOUNT_SID = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";  // ← PASTE YOUR SID
const TWILIO_AUTH_TOKEN  = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";    // ← PASTE YOUR TOKEN
const TWILIO_FROM_NUMBER = "+1XXXXXXXXXX";                        // ← YOUR TWILIO NUMBER

// ── Set MOCK_SMS = false to send REAL SMS ──
// ── Set MOCK_SMS = true  to only log to console (no SMS) ──
const MOCK_SMS = false;  // ✅ CHANGE THIS TO false FOR REAL SMS

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.static("."));

// ── IN-MEMORY STATE ──
let incidentLog       = [];
let currentStatus     = "Idle";
let dispatchedCount   = 0;
let emergencyContacts = [];   // { id, name, phone }

// ── TWILIO CLIENT (only created if real SMS enabled) ──
let twilioClient = null;
if (!MOCK_SMS) {
  try {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    log("✅ Twilio client initialized — REAL SMS mode active");
  } catch (e) {
    log("❌ Twilio init failed: " + e.message);
  }
}

// ── LOGGER ──
function log(msg) {
  const time = new Date().toLocaleTimeString("en-IN");
  console.log(`[${time}] ${msg}`);
}

// ══════════════════════════════════════════════
//  CORE SMS FUNCTION
//  Handles both Mock and Real Twilio sending
// ══════════════════════════════════════════════
async function sendSMS(toNumber, messageBody) {
  // Format Indian numbers: 9876543210 → +919876543210
  let formatted = toNumber.replace(/\s|-/g, "").trim();
  if (formatted.startsWith("0"))   formatted = "+91" + formatted.slice(1);
  if (!formatted.startsWith("+"))  formatted = "+91" + formatted;

  if (MOCK_SMS) {
    // ── MOCK MODE: just log, no real SMS ──
    log(`📱 [MOCK SMS] ─────────────────────`);
    log(`   To     : ${formatted}`);
    log(`   Message: ${messageBody.substring(0, 80)}...`);
    log(`──────────────────────────────────`);
    return { success: true, mock: true, to: formatted };
  }

  // ── REAL TWILIO SMS ──
  try {
    const result = await twilioClient.messages.create({
      body: messageBody,
      from: TWILIO_FROM_NUMBER,
      to:   formatted,
    });
    log(`✅ Real SMS sent → ${formatted} | SID: ${result.sid}`);
    return { success: true, sid: result.sid, to: formatted };
  } catch (err) {
    log(`❌ SMS FAILED → ${formatted}`);
    log(`   Error: ${err.message}`);
    log(`   Code : ${err.code}`);

    // Common error hints
    if (err.code === 21608) log("   ⚠ Trial account: verify this number at twilio.com/console first!");
    if (err.code === 21211) log("   ⚠ Invalid phone number format");
    if (err.code === 20003) log("   ⚠ Wrong Account SID or Auth Token");

    return { success: false, error: err.message, code: err.code, to: formatted };
  }
}

// ══════════════════════════════════════════════
//  NOTIFY ALL FAMILY CONTACTS
// ══════════════════════════════════════════════
async function notifyAllContacts(incident) {
  if (!emergencyContacts.length) {
    log("⚠️  No family contacts registered — no SMS sent");
    return [];
  }

  const mapsLink = `https://maps.google.com/?q=${incident.lat},${incident.lng}`;
  const timeStr  = new Date(incident.timestamp).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour:     "2-digit",
    minute:   "2-digit",
    day:      "2-digit",
    month:    "short",
  });

  const msg =
    `🚨 EMERGENCY ALERT - Golden Hour AI\n\n` +
    `A family member has been in a road accident!\n\n` +
    `📍 Location:\n${mapsLink}\n\n` +
    `🕐 Time: ${timeStr}\n` +
    `⚠️  Severity: ${incident.severity}\n` +
    `🚑 Ambulance dispatched to ${incident.hospital}\n` +
    `⏱  ETA: ${incident.eta}\n\n` +
    `Please rush to the location.\n` +
    `- Golden Hour AI`;

  log(`📲 Sending SMS to ${emergencyContacts.length} contact(s)...`);

  const results = await Promise.all(
    emergencyContacts.map(c => sendSMS(c.phone, msg))
  );

  const ok  = results.filter(r => r.success).length;
  const bad = results.filter(r => !r.success).length;
  log(`📊 SMS Results: ${ok} sent ✅  ${bad} failed ❌`);

  return results;
}

// ══════════════════════════════════════════════
//  API — FAMILY CONTACTS
// ══════════════════════════════════════════════

// POST /add-contact
app.post("/add-contact", (req, res) => {
  const { name, phone } = req.body;

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ success: false, error: "Name and phone are required" });
  }

  // Normalize phone: strip spaces/dashes, add +91 if needed
  let cleaned = phone.replace(/\s|-/g, "").trim();
  if (cleaned.startsWith("0"))  cleaned = "+91" + cleaned.slice(1);
  if (!cleaned.startsWith("+")) cleaned = "+91" + cleaned;

  // Validate length (10–15 digits after +)
  const digits = cleaned.replace("+", "");
  if (!/^[0-9]{10,15}$/.test(digits)) {
    return res.status(400).json({
      success: false,
      error: "Invalid phone. Use 10-digit Indian number like 9876543210 or +919876543210"
    });
  }

  // Duplicate check
  if (emergencyContacts.find(c => c.phone === cleaned)) {
    return res.status(409).json({ success: false, error: "This number is already registered" });
  }

  if (emergencyContacts.length >= 5) {
    return res.status(400).json({ success: false, error: "Maximum 5 contacts allowed" });
  }

  const contact = {
    id:      Date.now(),
    name:    name.trim(),
    phone:   cleaned,
    addedAt: new Date().toISOString(),
  };

  emergencyContacts.push(contact);
  log(`👨‍👩‍👧 Contact added: ${contact.name} → ${contact.phone}`);

  res.json({
    success:       true,
    contact,
    totalContacts: emergencyContacts.length,
    message:       `${name} added. They will receive SMS during emergencies.`
  });
});

// GET /contacts
app.get("/contacts", (req, res) => {
  res.json({ count: emergencyContacts.length, contacts: emergencyContacts });
});

// DELETE /remove-contact/:id
app.delete("/remove-contact/:id", (req, res) => {
  const id  = parseInt(req.params.id);
  const idx = emergencyContacts.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Contact not found" });
  const removed = emergencyContacts.splice(idx, 1)[0];
  log(`🗑️  Removed contact: ${removed.name} (${removed.phone})`);
  res.json({ success: true, removed, contacts: emergencyContacts });
});

// POST /test-sms — test SMS to a specific number (useful during setup)
app.post("/test-sms", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "phone required" });

  log(`🧪 Test SMS requested to: ${phone}`);
  const result = await sendSMS(phone, "✅ Golden Hour AI test message. SMS is working!");
  res.json(result);
});

// ══════════════════════════════════════════════
//  API — CORE ALERT
// ══════════════════════════════════════════════

// POST /alert
app.post("/alert", async (req, res) => {
  const { lat, lng, severity = "HIGH", timestamp } = req.body;

  currentStatus = "Ambulance dispatched 🚑";
  dispatchedCount++;

  const incident = {
    id:        dispatchedCount,
    lat:       lat  || 23.2599,
    lng:       lng  || 77.4126,
    severity:  (severity || "HIGH").toUpperCase(),
    timestamp: timestamp || new Date().toISOString(),
    status:    "dispatched",
    hospital:  "AIIMS Bhopal",
    eta:       Math.floor(Math.random() * 5 + 3) + " minutes",
  };

  incidentLog.unshift(incident);
  log(`🚨 CRASH DETECTED! Severity: ${incident.severity} | ETA: ${incident.eta}`);
  log(`🏥 Hospital ${incident.hospital} pre-alerted`);

  // Send SMS for MEDIUM and HIGH crashes
  let smsResults = [];
  if (["MEDIUM", "HIGH"].includes(incident.severity)) {
    smsResults = await notifyAllContacts(incident);
  } else {
    log("ℹ️  LOW severity — no SMS sent");
  }

  res.json({
    success:          true,
    message:          "Alert dispatched",
    incident,
    contactsNotified: smsResults.filter(r => r.success).length,
    smsResults,
  });
});

// GET /status
app.get("/status", (req, res) => {
  res.json({
    status:         currentStatus,
    dispatchedCount,
    contactsCount:  emergencyContacts.length,
    smsMode:        MOCK_SMS ? "mock" : "live-twilio",
    uptime:         process.uptime().toFixed(0) + "s",
    timestamp:      new Date().toISOString(),
  });
});

// GET /incidents
app.get("/incidents", (req, res) => {
  res.json({ count: incidentLog.length, incidents: incidentLog });
});

// POST /cancel
app.post("/cancel", (req, res) => {
  const { id } = req.body;
  currentStatus = "Alert cancelled — user safe ✅";
  log("✅ Alert cancelled");
  if (id) {
    const inc = incidentLog.find(i => i.id === id);
    if (inc) inc.status = "cancelled";
  }
  res.json({ success: true, message: "Alert cancelled" });
});

// GET /health
app.get("/health", (req, res) => {
  res.json({
    status:  "ok",
    server:  "Golden Hour AI v3",
    port:    PORT,
    smsMode: MOCK_SMS ? "MOCK (no real SMS)" : "LIVE TWILIO",
    contacts: emergencyContacts.length,
  });
});

// ── START ──
app.listen(PORT, () => {
  log(`⚡ Golden Hour AI Server v3 → http://localhost:${PORT}`);
  log(`📱 SMS Mode: ${MOCK_SMS ? "🟡 MOCK (console only)" : "🟢 LIVE TWILIO (real SMS)"}`);
  log(`👥 Contacts: POST /add-contact | GET /contacts | DELETE /remove-contact/:id`);
  log(`🧪 Test SMS: POST /test-sms  { "phone": "+91XXXXXXXXXX" }`);
  log(`🚨 Alert:   POST /alert | GET /status | GET /incidents | POST /cancel`);
  if (!MOCK_SMS && (!TWILIO_ACCOUNT_SID.startsWith("AC") || TWILIO_ACCOUNT_SID.includes("xxx"))) {
    log(`⚠️  WARNING: TWILIO credentials not set! Fill TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER`);
  }
});
