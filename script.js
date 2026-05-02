/* ═══════════════════════════════════════
   GOLDEN HOUR AI — script.js
   All frontend logic
   ═══════════════════════════════════════ */

// ── STATE ──
const APP = {
  sensorInterval: null,
  cdInterval: null,
  mapInit: false,
  demoMap: null,
  userMarker: null,
  ambMarker: null,
  ambLat: null,
  ambLng: null,
  userLat: 23.2599,
  userLng: 77.4126,
  cdValue: 15,
  crashActive: false,
  alertCount: 0,
};

// ── DOM READY ──
document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initAOS();
  initSensorSimulation();
  initCounterAnimation();
  initDemoMap();
  startPhoneMockupAnimation();
});

// ════════════════════════════════
//  NAV SCROLL EFFECT
// ════════════════════════════════
function initNavScroll() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

function toggleMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('hamburger');
  menu.classList.toggle('open');
  btn.classList.toggle('open');
}

function scrollToDemo() {
  document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
}

// ════════════════════════════════
//  AOS — ANIMATE ON SCROLL
// ════════════════════════════════
function initAOS() {
  const els = document.querySelectorAll('[data-aos]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('aos-in');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => observer.observe(el));
}

// ════════════════════════════════
//  COUNTER ANIMATION
// ════════════════════════════════
function initCounterAnimation() {
  const counters = document.querySelectorAll('[data-count]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = 'true';
        animateCounter(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.count);
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = target > 999
      ? Math.floor(current).toLocaleString('en-IN')
      : Math.floor(current);
    if (current >= target) {
      clearInterval(timer);
      el.textContent = target > 999
        ? target.toLocaleString('en-IN')
        : target;
    }
  }, 16);
}

// ════════════════════════════════
//  PHONE MOCKUP LIVE ANIMATION
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
//  DEMO SENSOR SIMULATION
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
  const bar = document.getElementById(barId);
  const valEl = document.getElementById(valId);
  if (bar) { bar.style.width = Math.min(pct, 100) + '%'; bar.style.background = color; }
  if (valEl) valEl.textContent = val;
}

// ════════════════════════════════
//  DEMO MAP (Leaflet)
// ════════════════════════════════
function initDemoMap() {
  const mapEl = document.getElementById('demoMap');
  if (!mapEl || APP.mapInit) return;
  APP.mapInit = true;

  APP.demoMap = L.map('demoMap', { zoomControl: true, attributionControl: false })
    .setView([APP.userLat, APP.userLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
    .addTo(APP.demoMap);

  // User marker
  const uIcon = L.divIcon({
    html: '<div style="font-size:26px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))">📍</div>',
    iconSize: [28, 28], iconAnchor: [14, 28], className: ''
  });
  APP.userMarker = L.marker([APP.userLat, APP.userLng], { icon: uIcon })
    .addTo(APP.demoMap).bindPopup('<b>Your Location</b><br/>Crash Site');

  // Ambulance marker (starts far away)
  APP.ambLat = APP.userLat + 0.04;
  APP.ambLng = APP.userLng + 0.03;
  const aIcon = L.divIcon({
    html: '<div style="font-size:26px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))">🚑</div>',
    iconSize: [28, 28], iconAnchor: [14, 14], className: ''
  });
  APP.ambMarker = L.marker([APP.ambLat, APP.ambLng], { icon: aIcon })
    .addTo(APP.demoMap).bindPopup('<b>Ambulance</b><br/>Dispatching...');

  // Hospital markers
  const hIcon = L.divIcon({
    html: '<div style="font-size:22px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))">🏥</div>',
    iconSize: [26, 26], iconAnchor: [13, 26], className: ''
  });
  [
    { name: 'AIIMS Bhopal', lat: 23.275, lng: 77.415 },
    { name: 'Hamidia Hospital', lat: 23.252, lng: 77.418 },
  ].forEach(h => {
    L.marker([h.lat, h.lng], { icon: hIcon }).addTo(APP.demoMap)
      .bindPopup(`<b>${h.name}</b>`);
  });

  // Try get real location
  navigator.geolocation?.getCurrentPosition(pos => {
    APP.userLat = pos.coords.latitude;
    APP.userLng = pos.coords.longitude;
    APP.ambLat = APP.userLat + 0.04;
    APP.ambLng = APP.userLng + 0.03;
    APP.userMarker.setLatLng([APP.userLat, APP.userLng]);
    APP.ambMarker.setLatLng([APP.ambLat, APP.ambLng]);
    APP.demoMap.setView([APP.userLat, APP.userLng], 13);
  }, () => {});
}

// ════════════════════════════════
//  DEMO CRASH TRIGGER
// ════════════════════════════════
function demoCrash() {
  if (APP.crashActive) return;
  APP.crashActive = true;
  APP.alertCount++;

  // Flash
  flashPage();

  // Update status bar
  const dot = document.getElementById('dsbDot');
  const txt = document.getElementById('dsbTxt');
  dot.classList.add('danger');
  txt.textContent = '⚠ CRASH DETECTED — Emergency Mode';

  // Sensors spike
  setSensor('spb1', 'spv1', 95, '8.4g', '#FF2020');
  setSensor('spb2', 'spv2', 88, '42°/s', '#FF2020');
  setSensor('spb3', 'spv3', 55, '61 km/h', '#FF9500');
  setSensor('spb4', 'spv4', 92, '7.9g', '#FF2020');

  // AI message
  const aiMsg = document.getElementById('demoAiMsg');
  aiMsg.innerHTML = '<strong style="color:#FF5252">Severe impact 8.4g detected!</strong> Crash confirmed. Analyzing severity... Contacting emergency services. Blood type O+ reserved.';

  // Add log entry
  addAlertLog('🔴', 'red', 'Crash detected — impact 8.4g');

  // Open SOS modal
  openSOS();

  // Start ambulance movement
  startAmbulanceMove();

  // Animate dispatch steps
  animateDispatch();
}

// ════════════════════════════════
//  SOS MODAL
// ════════════════════════════════
function openSOS() {
  const modal = document.getElementById('sosModal');
  const backdrop = document.getElementById('sosBackdrop');
  modal.classList.add('active');
  backdrop.classList.add('active');

  APP.cdValue = parseInt(document.getElementById('timersl')?.value || 15);
  const totalCD = APP.cdValue;
  const circle = document.getElementById('sosCdCircle');
  const numEl = document.getElementById('sosCdNum');
  const circ = 314;

  numEl.textContent = APP.cdValue;
  circle.style.strokeDashoffset = 0;

  clearInterval(APP.cdInterval);
  APP.cdInterval = setInterval(() => {
    APP.cdValue--;
    numEl.textContent = APP.cdValue;
    const offset = circ * (1 - APP.cdValue / totalCD);
    circle.style.strokeDashoffset = offset;
    if (APP.cdValue <= 5) flashPage();
    if (APP.cdValue <= 0) {
      clearInterval(APP.cdInterval);
      closeSOS();
      showCallingComplete();
    }
  }, 1000);
}

function cancelDemo() {
  clearInterval(APP.cdInterval);
  closeSOS();
  resetDemo();
  addAlertLog('🟢', 'green', 'Alert cancelled — user confirmed safe');
  const aiMsg = document.getElementById('demoAiMsg');
  aiMsg.innerHTML = '<strong style="color:#00E87A">Alert cancelled.</strong> User confirmed safe. Resuming normal monitoring.';
  const dot = document.getElementById('dsbDot');
  const txt = document.getElementById('dsbTxt');
  dot.classList.remove('danger');
  txt.textContent = 'System Active — Monitoring';
}

function closeSOS() {
  document.getElementById('sosModal').classList.remove('active');
  document.getElementById('sosBackdrop').classList.remove('active');
}

// ════════════════════════════════
//  DISPATCH STEPS ANIMATION
// ════════════════════════════════
function animateDispatch() {
  const steps = [
    { id: 'dst1', delay: 500, label: '✓ Done' },
    { id: 'dst2', delay: 2000, label: '✓ Done' },
    { id: 'dst3', delay: 3500, label: '✓ Done' },
    { id: 'dst4', delay: 5000, label: '✓ Done' },
    { id: 'dst5', delay: 6500, label: '✓ Done' },
  ];

  steps.forEach(s => {
    // activate
    setTimeout(() => {
      const el = document.getElementById(s.id);
      if (!el) return;
      el.classList.add('active');
      el.querySelector('.dst-badge').textContent = 'In progress...';
      addAlertLog('🟡', 'amber', el.querySelector('.dst-txt').textContent.trim());
    }, s.delay);
    // complete
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
  const dLat = (targetLat - APP.ambLat) / steps;
  const dLng = (targetLng - APP.ambLng) / steps;
  let step = 0;

  const moveTimer = setInterval(() => {
    if (step >= steps) { clearInterval(moveTimer); return; }
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
  aiMsg.innerHTML = '<strong style="color:#FF5252">Emergency services contacted.</strong> Ambulance dispatched. Hospital pre-alerted. All contacts notified. ETA: 4 minutes.';
  addAlertLog('🔴', 'red', 'Ambulance dispatched — ETA 4 min');
}

// ════════════════════════════════
//  RESET DEMO
// ════════════════════════════════
function resetDemo() {
  APP.crashActive = false;

  // reset sensors
  setSensor('spb1', 'spv1', 8, '0.2g', '#FF2020');
  setSensor('spb2', 'spv2', 6, '1.1°/s', '#00E87A');
  setSensor('spb3', 'spv3', 35, '42 km/h', '#FF9500');
  setSensor('spb4', 'spv4', 5, '0.1g', '#FF2020');

  // reset dispatch
  ['dst1','dst2','dst3','dst4','dst5'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active', 'done');
    el.querySelector('.dst-badge').textContent = 'Standby';
  });

  // reset ambulance position
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
  const empty = document.getElementById('alEmpty');
  if (empty) empty.style.display = 'none';
  if (!container) return;

  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
//  BACKEND ALERT (server.js integration)
// ════════════════════════════════
async function sendAlert() {
  try {
    const res = await fetch('http://localhost:3000/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: APP.userLat,
        lng: APP.userLng,
        severity: 'HIGH',
        timestamp: new Date().toISOString(),
      })
    });
    const data = await res.json();
    console.log('Alert sent:', data);
    return data;
  } catch (err) {
    console.log('Server not running — demo mode active');
    return { message: 'Demo mode — no server' };
  }
}

async function getServerStatus() {
  try {
    const res = await fetch('http://localhost:3000/status');
    const data = await res.json();
    return data.status;
  } catch {
    return 'Server offline — demo mode';
  }
}

// ════════════════════════════════
//  DEVICE MOTION (real phone support)
// ════════════════════════════════
let lastMotionCrash = 0;

function setupDeviceMotion() {
  window.addEventListener('devicemotion', e => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const total = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    const now = Date.now();
    if (total > 20 && now - lastMotionCrash > 6000) {
      lastMotionCrash = now;
      if (!APP.crashActive) {
        demoCrash();
        scrollToDemo();
      }
    }
  });
}

if (window.DeviceMotionEvent) {
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    // iOS 13+
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
