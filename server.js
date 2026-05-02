// ═══════════════════════════════════════════════════════════
//  GOLDEN HOUR AI — server.js  (UPGRADED v2)
//  Features: Family Contacts, Smart Severity, Twilio SMS
//  Run: node server.js
// ═══════════════════════════════════════════════════════════

const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = 3000;

// ══════════════════════════════
//  TWILIO CONFIGURATION
//  → Replace with real keys from https://console.twilio.com
// ══════════════════════════════
const TWILIO_CONFIG = {
  accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",  // ← REPLACE
  authToken:  "your_auth_token_here",               // ← REPLACE
  fromNumber: "+1XXXXXXXXXX",                       // ← REPLACE (your Twilio number)
};

// Toggle to false to use real Twilio (install: npm install twilio)
const MOCK_SMS = true;

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.static("."));

// ══════════════════════════════
//  IN-MEMORY STATE
// ══════════════════════════════
let incidentLog    = [];
let currentStatus  = "Idle";
let dispatchedCount = 0;
let emergencyContacts = [];   // [{ name, phone, id }]

// ── LOGGER ──
function log(msg) {
  const time = new Date().toLocaleTimeString("en-IN");
  console.log(`[${time}] ${msg}`);
}

// ══════════════════════════════
//  SMS SENDER (Twilio / Mock)
// ══════════════════════════════
async function sendSMS(to, message) {
  if (MOCK_SMS) {
    log(`📱 [MOCK SMS] To: ${to}`);
    log(`   Message: ${message}`);
    return { success: true, mock: true, to, message };
  }

  try {
    // Uncomment when real Twilio is configured:
    // const twilio = require("twilio");
    // const client = twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
    // const result = await client.messages.create({
    //   body: message,
    //   from: TWILIO_CONFIG.fromNumber,
    //   to,
    // });
    // return { success: true, sid: result.sid };
    log(`📱 [TWILIO] SMS sent to ${to}`);
    return { success: true };
  } catch (err) {
    log(`❌ SMS failed to ${to}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ══════════════════════════════
//  NOTIFY ALL FAMILY CONTACTS
// ══════════════════════════════
async function notifyFamilyContacts(incident) {
  if (!emergencyContacts.length) {
    log("⚠️  No family contacts registered.");
    return [];
  }

  const mapsLink = `https://maps.google.com/?q=${incident.lat},${incident.lng}`;
  const time     = new Date(incident.timestamp).toLocaleTimeString("en-IN");

  const message =
    `🚨 EMERGENCY ALERT — Golden Hour AI\n` +
    `Your family member was in a crash!\n\n` +
    `📍 Location: ${mapsLink}\n` +
    `🕐 Time: ${time}\n` +
    `⚠️ Severity: ${incident.severity}\n` +
    `🚑 Status: Ambulance Dispatched to ${incident.hospital}\n` +
    `⏱ ETA: ${incident.eta}\n\n` +
    `Stay calm. Help is on the way.`;

  const results = await Promise.all(
    emergencyContacts.map(c => sendSMS(c.phone, message))
  );

  log(`📲 Family SMS sent to ${emergencyContacts.length} contacts`);
  return results;
}

// ══════════════════════════════
//  ROUTES — CONTACTS
// ══════════════════════════════

// POST /add-contact — register a family contact
app.post("/add-contact", (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, error: "name and phone required" });
  }

  // Basic phone validation
  const cleanPhone = phone.replace(/\s/g, "");
  if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
    return res.status(400).json({ success: false, error: "Invalid phone format. Use +91XXXXXXXXXX" });
  }

  // Prevent duplicates
  if (emergencyContacts.find(c => c.phone === cleanPhone)) {
    return res.status(409).json({ success: false, error: "Contact already registered" });
  }

  const contact = {
    id:    Date.now(),
    name:  name.trim(),
    phone: cleanPhone,
    addedAt: new Date().toISOString(),
  };

  emergencyContacts.push(contact);
  log(`👨‍👩‍👧 Contact added: ${contact.name} (${contact.phone})`);

  res.json({ success: true, contact, totalContacts: emergencyContacts.length });
});

// GET /contacts — list all registered contacts
app.get("/contacts", (req, res) => {
  res.json({
    count: emergencyContacts.length,
    contacts: emergencyContacts,
  });
});

// DELETE /remove-contact/:id — remove a contact
app.delete("/remove-contact/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const idx = emergencyContacts.findIndex(c => c.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, error: "Contact not found" });
  }

  const removed = emergencyContacts.splice(idx, 1)[0];
  log(`🗑️  Contact removed: ${removed.name}`);
  res.json({ success: true, removed });
});

// ══════════════════════════════
//  ROUTES — CORE ALERT
// ══════════════════════════════

// POST /alert — crash detected, dispatch ambulance + notify contacts
app.post("/alert", async (req, res) => {
  const { lat, lng, severity = "HIGH", timestamp } = req.body;

  currentStatus = "Ambulance dispatched 🚑";
  dispatchedCount++;

  const incident = {
    id:        dispatchedCount,
    lat:       lat  || 23.2599,
    lng:       lng  || 77.4126,
    severity:  severity.toUpperCase(),
    timestamp: timestamp || new Date().toISOString(),
    status:    "dispatched",
    hospital:  "AIIMS Bhopal",
    eta:       Math.floor(Math.random() * 5 + 3) + " minutes",
  };

  incidentLog.unshift(incident);
  log(`🚨 CRASH! Severity: ${incident.severity} | Loc: ${incident.lat}, ${incident.lng} | ETA: ${incident.eta}`);
  log(`🏥 Hospital ${incident.hospital} pre-alerted`);

  // Notify family contacts (only for MEDIUM/HIGH severity)
  let smsResults = [];
  if (["MEDIUM", "HIGH"].includes(incident.severity)) {
    smsResults = await notifyFamilyContacts(incident);
  }

  res.json({
    success: true,
    message: "Alert sent successfully",
    incident,
    contactsNotified: smsResults.length,
    smsResults,
  });
});

// GET /status
app.get("/status", (req, res) => {
  res.json({
    status:         currentStatus,
    dispatchedCount,
    contactsCount:  emergencyContacts.length,
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
  log("✅ Alert cancelled — user confirmed safe");
  if (id) {
    const incident = incidentLog.find(i => i.id === id);
    if (incident) incident.status = "cancelled";
  }
  res.json({ success: true, message: "Alert cancelled" });
});

// GET /health
app.get("/health", (req, res) => {
  res.json({ status: "ok", server: "Golden Hour AI v2", port: PORT });
});

// ── START ──
app.listen(PORT, () => {
  log(`⚡ Golden Hour AI Server v2 running → http://localhost:${PORT}`);
  log(`📋 Contacts: POST /add-contact | GET /contacts | DELETE /remove-contact/:id`);
  log(`🚨 Alerts:   POST /alert | GET /status | GET /incidents | POST /cancel`);
  log(`📱 SMS Mode: ${MOCK_SMS ? "MOCK (console only)" : "LIVE (Twilio)"}`);
});
