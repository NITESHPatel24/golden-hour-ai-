/* ═══════════════════════════════════════════════════════════
   GOLDEN HOUR AI — script.js  (UPGRADED v2)
   Features:
     • Family Emergency Contact Manager
     • Voice Assistant (Web Speech API)
     • Smart AI Severity Engine (accel + speed + impact)
     • Real-time integrated crash response flow
   ═══════════════════════════════════════════════════════════ */

// ══════════════════════════════
//  GLOBAL STATE
// ══════════════════════════════
const APP = {
  // Map / Demo
  sensorInterval: null,
  cdInterval:     null,
  mapInit:        false,
  demoMap:        null,
  userMarker:     null,
  ambMarker:      null,
  ambLat:         null,
  ambLng:         null,
  userLat:        23.2599,
  userLng:        77.4126,
  cdValue:        15,
  crashActive:    false,
  alertCount:     0,

  // Voice assistant
  voiceActive:    false,
  recognition:    null,
  synth:          window.speechSynthesis,
  voiceTimeout:   null,

  // Smart sensor thresholds
  thresholds: {
    LOW:    { accel: 3,  impact: 2  },
    MEDIUM: { accel: 6,  impact: 5  },
    HIGH:   { accel: 10, impact: 8  },
  },

  // Contact store (mirrors backend)
  contacts: [],
};

// ══════════════════════════════
//  DOM READY
// ══════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initAOS();
  initSensorSimulation();
  initCounterAnimation();
  initDemoMap();
  startPhoneMockupAnimation();
  initVoiceAssistant();
  loadContacts();
});

// ════════════════════════════════
//  NAV
// ════════════════════════════════
function initNavScroll() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open');
}

function scrollToDemo() {
  document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

// ════════════════════════════════
//  AOS
// ════════════════════════════════
function initAOS() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('aos-in'); }),
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('[data-aos]').forEach(el => observer.observe(el));
}

// ════════════════════════════════
//  COUNTER ANIMATION
// ════════════════════════════════
function initCounterAnimation() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = 'true';
        animateCounter(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(c => observer.observe(c));
}

function animateCounter(el) {
  const target   = parseInt(el.dataset.count);
  const duration = 2000;
  const step     = target / (duration / 16);
  let current    = 0;
  const timer    = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = target > 999
      ? Math.floor(current).toLocaleString('en-IN')
      : Math.floor(current);
    if (current >= target) {
      clearInterval(timer);
      el.textContent = target > 999 ? target.toLocaleString('en-IN') : target;
    }
  }, 16);
}

// ════════════════════════════════
//  PHONE MOCKUP ANIMATION
// ════════════════════════════════
function startPhoneMockupAnimation() {
  setInterval(() => {
    const acc = (Math.random() * 0.5 + 0.1).toFixed(1);
    const spd = Math.floor(Math.random() * 25 + 30);
    const el1 = document.getElementById('ps1');
    const el2 = document.getElementById('ps2');
    if (el1) el1.textContent = acc + 'g';
    if (el2) el2.textContent = spd + 'km/h';
  }, 1800);
}

// ════════════════════════════════
//  SENSOR SIMULATION
// ════════════════════════════════
function initSensorSimulation() {
  APP.sensorInterval = setInterval(() => {
    if (APP.crashActive) return;
    const acc = (Math.random() * 0.5 + 0.1).toFixed(2);
    const gyr = (Math.random() * 2.5 + 0.4).toFixed(1);
    const spd = Math.floor(Math.random() * 25 + 28);
    const imp = (Math.random() * 0.3 + 0.05).toFixed(2);
    setSensor('spb1', 'spv1', parseFloat(acc) / 2.5 * 100, acc + 'g', '#FF2020');
    setSensor('spb2', 'spv2', parseFloat(gyr) / 9 * 100, gyr + '°/s', '#00E87A');
    setSensor('spb3', 'spv3', spd / 120 * 100, spd + ' km/h', '#FF9500');
    setSensor('spb4', 'spv4', parseFloat(imp) / 3 * 100, imp + 'g', '#FF2020');
  }, 1500);
}

function setSensor(barId, valId, pct, val, color) {
  const bar   = document.getElementById(barId);
  const valEl = document.getElementById(valId);
  if (bar)   { bar.style.width = Math.min(pct, 100) + '%'; bar.style.background = color; }
  if (valEl)   valEl.textContent = val;
}

// ════════════════════════════════
//  MAP
// ════════════════════════════════
function initDemoMap() {
  const mapEl = document.getElementById('demoMap');
  if (!mapEl || APP.mapInit) return;
  APP.mapInit = true;

  APP.demoMap = L.map('demoMap', { zoomControl: true, attributionControl: false })
    .setView([APP.userLat, APP.userLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
    .addTo(APP.demoMap);

  const uIcon = L.divIcon({ html: '<div style="font-size:26px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))">📍</div>', iconSize: [28,28], iconAnchor: [14,28], className: '' });
  APP.userMarker = L.marker([APP.userLat, APP.userLng], { icon: uIcon }).addTo(APP.demoMap).bindPopup('<b>Your Location</b><br/>Crash Site');

  APP.ambLat = APP.userLat + 0.04;
  APP.ambLng = APP.userLng + 0.03;
  const aIcon = L.divIcon({ html: '<div style="font-size:26px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))">🚑</div>', iconSize: [28,28], iconAnchor: [14,14], className: '' });
  APP.ambMarker = L.marker([APP.ambLat, APP.ambLng], { icon: aIcon }).addTo(APP.demoMap).bindPopup('<b>Ambulance</b><br/>Dispatching...');

  const hIcon = L.divIcon({ html: '<div style="font-size:22px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))">🏥</div>', iconSize: [26,26], iconAnchor: [13,26], className: '' });
  [
    { name: 'AIIMS Bhopal', lat: 23.275, lng: 77.415 },
    { name: 'Hamidia Hospital', lat: 23.252, lng: 77.418 },
  ].forEach(h => L.marker([h.lat, h.lng], { icon: hIcon }).addTo(APP.demoMap).bindPopup(`<b>${h.name}</b>`));

  navigator.geolocation?.getCurrentPosition(pos => {
    APP.userLat = pos.coords.latitude;
    APP.userLng = pos.coords.longitude;
    APP.ambLat  = APP.userLat + 0.04;
    APP.ambLng  = APP.userLng + 0.03;
    APP.userMarker.setLatLng([APP.userLat, APP.userLng]);
    APP.ambMarker.setLatLng([APP.ambLat,  APP.ambLng]);
    APP.demoMap.setView([APP.userLat, APP.userLng], 13);
  }, () => {});
}

// ════════════════════════════════════════════════════════
//  SMART AI SEVERITY ENGINE
//  Input: accelerometer (g), speed (km/h), impact (g)
//  Output: "LOW" | "MEDIUM" | "HIGH"
// ════════════════════════════════════════════════════════
function analyzeSeverity(accel, speed, impact) {
  // Weighted score: accel counts most, impact second, speed adds context
  const score = (accel * 0.5) + (impact * 0.35) + (speed * 0.0015 * 10);

  if (score >= 7)  return "HIGH";
  if (score >= 3)  return "MEDIUM";
  return "LOW";
}

// ════════════════════════════════════════════════════════
//  INTEGRATED CRASH RESPONSE FLOW
//
//  HIGH   → instant alert + SMS + ambulance
//  MEDIUM → voice assistant + countdown (user can respond)
//  LOW    → notify user only (no ambulance)
// ════════════════════════════════════════════════════════
function handleCrashBySeverity(accel, speed, impact) {
  const severity = analyzeSeverity(accel, speed, impact);

  if (severity === "HIGH") {
    demoCrash("HIGH", accel, speed, impact);
  } else if (severity === "MEDIUM") {
    demoCrash("MEDIUM", accel, speed, impact);
  } else {
    // LOW — just inform, no ambulance
    const aiMsg = document.getElementById('demoAiMsg');
    if (aiMsg) aiMsg.innerHTML = `<strong style="color:#FF9500">Minor impact detected (${accel}g).</strong> Monitoring... No immediate emergency detected. Tap Simulate Crash to trigger a demo.`;
    addAlertLog('🟡', 'amber', `Minor impact ${accel}g — severity LOW, monitoring`);
    speak("Minor impact detected. Are you okay? If you need help, press the crash button.");
  }
}

// ════════════════════════════════════════════════════════
//  DEMO CRASH TRIGGER
// ════════════════════════════════════════════════════════
function demoCrash(forceSeverity, accel, speed, impact) {
  if (APP.crashActive) return;
  APP.crashActive = true;
  APP.alertCount++;

  // Use simulated values if not passed (demo button)
  const crashAccel  = accel  || 8.4;
  const crashSpeed  = speed  || 61;
  const crashImpact = impact || 7.9;
  const severity    = forceSeverity || analyzeSeverity(crashAccel, crashSpeed, crashImpact);

  flashPage();

  // Update status bar
  const dot = document.getElementById('dsbDot');
  const txt = document.getElementById('dsbTxt');
  if (dot) dot.classList.add('danger');
  if (txt) txt.textContent = `⚠ CRASH DETECTED — Severity: ${severity}`;

  // Spike sensors
  setSensor('spb1', 'spv1', 95, crashAccel + 'g', '#FF2020');
  setSensor('spb2', 'spv2', 88, '42°/s', '#FF2020');
  setSensor('spb3', 'spv3', 55, crashSpeed + ' km/h', '#FF9500');
  setSensor('spb4', 'spv4', 92, crashImpact + 'g', '#FF2020');

  const aiMsg = document.getElementById('demoAiMsg');

  if (severity === "HIGH") {
    if (aiMsg) aiMsg.innerHTML = `<strong style="color:#FF5252">⚡ HIGH SEVERITY — Impact ${crashAccel}g!</strong> Crash confirmed. Dispatching ambulance immediately. Notifying family contacts via SMS.`;
    addAlertLog('🔴', 'red', `HIGH severity crash — impact ${crashAccel}g — ambulance auto-dispatched`);
    // Instant actions
    openSOS(severity);
    sendAlert(severity);
    animateDispatch();
    startAmbulanceMove();
    activateVoiceAssistant(severity);
  } else if (severity === "MEDIUM") {
    if (aiMsg) aiMsg.innerHTML = `<strong style="color:#FF9500">⚠ MEDIUM SEVERITY — Impact ${crashAccel}g.</strong> Voice assistant activated. Awaiting your response...`;
    addAlertLog('🟡', 'amber', `MEDIUM severity crash — ${crashAccel}g — voice assistant activated`);
    openSOS(severity);
    activateVoiceAssistant(severity);
  }
}

// ════════════════════════════════════════════════════════
//  VOICE ASSISTANT — Web Speech API
// ════════════════════════════════════════════════════════

// Speak a message aloud
function speak(text, onEnd) {
  if (!APP.synth) return;
  APP.synth.cancel();
  const utt       = new SpeechSynthesisUtterance(text);
  utt.lang        = 'en-IN';
  utt.rate        = 0.92;
  utt.pitch       = 1.0;
  utt.volume      = 1.0;
  if (onEnd) utt.onend = onEnd;
  APP.synth.speak(utt);
}

// Start listening for voice commands
function startVoiceListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    updateVoiceStatus('Voice recognition not supported in this browser. Use Chrome.', false);
    return;
  }

  if (APP.recognition) { try { APP.recognition.stop(); } catch(e) {} }

  APP.recognition = new SpeechRecognition();
  APP.recognition.lang        = 'en-IN';
  APP.recognition.continuous  = false;
  APP.recognition.interimResults = false;
  APP.voiceActive = true;

  updateVoiceStatus('🎤 Listening... Say "HELP" or "I am safe"', true);

  APP.recognition.onresult = e => {
    const transcript = e.results[0][0].transcript.toLowerCase().trim();
    updateVoiceStatus(`Heard: "${transcript}"`, false);
    handleVoiceCommand(transcript);
  };

  APP.recognition.onerror = e => {
    if (e.error === 'no-speech') {
      updateVoiceStatus('No speech detected. Press button or wait.', false);
    } else {
      updateVoiceStatus(`Error: ${e.error}`, false);
    }
  };

  APP.recognition.onend = () => {
    APP.voiceActive = false;
    // Re-listen if crash still active and modal open
    const sosModal = document.getElementById('sosModal');
    if (APP.crashActive && sosModal && sosModal.classList.contains('active')) {
      setTimeout(() => startVoiceListening(), 1500);
    }
  };

  APP.recognition.start();
}

// Process recognized voice command
function handleVoiceCommand(transcript) {
  const helpKeywords = ['help', 'save me', 'help me', 'emergency', 'call ambulance', 'bachao'];
  const safeKeywords = ['i am safe', 'main thik hu', 'safe', 'cancel', 'stop', 'no help', 'im fine', 'i\'m fine', 'thik hu'];

  const isHelp = helpKeywords.some(k => transcript.includes(k));
  const isSafe = safeKeywords.some(k => transcript.includes(k));

  if (isHelp) {
    speak("Emergency confirmed. Calling ambulance now. Stay calm, help is on the way.");
    updateVoiceStatus('🚨 HELP detected — ambulance dispatched!', false);
    addAlertLog('🔴', 'red', `Voice command: "${transcript}" → Ambulance dispatched`);
    // Skip countdown, call immediately
    clearInterval(APP.cdInterval);
    closeSOS();
    sendAlert('HIGH');
    animateDispatch();
    startAmbulanceMove();
    showCallingComplete();
  } else if (isSafe) {
    speak("Understood. Cancelling alert. Stay safe.");
    updateVoiceStatus('✅ Safe confirmed — alert cancelled.', false);
    addAlertLog('🟢', 'green', `Voice command: "${transcript}" → Alert cancelled`);
    cancelDemo();
  } else {
    speak("I didn't catch that. Please say HELP if you need an ambulance, or I am safe to cancel.");
    updateVoiceStatus(`"${transcript}" — say HELP or I am safe`, false);
  }
}

// Update voice status text in modal
function updateVoiceStatus(msg, listening) {
  const el = document.getElementById('voiceStatusText');
  if (!el) return;
  el.textContent = msg;
  el.style.color = listening ? '#00E87A' : 'rgba(255,255,255,0.6)';
}

// Activate voice assistant (opens UI + starts listening after speech)
function activateVoiceAssistant(severity) {
  const voiceEl = document.getElementById('voicePanel');
  if (voiceEl) voiceEl.style.display = 'flex';

  const prompt = severity === 'HIGH'
    ? "Severe crash detected. Ambulance is being dispatched. Are you conscious? Say HELP if you need assistance, or I am safe to cancel."
    : "Crash detected. Do you need help? Say HELP if you need an ambulance, or I am safe to cancel the alert.";

  speak(prompt, () => {
    startVoiceListening();
  });
}

// Init voice (pre-load voices)
function initVoiceAssistant() {
  if (APP.synth && APP.synth.getVoices) {
    APP.synth.getVoices(); // pre-load
    window.speechSynthesis.onvoiceschanged = () => APP.synth.getVoices();
  }
}

// ════════════════════════════════════════════════════════
//  SOS MODAL (extended with voice panel)
// ════════════════════════════════════════════════════════
function openSOS(severity) {
  const modal    = document.getElementById('sosModal');
  const backdrop = document.getElementById('sosBackdrop');
  modal.classList.add('active');
  backdrop.classList.add('active');

  // Update severity badge
  const tag = modal.querySelector('.sos-m-tag');
  if (tag) {
    if (severity === 'HIGH')   tag.textContent = '⚡ HIGH SEVERITY CRASH';
    if (severity === 'MEDIUM') tag.textContent = '⚠ MEDIUM SEVERITY CRASH';
  }

  // Countdown (shorter for HIGH)
  APP.cdValue  = severity === 'HIGH' ? 10 : parseInt(document.getElementById('timersl')?.value || 15);
  const total  = APP.cdValue;
  const circle = document.getElementById('sosCdCircle');
  const numEl  = document.getElementById('sosCdNum');
  const circ   = 314;

  numEl.textContent = APP.cdValue;
  circle.style.strokeDashoffset = 0;

  clearInterval(APP.cdInterval);
  APP.cdInterval = setInterval(() => {
    APP.cdValue--;
    numEl.textContent = APP.cdValue;
    circle.style.strokeDashoffset = circ * (1 - APP.cdValue / total);
    if (APP.cdValue <= 5) flashPage();
    if (APP.cdValue <= 0) {
      clearInterval(APP.cdInterval);
      closeSOS();
      sendAlert(severity);
      animateDispatch();
      startAmbulanceMove();
      showCallingComplete();
    }
  }, 1000);
}

function cancelDemo() {
  clearInterval(APP.cdInterval);
  if (APP.recognition) { try { APP.recognition.stop(); } catch(e) {} }
  if (APP.synth) APP.synth.cancel();
  closeSOS();
  resetDemo();
  addAlertLog('🟢', 'green', 'Alert cancelled — user confirmed safe');
  const aiMsg = document.getElementById('demoAiMsg');
  if (aiMsg) aiMsg.innerHTML = '<strong style="color:#00E87A">Alert cancelled.</strong> User confirmed safe. Resuming normal monitoring.';
  const dot = document.getElementById('dsbDot');
  const txt = document.getElementById('dsbTxt');
  if (dot) dot.classList.remove('danger');
  if (txt) txt.textContent = 'System Active — Monitoring';

  // Hide voice panel
  const vp = document.getElementById('voicePanel');
  if (vp) vp.style.display = 'none';
}

function closeSOS() {
  document.getElementById('sosModal').classList.remove('active');
  document.getElementById('sosBackdrop').classList.remove('active');
}

// ════════════════════════════════════════════════════════
//  FAMILY CONTACTS UI
// ════════════════════════════════════════════════════════

// Load contacts from backend on page init
async function loadContacts() {
  try {
    const res  = await fetch('http://localhost:3000/contacts');
    if (!res.ok) throw new Error('Server error ' + res.status);
    const data = await res.json();
    APP.contacts = data.contacts || [];
    renderContactsList();
    console.log(`✅ ${APP.contacts.length} contacts loaded from server`);
  } catch (err) {
    console.warn('⚠ Server offline:', err.message);
    APP.contacts = [];
    renderContactsList();
    showContactFeedback('⚠ Cannot reach server. Run: node server.js', 'error');
  }
}

// Add contact — called by form submit
async function addContact() {
  const nameEl  = document.getElementById('contactName');
  const phoneEl = document.getElementById('contactPhone');
  if (!nameEl || !phoneEl) return;

  const name  = nameEl.value.trim();
  const phone = phoneEl.value.trim();

  if (!name || !phone) {
    showContactFeedback('Please enter both name and phone number.', 'error');
    return;
  }

  const btn = document.getElementById('addContactBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }

  try {
    const res  = await fetch('http://localhost:3000/add-contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, phone }),
    });
    const data = await res.json();

    if (data.success) {
      APP.contacts.push(data.contact);
      renderContactsList();
      nameEl.value  = '';
      phoneEl.value = '';
      showContactFeedback(`✅ ${name} added as emergency contact.`, 'success');
    } else {
      showContactFeedback('❌ ' + (data.error || 'Failed to add contact.'), 'error');
    }
  } catch (err) {
    showContactFeedback('❌ Server not running. Start: node server.js', 'error');
    console.error('addContact error:', err);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '+ Add Contact'; }
  }
}

// Remove contact
async function removeContact(id) {
  try {
    await fetch(`http://localhost:3000/remove-contact/${id}`, { method: 'DELETE' });
  } catch {
    // offline — remove locally
  }
  APP.contacts = APP.contacts.filter(c => c.id !== id);
  localStorage.setItem('gh_contacts', JSON.stringify(APP.contacts));
  renderContactsList();
}

// Render contacts list in the UI panel
function renderContactsList() {
  const list = document.getElementById('contactsList');
  const countEl = document.getElementById('contactsCount');
  if (!list) return;

  if (countEl) countEl.textContent = APP.contacts.length;

  if (!APP.contacts.length) {
    list.innerHTML = '<div class="contact-empty">No emergency contacts added yet.</div>';
    return;
  }

  list.innerHTML = APP.contacts.map(c => `
    <div class="contact-item">
      <div class="contact-avatar">${c.name.charAt(0).toUpperCase()}</div>
      <div class="contact-info">
        <div class="contact-name">${c.name}</div>
        <div class="contact-phone">${c.phone}</div>
      </div>
      <button class="contact-remove" onclick="removeContact(${c.id})" title="Remove">✕</button>
    </div>
  `).join('');
}

// Show feedback message in contacts form
function showContactFeedback(msg, type) {
  const el = document.getElementById('contactFeedback');
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'success' ? '#00E87A' : '#FF5252';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3500);
}

// ════════════════════════════════
//  DISPATCH STEPS
// ════════════════════════════════
function animateDispatch() {
  const steps = [
    { id: 'dst1', delay: 500,  label: '✓ Done' },
    { id: 'dst2', delay: 2000, label: '✓ Done' },
    { id: 'dst3', delay: 3500, label: '✓ Done' },
    { id: 'dst4', delay: 5000, label: '✓ Done' },
    { id: 'dst5', delay: 6500, label: '✓ Done' },
  ];
  steps.forEach(s => {
    setTimeout(() => {
      const el = document.getElementById(s.id);
      if (!el) return;
      el.classList.add('active');
      el.querySelector('.dst-badge').textContent = 'In progress...';
      addAlertLog('🟡', 'amber', el.querySelector('.dst-txt').textContent.trim());
    }, s.delay);
    setTimeout(() => {
      const el = document.getElementById(s.id);
      if (!el) return;
      el.classList.remove('active');
      el.classList.add('done');
      el.querySelector('.dst-badge').textContent = s.label;
    }, s.delay + 1200);
  });
}

// ════════════════════════════════
//  AMBULANCE MOVEMENT
// ════════════════════════════════
function startAmbulanceMove() {
  if (!APP.ambMarker) return;
  const targetLat = APP.userLat + 0.005;
  const targetLng = APP.userLng + 0.004;
  const steps = 60;
  const dLat  = (targetLat - APP.ambLat) / steps;
  const dLng  = (targetLng - APP.ambLng) / steps;
  let step    = 0;
  const timer = setInterval(() => {
    if (step >= steps) { clearInterval(timer); return; }
    APP.ambLat += dLat;
    APP.ambLng += dLng;
    APP.ambMarker.setLatLng([APP.ambLat, APP.ambLng]);
    step++;
  }, 200);
}

// ════════════════════════════════
//  CALLING COMPLETE
// ════════════════════════════════
function showCallingComplete() {
  const aiMsg = document.getElementById('demoAiMsg');
  if (aiMsg) aiMsg.innerHTML = '<strong style="color:#FF5252">Emergency services contacted.</strong> Ambulance dispatched. Hospital pre-alerted. All family contacts notified via SMS. ETA: 4 minutes.';
  addAlertLog('🔴', 'red', `Ambulance dispatched — ETA 4 min — ${APP.contacts.length} contacts notified`);
}

// ════════════════════════════════
//  RESET DEMO
// ════════════════════════════════
function resetDemo() {
  APP.crashActive = false;
  setSensor('spb1', 'spv1', 8,  '0.2g', '#FF2020');
  setSensor('spb2', 'spv2', 6,  '1.1°/s', '#00E87A');
  setSensor('spb3', 'spv3', 35, '42 km/h', '#FF9500');
  setSensor('spb4', 'spv4', 5,  '0.1g', '#FF2020');
  ['dst1','dst2','dst3','dst4','dst5'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active', 'done');
    el.querySelector('.dst-badge').textContent = 'Standby';
  });
  if (APP.ambMarker) {
    APP.ambLat = APP.userLat + 0.04;
    APP.ambLng = APP.userLng + 0.03;
    APP.ambMarker.setLatLng([APP.ambLat, APP.ambLng]);
  }
}

// ════════════════════════════════
//  ALERT LOG
// ════════════════════════════════
function addAlertLog(emoji, colorClass, msg) {
  const container = document.getElementById('alItems');
  const empty     = document.getElementById('alEmpty');
  if (empty)   empty.style.display = 'none';
  if (!container) return;
  const time = new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const item = document.createElement('div');
  item.className = 'al-item';
  item.innerHTML = `
    <div class="al-dot ${colorClass}"></div>
    <span style="flex:1">${msg}</span>
    <span style="font-size:10px;color:var(--t3);font-family:var(--mono)">${time}</span>
  `;
  container.prepend(item);
}

// ════════════════════════════════
//  PAGE FLASH
// ════════════════════════════════
function flashPage() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:rgba(255,32,32,0.12);pointer-events:none;z-index:9000;animation:flashAnim .35s ease-out forwards';
  const style = document.createElement('style');
  style.textContent = '@keyframes flashAnim{0%{opacity:.7}100%{opacity:0}}';
  document.head.appendChild(style);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 400);
}

// ════════════════════════════════
//  BACKEND API CALLS
// ════════════════════════════════
async function sendAlert(severity = 'HIGH') {
  try {
    const res  = await fetch('http://localhost:3000/alert', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        lat:       APP.userLat,
        lng:       APP.userLng,
        severity,
        timestamp: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    console.log(`✅ Alert sent [${severity}]:`, data);

    // Show SMS result in alert log
    if (data.contactsNotified > 0) {
      addAlertLog('📲', 'amber', `📱 SMS sent to ${data.contactsNotified} family contact(s)`);
    } else if (APP.contacts.length === 0) {
      addAlertLog('⚠', 'amber', 'No family contacts — add contacts to send SMS');
    } else {
      // Show individual SMS failures from smsResults
      if (data.smsResults) {
        data.smsResults.forEach(r => {
          if (!r.success) {
            addAlertLog('❌', 'red', `SMS failed to ${r.to}: ${r.error || 'unknown error'}`);
            console.error('SMS failure detail:', r);
          }
        });
      }
    }
    return data;
  } catch (err) {
    console.error('sendAlert failed:', err);
    addAlertLog('⚠', 'amber', 'Server offline — SMS skipped. Run: node server.js');
    return { message: 'Server offline' };
  }
}

async function getServerStatus() {
  try {
    const res  = await fetch('http://localhost:3000/status');
    const data = await res.json();
    return data.status;
  } catch {
    return 'Server offline — demo mode';
  }
}

// ════════════════════════════════
//  DEVICE MOTION (real phone)
// ════════════════════════════════
let lastMotionCrash = 0;

function setupDeviceMotion() {
  window.addEventListener('devicemotion', e => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const accel = Math.sqrt((a.x||0)**2 + (a.y||0)**2 + (a.z||0)**2);
    const speed = 0;  // real speed needs GPS integration
    const now   = Date.now();

    if (accel > 8 && now - lastMotionCrash > 6000) {
      lastMotionCrash = now;
      if (!APP.crashActive) {
        handleCrashBySeverity(accel.toFixed(1), speed, (accel * 0.9).toFixed(1));
        scrollToDemo();
      }
    }
  });
}

if (window.DeviceMotionEvent) {
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    const crashBtn = document.getElementById('crashBtn');
    if (crashBtn) {
      crashBtn.addEventListener('click', function iosHandler() {
        DeviceMotionEvent.requestPermission().then(r => {
          if (r === 'granted') setupDeviceMotion();
        });
        crashBtn.removeEventListener('click', iosHandler);
      }, { once: true });
    }
  } else {
    setupDeviceMotion();
  }
}
