/* ══════════════════════════════════════════════════════════════
   AquaSmart — Dashboard Controller
   ══════════════════════════════════════════════════════════════ */

// ─── CONSTANTS ──────────────────────────────────────────────────
const GAUGE_CIRC = 238.76; // 2 * π * 38

// ─── STATE ──────────────────────────────────────────────────────
let selectedZoneId  = null;
let activeTab       = "dashboard";
let lastLiveData    = null;
let lastUpdateTime  = null;
let liveInterval    = null;
let analyticsInited = false;
let historyChart    = null;
let waterChart      = null;
let ratioChart      = null;
let alertCount      = 0;
let windSpeed       = Math.floor(Math.random() * 18) + 6;

// Thresholds (from localStorage)
let thresholds = { soil: 30, temp: 38, hum: 25 };

// ─── INIT ────────────────────────────────────────────────────────
window.onload = function () {
    loadThresholds();
    applyTheme();
    initHistoryChart();
    loadZones();
    setInterval(loadZones, 10000);
    setInterval(updateLastUpdated, 5000);
    setInterval(() => {
        windSpeed = Math.max(4, Math.min(30, windSpeed + (Math.random() * 6 - 3)));
        setText("swWind", Math.round(windSpeed) + " km/h");
    }, 15000);
};

// ─── TABS ────────────────────────────────────────────────────────
function setTab(tab) {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    document.getElementById("panel-" + tab).classList.add("active");
    const navEl = document.getElementById("nav-" + tab);
    if (navEl) navEl.classList.add("active");

    const titles = { dashboard: "Dashboard", analytics: "Analytics", alerts: "Alerts", settings: "Settings" };
    setText("tbTitle", titles[tab] || tab);
    activeTab = tab;

    if (tab === "analytics") {
        if (!analyticsInited) { initAnalyticsCharts(); analyticsInited = true; }
        loadAnalytics();
        setTimeout(() => { if (waterChart) waterChart.resize(); if (ratioChart) ratioChart.resize(); }, 60);
    }
    if (tab === "alerts")   loadAlerts();
    if (tab === "settings") renderSettingsZones();

    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) closeSidebar();
}

// ─── SIDEBAR ─────────────────────────────────────────────────────
function toggleSidebar() {
    const sb = document.getElementById("sidebar");
    const ov = document.getElementById("sbOverlay");
    sb.classList.toggle("open");
    ov.style.display = sb.classList.contains("open") ? "block" : "none";
}
function closeSidebar() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sbOverlay").style.display = "none";
}

// ─── DARK MODE ───────────────────────────────────────────────────
function toggleDark() {
    document.documentElement.classList.toggle("dark");
    const dark = document.documentElement.classList.contains("dark");
    localStorage.setItem("aq-theme", dark ? "dark" : "light");
    updateDarkIcon(dark);
}
function applyTheme() {
    const saved = localStorage.getItem("aq-theme");
    const dark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    updateDarkIcon(dark);
}
function updateDarkIcon(dark) {
    const btn = document.getElementById("darkToggle");
    if (!btn) return;
    btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            ${dark
                ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
                : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
            }
        </svg>
        <span>${dark ? "Light Mode" : "Dark Mode"}</span>`;
}

// ─── ZONES ───────────────────────────────────────────────────────
function loadZones() {
    fetch("/zones").then(r => r.json()).then(zones => {
        const select = document.getElementById("zoneSelect");
        const prevId = selectedZoneId;
        select.innerHTML = "";

        if (zones.length === 0) {
            show("noZones"); hide("panel-dashboard"); hide("panel-analytics");
            hide("panel-alerts"); hide("panel-settings");
            show("noZones");
            document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
            hide("deleteBtn");
            setStatus("waiting", "No zones configured");
            return;
        }

        hide("noZones");
        document.getElementById("panel-" + activeTab).classList.add("active");
        show("deleteBtn");

        zones.forEach(z => {
            const opt = document.createElement("option");
            opt.value = z.id;
            opt.text  = `${z.name}  (${z.plant}, ${z.hectares} ha)`;
            select.appendChild(opt);
        });

        const ids = zones.map(z => z.id);
        if (prevId && ids.includes(prevId)) {
            select.value = prevId;
        } else {
            selectedZoneId = zones[0].id;
            select.value   = selectedZoneId;
            startLive();
        }
    });
}

function selectZone() {
    selectedZoneId = parseInt(document.getElementById("zoneSelect").value);
    clearDashboard();
    startLive();
    if (activeTab === "analytics") loadAnalytics();
}

// ─── LIVE POLLING ─────────────────────────────────────────────────
function startLive() {
    if (liveInterval) clearInterval(liveInterval);
    loadLive(); loadHistory(); loadStats();
    liveInterval = setInterval(() => {
        loadLive(); loadHistory(); loadStats();
    }, 2000);
}

function loadLive() {
    if (!selectedZoneId) return;
    fetch("/latest/" + selectedZoneId)
        .then(r => r.json())
        .then(d => {
            if (d.error) { setStatus("waiting", "Waiting for sensor data..."); return; }
            setStatus("live", "Live · " + d.zone);
            lastLiveData = d;
            lastUpdateTime = new Date();
            renderLive(d);
            updateWeather(d);
        })
        .catch(() => setStatus("error", "Connection error"));
}

// ─── RENDER LIVE ──────────────────────────────────────────────────
function renderLive(d) {
    // Hero
    setText("heroZone",  d.zone);
    setText("heroPlant", "🌿 " + cap(d.plant));
    setText("heroArea",  "📐 " + d.hectares + " ha");
    show("manualBtn");

    // Gauges
    setGauge("gaugeSoil", d.soil,        100);
    setGauge("gaugeTemp", d.temperature, 50);
    setGauge("gaugeHum",  d.humidity,    100);
    setText("valSoil", d.soil);
    setText("valTemp",  d.temperature);
    setText("valHum",  d.humidity);
    setText("valHa",   d.hectares);

    // Gauge status labels
    setText("soilStatus", d.soil < 30 ? "⚠️ Too Dry" : d.soil > 80 ? "💦 Saturated" : "✅ Optimal");
    setText("tempStatus", d.temperature > 38 ? "🔥 Hot" : d.temperature < 12 ? "❄️ Cold" : "✅ Normal");
    setText("humStatus",  d.humidity < 25 ? "⚠️ Low" : d.humidity > 85 ? "☁️ High" : "✅ Normal");

    // Health score
    const health = calcHealth(d.soil, d.temperature, d.humidity);
    setGauge("gaugeHealth", health, 100);
    setText("healthScore", health);
    const hStatus = health >= 80 ? "Excellent 🌟" : health >= 60 ? "Good 👍" : health >= 40 ? "Fair ⚠️" : "Poor 🔴";
    setText("healthStatus", hStatus);
    // Update health gauge color
    const hFill = document.getElementById("gaugeHealth");
    if (hFill) {
        hFill.style.stroke = health >= 80 ? "#22c55e" : health >= 60 ? "#14b8a6" : health >= 40 ? "#fbbf24" : "#ef4444";
    }

    // Water
    setText("waterPerHa", d.water_per_hectare.toFixed(1));
    setText("waterTotal",  d.total_water.toFixed(1));
    setText("waterPlant",  cap(d.plant) + " field");

    // AI Decision
    const badge = document.getElementById("decisionBadge");
    const icon  = document.getElementById("decisionIcon");
    const title = document.getElementById("decisionTitle");
    const sub   = document.getElementById("decisionSub");

    if (d.irrigate) {
        badge.className    = "decision-badge irrigate";
        icon.textContent   = "🚨";
        title.textContent  = "Irrigate Now!";
        sub.textContent    = "Soil moisture critically low — activate irrigation";
    } else {
        badge.className    = "decision-badge ok";
        icon.textContent   = "✅";
        title.textContent  = "All Clear";
        sub.textContent    = "Soil conditions adequate — no action needed";
    }

    // Threshold alerts
    if (d.soil < thresholds.soil) showToast(`⚠️ ${d.zone}: Soil at ${d.soil}% (below ${thresholds.soil}% threshold)`, "error");
    if (d.temperature > thresholds.temp) showToast(`🔥 ${d.zone}: Temp at ${d.temperature}°C (above ${thresholds.temp}°C)`, "info");
}

function calcHealth(soil, temp, hum) {
    let s = 100;
    if (soil < 20) s -= 40; else if (soil < 35) s -= 20; else if (soil < 40) s -= 8;
    else if (soil > 85) s -= 25; else if (soil > 75) s -= 10;
    if (temp > 42) s -= 30; else if (temp > 38) s -= 20; else if (temp > 32) s -= 8;
    else if (temp < 8) s -= 25; else if (temp < 15) s -= 10;
    if (hum < 20) s -= 20; else if (hum < 30) s -= 10; else if (hum > 88) s -= 12;
    return Math.max(0, Math.min(100, Math.round(s)));
}

// ─── HISTORY ──────────────────────────────────────────────────────
function loadHistory() {
    if (!selectedZoneId) return;
    fetch("/history/" + selectedZoneId)
        .then(r => r.json())
        .then(rows => { renderTable(rows); updateHistoryChart(rows); });
}

function renderTable(rows) {
    const tbody = document.getElementById("historyBody");
    if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No readings yet</td></tr>';
        return;
    }
    tbody.innerHTML = rows.slice().reverse().map(r => {
        const badge = r.irrigate
            ? '<span class="badge badge-irrigate">🚨 Irrigate</span>'
            : '<span class="badge badge-ok">✅ OK</span>';
        const ts = r.timestamp ? r.timestamp.replace("T"," ").substring(0,19) : "—";
        return `<tr>
            <td>${ts}</td><td>${r.soil}</td><td>${r.temperature}</td>
            <td>${r.humidity}</td><td>${r.water_need!=null?r.water_need.toFixed(1):"—"}</td>
            <td>${badge}</td>
        </tr>`;
    }).join("");
}

// ─── STATS ────────────────────────────────────────────────────────
function loadStats() {
    if (!selectedZoneId) return;
    fetch("/stats/" + selectedZoneId).then(r => r.json()).then(s => {
        if (s.error) return;
        setText("statReadings",   s.total_readings);
        setText("statIrrigations",s.irrigations);
        setText("statAvgSoil",    s.avg_soil + "%");
        setText("statTotalWater", s.total_water + " L");
    });
}

// ─── HISTORY CHART (dashboard) ───────────────────────────────────
function initHistoryChart() {
    const ctx = document.getElementById("historyChart").getContext("2d");
    historyChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [
                { label:"Soil %",     data:[], borderColor:"#22d3ee", backgroundColor:"rgba(34,211,238,.08)", tension:.4, fill:true,  pointRadius:3, borderWidth:2.5, pointBackgroundColor:"#22d3ee" },
                { label:"Temp °C",    data:[], borderColor:"#f59e0b", backgroundColor:"transparent",           tension:.4, fill:false, pointRadius:3, borderWidth:2.5, pointBackgroundColor:"#f59e0b" },
                { label:"Humidity %", data:[], borderColor:"#818cf8", backgroundColor:"transparent",           tension:.4, fill:false, pointRadius:3, borderWidth:2.5, pointBackgroundColor:"#818cf8" }
            ]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            interaction:{mode:"index", intersect:false},
            plugins:{
                legend:{display:false},
                tooltip:{
                    backgroundColor:"#0c1f2d", titleColor:"#f0f9ff",
                    bodyColor:"#94a3b8", padding:12, cornerRadius:8,
                    titleFont:{weight:"700"}
                }
            },
            scales:{
                y:{ beginAtZero:true, max:100, grid:{color:"rgba(0,0,0,.04)"}, ticks:{color:"#94a3b8",font:{size:11}}, border:{display:false} },
                x:{ grid:{display:false}, ticks:{color:"#94a3b8",font:{size:11}}, border:{display:false} }
            }
        }
    });
}

function updateHistoryChart(rows) {
    if (!rows || !rows.length || !historyChart) return;
    historyChart.data.labels            = rows.map((_,i) => "#"+(i+1));
    historyChart.data.datasets[0].data  = rows.map(r => r.soil);
    historyChart.data.datasets[1].data  = rows.map(r => r.temperature);
    historyChart.data.datasets[2].data  = rows.map(r => r.humidity);
    historyChart.update("none");
}

// ─── ANALYTICS ────────────────────────────────────────────────────
function initAnalyticsCharts() {
    const wCtx = document.getElementById("waterChart").getContext("2d");
    waterChart = new Chart(wCtx, {
        type: "bar",
        data: {
            labels: [],
            datasets: [{ label:"Water (L)", data:[], backgroundColor:[], borderRadius:5, borderSkipped:false }]
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{
                legend:{display:false},
                tooltip:{
                    backgroundColor:"#0c1f2d", titleColor:"#f0f9ff",
                    bodyColor:"#94a3b8", padding:12, cornerRadius:8
                }
            },
            scales:{
                y:{ beginAtZero:true, grid:{color:"rgba(0,0,0,.04)"}, ticks:{color:"#94a3b8",font:{size:11}}, border:{display:false} },
                x:{ grid:{display:false}, ticks:{color:"#94a3b8",font:{size:11}}, border:{display:false} }
            }
        }
    });

    const rCtx = document.getElementById("ratioChart").getContext("2d");
    ratioChart = new Chart(rCtx, {
        type: "doughnut",
        data: {
            labels: ["Irrigation triggered", "No irrigation"],
            datasets: [{ data:[0,1], backgroundColor:["#ef4444","#22c55e"], borderWidth:0, spacing:3, borderRadius:5 }]
        },
        options: {
            responsive:true, maintainAspectRatio:false, cutout:"72%",
            plugins:{
                legend:{position:"bottom", labels:{color:"#94a3b8", font:{size:12, weight:"600"}, padding:16}},
                tooltip:{backgroundColor:"#0c1f2d", titleColor:"#f0f9ff", bodyColor:"#94a3b8", padding:12, cornerRadius:8}
            }
        }
    });
}

function loadAnalytics() {
    if (!selectedZoneId) return;
    Promise.all([
        fetch("/history/" + selectedZoneId).then(r => r.json()),
        fetch("/stats/"   + selectedZoneId).then(r => r.json())
    ]).then(([history, stats]) => {
        renderAnalytics(history, stats);
    });
}

function renderAnalytics(history, stats) {
    if (!history || history.length === 0) return;

    // Summary cards
    const total   = stats.total_readings  || 0;
    const irr     = stats.irrigations     || 0;
    const eff     = total > 0 ? Math.round(((total - irr) / total) * 100) : 0;
    const avgWater= irr > 0 ? (stats.total_water / irr).toFixed(1) : "—";
    const soils   = history.map(r => r.soil);
    const minS    = soils.length ? Math.min(...soils) : "--";
    const maxS    = soils.length ? Math.max(...soils) : "--";

    setText("anEfficiency", eff + "%");
    setText("anEffSub",     eff >= 70 ? "🌟 Efficient field management" : eff >= 50 ? "⚠️ Room for improvement" : "🔴 High irrigation rate");
    setText("anAvgWater",   avgWater + " L");
    setText("anPeakSoil",   minS + "–" + maxS + "%");
    setText("anAvgTemp",    (stats.avg_temperature || "--") + "°C");

    // Water bar chart
    if (waterChart) {
        waterChart.data.labels            = history.map((_,i) => "#"+(i+1));
        waterChart.data.datasets[0].data  = history.map(r => r.water_need ? +r.water_need.toFixed(1) : 0);
        waterChart.data.datasets[0].backgroundColor = history.map(r => r.irrigate ? "rgba(239,68,68,.75)" : "rgba(34,197,94,.75)");
        waterChart.update();
    }

    // Ratio donut
    if (ratioChart) {
        ratioChart.data.datasets[0].data = [irr, Math.max(0, total - irr)];
        ratioChart.update();
        setText("donutPct", total > 0 ? Math.round((irr/total)*100) + "%" : "--");
    }
}

// ─── ALERTS ────────────────────────────────────────────────────────
function loadAlerts() {
    fetch("/alerts").then(r => r.json()).then(alerts => {
        alertCount = alerts.length;

        // Update bell badges
        const badge = document.getElementById("notifBadge");
        const navBadge = document.getElementById("navAlertBadge");
        if (alertCount > 0) {
            badge.style.display = "flex";
            badge.textContent   = alertCount;
            navBadge.style.display = "inline-block";
            navBadge.textContent   = alertCount;
        } else {
            badge.style.display = "none";
            navBadge.style.display = "none";
        }

        // Summary stats
        setText("ahCount", alertCount);
        if (alerts.length > 0) {
            setText("ahLastZone", alerts[0].zone);
            const ts = alerts[0].timestamp;
            setText("ahLastTime", ts ? ts.replace("T"," ").substring(0,16) : "—");
        }

        // Alert list
        const list = document.getElementById("alertsList");
        if (alerts.length === 0) {
            list.innerHTML = '<div class="alerts-empty">No irrigation alerts yet. Your fields are happy! 🌿</div>';
            return;
        }
        list.innerHTML = alerts.map(a => {
            const ts = a.timestamp ? a.timestamp.replace("T"," ").substring(0,16) : "—";
            return `<div class="alert-item">
                <div class="ai-icon">🚨</div>
                <div class="ai-body">
                    <div class="ai-zone">${a.zone}</div>
                    <div class="ai-meta">
                        <span>🌱 Soil: ${a.soil}%</span>
                        <span>🌡️ ${a.temperature}°C</span>
                        <span>💧 ${a.humidity}%</span>
                        <span>🌿 ${cap(a.plant)}</span>
                    </div>
                </div>
                <div class="ai-time">${ts}</div>
                <div class="ai-soil">Soil ${a.soil}%</div>
            </div>`;
        }).join("");
    });
}

// ─── MANUAL IRRIGATION ────────────────────────────────────────────
function triggerManual() {
    if (!selectedZoneId) return;
    fetch("/manual_irrigate/" + selectedZoneId, { method:"POST" })
        .then(r => r.json())
        .then(res => {
            if (res.status === "ok") {
                showToast("💧 Irrigation manually triggered!", "success");
                loadHistory();
                loadStats();
                loadAlerts();
            }
        });
}

// ─── SETTINGS ─────────────────────────────────────────────────────
function renderSettingsZones() {
    fetch("/zones").then(r => r.json()).then(zones => {
        const tbody = document.getElementById("settingsZonesBody");
        if (!zones.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No zones yet</td></tr>';
            return;
        }
        tbody.innerHTML = zones.map(z => `
            <tr>
                <td><strong>${z.name}</strong></td>
                <td>${cap(z.plant)}</td>
                <td>${z.hectares} ha</td>
                <td><button class="btn-del-zone" onclick="deleteZoneById(${z.id},'${z.name}')">Delete</button></td>
            </tr>`).join("");
    });
}

function deleteZoneById(id, name) {
    if (!confirm(`Delete "${name}" and all its history?`)) return;
    fetch("/delete_zone/" + id, { method:"DELETE" })
        .then(() => {
            showToast(`Zone "${name}" deleted`, "info");
            if (selectedZoneId === id) { selectedZoneId = null; clearDashboard(); }
            loadZones();
            renderSettingsZones();
        });
}

function loadThresholds() {
    const saved = localStorage.getItem("aq-thresholds");
    if (saved) thresholds = { ...thresholds, ...JSON.parse(saved) };

    const s = document.getElementById("thSoil");
    const t = document.getElementById("thTemp");
    const h = document.getElementById("thHum");
    if (s) { s.value = thresholds.soil; setText("thSoilVal", thresholds.soil + "%"); }
    if (t) { t.value = thresholds.temp; setText("thTempVal", thresholds.temp + "°C"); }
    if (h) { h.value = thresholds.hum;  setText("thHumVal",  thresholds.hum  + "%"); }
}

function updateThreshold(key, val) {
    thresholds[key] = parseInt(val);
    if (key === "soil") setText("thSoilVal", val + "%");
    if (key === "temp") setText("thTempVal", val + "°C");
    if (key === "hum")  setText("thHumVal",  val + "%");
    localStorage.setItem("aq-thresholds", JSON.stringify(thresholds));
    showToast("Threshold updated ✓", "success");
}

function exportCSV() {
    if (!selectedZoneId) { showToast("Select a zone first", "error"); return; }
    fetch("/history/" + selectedZoneId).then(r => r.json()).then(rows => {
        const headers = ["Timestamp","Soil%","Temperature°C","Humidity%","Water(L)","Irrigate"];
        const lines = [headers.join(","), ...rows.map(r => [
            r.timestamp||"", r.soil, r.temperature, r.humidity,
            r.water_need!=null ? r.water_need.toFixed(1) : "",
            r.irrigate ? "Yes":"No"
        ].join(","))];
        const blob = new Blob([lines.join("\n")], { type:"text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `aquasmart_zone${selectedZoneId}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast("CSV downloaded ✓", "success");
    });
}

// ─── WEATHER WIDGET ────────────────────────────────────────────────
function updateWeather(d) {
    const temp = d.temperature + 2;
    const hum  = d.humidity;
    const icon = hum >= 75 ? "🌧️" : hum >= 55 ? "⛅" : hum >= 35 ? "🌤️" : "☀️";
    const cond = hum >= 75 ? "Rainy" : hum >= 55 ? "Cloudy" : hum >= 35 ? "Partly Cloudy" : "Sunny";
    // dew point approx: T - ((100 - RH) / 5)
    const dew = Math.round(temp - ((100 - hum) / 5));

    setText("swTemp", temp.toFixed(1) + "°C");
    setText("swCond", cond);
    setText("swIcon", icon);
    setText("swHum",  hum + "%");
    setText("swDew",  dew + "°C");
}

// ─── MODAL ─────────────────────────────────────────────────────────
function openModal() {
    document.getElementById("modal").classList.add("open");
    setTimeout(() => document.getElementById("zoneName").focus(), 100);
}
function closeModal() { document.getElementById("modal").classList.remove("open"); }
function overlayClose(e) { if (e.target.id === "modal") closeModal(); }

// ─── ADD ZONE ──────────────────────────────────────────────────────
function addZone() {
    const name     = document.getElementById("zoneName").value.trim();
    const plant    = document.getElementById("plant").value;
    const hectares = parseFloat(document.getElementById("hectares").value);

    if (!name) { showToast("Please enter a zone name", "error"); return; }
    if (!hectares || hectares <= 0) { showToast("Please enter a valid area", "error"); return; }

    fetch("/add_zone", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name, plant, hectares })
    }).then(() => {
        closeModal();
        document.getElementById("zoneName").value  = "";
        document.getElementById("hectares").value  = "";
        showToast(`Zone "${name}" added ✓`, "success");
        loadZones();
    });
}

// ─── DELETE ZONE ───────────────────────────────────────────────────
function deleteZone() {
    if (!selectedZoneId) return;
    const sel  = document.getElementById("zoneSelect");
    const name = sel.options[sel.selectedIndex]?.text || "this zone";
    if (!confirm(`Delete "${name}"?\nAll history for this zone will also be removed.`)) return;
    fetch("/delete_zone/" + selectedZoneId, { method:"DELETE" })
        .then(() => {
            showToast(`Zone deleted`, "info");
            selectedZoneId = null;
            clearDashboard();
            loadZones();
        });
}

// ─── TOAST ────────────────────────────────────────────────────────
let toastThrottle = {};
function showToast(message, type = "success") {
    // Throttle repeated identical toasts (e.g. threshold alerts every 2s)
    if (toastThrottle[message] && Date.now() - toastThrottle[message] < 10000) return;
    toastThrottle[message] = Date.now();

    const area  = document.getElementById("toastArea");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    area.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("show")));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// ─── LAST UPDATED ─────────────────────────────────────────────────
function updateLastUpdated() {
    if (!lastUpdateTime) return;
    const secs = Math.round((Date.now() - lastUpdateTime) / 1000);
    const txt  = secs < 5   ? "Just now"
               : secs < 60  ? `${secs}s ago`
               : `${Math.round(secs/60)}m ago`;
    setText("lastUpdated", "Updated " + txt);
}

// ─── HELPERS ──────────────────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
function show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
}
function hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
}
function setGauge(id, value, max) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.min(1, Math.max(0, value / max));
    el.style.strokeDashoffset = GAUGE_CIRC - pct * GAUGE_CIRC;
}
function resetGauge(id) {
    const el = document.getElementById(id);
    if (el) el.style.strokeDashoffset = GAUGE_CIRC;
}
function setStatus(state, text) {
    document.getElementById("statusDot").className   = "pulse-dot " + state;
    document.getElementById("statusText").textContent = text;
}
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function clearDashboard() {
    lastLiveData = null; lastUpdateTime = null;
    setText("heroZone","—"); setText("heroPlant","—"); setText("heroArea","—");
    setText("lastUpdated","No data yet"); hide("manualBtn");
    document.getElementById("decisionBadge").className = "decision-badge waiting";
    setText("decisionIcon","⏳"); setText("decisionTitle","Waiting..."); setText("decisionSub","Awaiting sensor data");
    ["valSoil","valTemp","valHum","valHa","healthScore"].forEach(id => setText(id,"--"));
    ["soilStatus","tempStatus","humStatus","healthStatus"].forEach(id => setText(id,"—"));
    setText("waterPerHa","--"); setText("waterTotal","--"); setText("waterPlant","—");
    ["statReadings","statIrrigations","statAvgSoil","statTotalWater"].forEach(id => setText(id,"--"));
    ["gaugeSoil","gaugeTemp","gaugeHum","gaugeHealth"].forEach(id => resetGauge(id));
    document.getElementById("historyBody").innerHTML = '<tr><td colspan="6" class="empty-row">No readings yet</td></tr>';
    if (historyChart) { historyChart.data.labels=[]; historyChart.data.datasets.forEach(d=>d.data=[]); historyChart.update("none"); }
}
