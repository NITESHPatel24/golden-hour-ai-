// ═══════════════════════════════════════
//  GOLDEN HOUR AI — server.js
//  Backend API Server (Node.js + Express)
//  Run: node server.js
// ═══════════════════════════════════════

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.static(".")); // serve index.html from same folder

// ── IN-MEMORY STATE ──
let incidentLog = [];
let currentStatus = "Idle";
let dispatchedCount = 0;

// ── LOGGER ──
function log(msg) {
  const time = new Date().toLocaleTimeString("en-IN");
  console.log(`[${time}] ${msg}`);
}

// ── ROUTES ──

// POST /alert — trigger emergency alert
app.post("/alert", (req, res) => {
  const { lat, lng, severity, timestamp } = req.body;

  currentStatus = "Ambulance dispatched 🚑";
  dispatchedCount++;

  const incident = {
    id: dispatchedCount,
    lat: lat || 23.2599,
    lng: lng || 77.4126,
    severity: severity || "HIGH",
    timestamp: timestamp || new Date().toISOString(),
    status: "dispatched",
    hospital: "AIIMS Bhopal",
    eta: Math.floor(Math.random() * 5 + 3) + " minutes",
  };

  incidentLog.unshift(incident);
  log(`🚨 CRASH DETECTED! Severity: ${incident.severity} | Location: ${incident.lat}, ${incident.lng} | ETA: ${incident.eta}`);

  // Simulate sending SMS (in real app: use Twilio here)
  log(`📱 SMS sent to ambulance: Crash at ${incident.lat}, ${incident.lng}`);
  log(`🏥 Hospital ${incident.hospital} pre-alerted`);

  res.json({
    success: true,
    message: "Alert sent successfully",
    incident,
  });
});

// GET /status — get current system status
app.get("/status", (req, res) => {
  res.json({
    status: currentStatus,
    dispatchedCount,
    uptime: process.uptime().toFixed(0) + "s",
    timestamp: new Date().toISOString(),
  });
});

// GET /incidents — get all incidents
app.get("/incidents", (req, res) => {
  res.json({
    count: incidentLog.length,
    incidents: incidentLog,
  });
});

// POST /cancel — cancel an alert
app.post("/cancel", (req, res) => {
  const { id } = req.body;
  currentStatus = "Alert cancelled — user safe ✅";
  log(`✅ Alert cancelled — user confirmed safe`);
  if (id) {
    const incident = incidentLog.find(i => i.id === id);
    if (incident) incident.status = "cancelled";
  }
  res.json({ success: true, message: "Alert cancelled" });
});

// GET /health — health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", server: "Golden Hour AI", port: PORT });
});

// ── START ──
app.listen(PORT, () => {
  log(`⚡ Golden Hour AI Server running on http://localhost:${PORT}`);
  log(`📋 Routes: POST /alert | GET /status | GET /incidents | POST /cancel`);
  log(`🌐 Open index.html or visit http://localhost:${PORT}`);
});
