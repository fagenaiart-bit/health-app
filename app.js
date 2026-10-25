import { CONFIG } from "./config.js";
import { STR, LOCALE } from "./i18n.js";
import { store, emptyData, merge, googleSignIn, googleSignOut, drive, readWithServer, parseGptAnswer, uid } from "./store.js";
import { demoData } from "./demo.js";

// ——— стан інтерфейсу ———
const ui = { tab: "overview", marker: null, range: "all", docsSeg: "timeline", obName: "", obMode: "", obAgree: false, obStep: 1 };
const $app = document.getElementById("app");

const lang = () => store.data.profile.lang || localStorage.getItem("health.lang") || detectLang();
function detectLang() { const l = (navigator.language || "uk").slice(0, 2); return l === "pl" ? "pl" : l === "en" ? "en" : "uk"; }
const t = (k, v = {}) => (STR[lang()][k] ?? STR.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? "");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = v => (v === "" || v === null || v === undefined || isNaN(+v) ? null : +v);
const fmtNum = v => (v == null ? "—" : (+v).toLocaleString(LOCALE[lang()], { maximumFractionDigits: 2 }));
const fmtDate = (s, short) => { if (!s) return ""; const d = new Date(s.length === 10 ? s + "T12:00:00" : s); return d.toLocaleDateString(LOCALE[lang()], short ? { day: "2-digit", month: "2-digit" } : { day: "2-digit", month: "2-digit", year: "numeric" }); };
const today = () => new Date().toISOString().slice(0, 10);
const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "");

const I = {
  heart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6f7fd8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
  labs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
  docs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  diary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 3h10l3 3v15H6z"/><path d="M9 10h7M9 14h7M9 18h4"/></svg>',
  meds: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-40 12 12)"/><path d="M9.3 9.2l5.4 5.6" transform=""/></svg>',
  gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  ok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12l5 5 9-10"/></svg>',
  flask: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 18l-5-9V3"/></svg>',
  steth: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 3v5a5 5 0 0 0 10 0V3"/><path d="M11 13v2a5 5 0 0 0 10 0v-2"/><circle cx="21" cy="11" r="1.5"/></svg>',
  scan: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"/></svg>',
  file: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/></svg>',
  arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  g: '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>'
};
const catIcon = c => ({ lab: I.flask, visit: I.steth, exam: I.scan }[c] || I.file);

// ——— аналізи ———
const labKey = l => (l.code || l.name || "").trim().toUpperCase();
function markers() {
  const map = new Map();
  for (const l of store.list("labs")) {
    const k = labKey(l); if (!k) continue;
    if (!map.has(k)) map.set(k, { key: k, code: l.code, name: l.name, unit: l.unit, points: [] });
    map.get(k).points.push(l);
  }
  const out = [...map.values()];
  out.forEach(m => { m.points.sort((a, b) => (a.date || "").localeCompare(b.date || "")); const last = m.points.at(-1); m.last = last; m.name = last.name || m.name; m.unit = last.unit || m.unit; m.refLow = num(last.refLow); m.refHigh = num(last.refHigh); });
  return out.sort((a, b) => (b.last.date || "").localeCompare(a.last.date || ""));
}
function status(l) { const v = num(l.value), lo = num(l.refLow), hi = num(l.refHigh); if (v == null) return null; if (lo != null && v < lo) return "lo"; if (hi != null && v > hi) return "hi"; if (lo == null && hi == null) return null; return "ok"; }
function refText(l) { const lo = num(l.refLow), hi = num(l.refHigh); if (lo != null && hi != null) return `${fmtNum(lo)}–${fmtNum(hi)} ${l.unit || ""}`; if (hi != null) return `< ${fmtNum(hi)} ${l.unit || ""}`; if (lo != null) return `> ${fmtNum(lo)} ${l.unit || ""}`; return l.refText || ""; }

// ——— графік (SVG) ———
function chart(series, { lo = null, hi = null, unit = "", h = 210 } = {}) {
  const W = 640, H = h + 40, P = { l: 58, r: 16, t: 30, b: 36 };
  const all = series.flatMap(s => s.points);
  if (!all.length) return "";
  const xs = all.map(p => +new Date(p.x)), ys = all.map(p => p.y).concat([lo, hi].filter(v => v != null));
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5 * 15; x1 += 864e5 * 15; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const pad = (y1 - y0 || Math.abs(y1) || 1) * 0.18; y0 -= pad; y1 += pad;
  const X = x => P.l + ((+new Date(x) - x0) / (x1 - x0)) * (W - P.l - P.r), Y = y => P.t + (1 - (y - y0) / (y1 - y0)) * (H - P.t - P.b);
  let g = "";
  if (lo != null || hi != null) {
    const a = Y(hi ?? y1), b = Y(lo ?? y0);
    g += `<rect x="${P.l}" y="${a}" width="${W - P.l - P.r}" height="${Math.max(0, b - a)}" rx="10" fill="#e5f3ea"/>`;
    g += `<text x="${W - P.r - 4}" y="${a - 5}" text-anchor="end" style="fill:#4f9a6b">${t("norm")} ${esc(refText({ refLow: lo, refHigh: hi, unit }))}</text>`;
  }
  for (let i = 0; i <= 3; i++) { const v = y0 + ((y1 - y0) * i) / 3, y = Y(v); g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}" stroke="rgba(43,58,99,.06)"/><text x="${P.l - 8}" y="${y + 4}" text-anchor="end">${fmtNum(Math.round(v * 10) / 10)}</text>`; }
  g += `<text x="${P.l}" y="${H - 8}">${fmtDate(new Date(x0).toISOString().slice(0, 10))}</text><text x="${W - P.r}" y="${H - 8}" text-anchor="end">${fmtDate(new Date(x1).toISOString().slice(0, 10))}</text>`;
  for (const s of series) {
    const pts = s.points.map(p => [X(p.x), Y(p.y)]);
    if (pts.length > 1) {
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
      if (s.fill) g += `<path d="${d} L${pts.at(-1)[0]} ${H - P.b} L${pts[0][0]} ${H - P.b} Z" fill="url(#gf)" opacity=".7"/>`;
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    s.points.forEach((p, i) => { const [x, y] = pts[i]; const last = i === pts.length - 1; const bad = (lo != null && p.y < lo) || (hi != null && p.y > hi);
      g += `<circle cx="${x}" cy="${y}" r="${last ? 5.5 : 4}" fill="${bad ? "#e0874a" : last ? (s.lastColor || s.color) : "#fff"}" stroke="${bad ? "#e0874a" : s.color}" stroke-width="2"/>`;
      if (last) g += `<text x="${Math.min(x, W - P.r - 20)}" y="${y - 10}" text-anchor="middle" style="fill:#2b3a63;font-weight:700">${fmtNum(p.y)}</text>`; });
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(unit)}"><defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfd6f7"/><stop offset="1" stop-color="#cfd6f7" stop-opacity="0"/></linearGradient></defs>${g}</svg>`;
}

// ——— шапка, навігація ———
function langPills() {
  return `<div class="langs">${["uk", "pl", "en"].map(l => `<button class="lang ${lang() === l ? "on" : ""}" data-lang="${l}"><span class="flag ${l === "uk" ? "ua" : l}"></span>${l === "uk" ? "UA" : l.toUpperCase()}</button>`).join("")}</div>`;
}
function header() {
  return `<header class="top"><a class="brand" href="#" data-tab="overview"><span class="brand-heart">${I.heart}</span><span class="brand-name">health<i>.</i></span></a>
  <div class="top-right">${langPills()}<button class="icon-btn" data-act="settings" aria-label="${t("settings")}">${I.gear}</button></div></header>`;
}
function syncPill() {
  if (store.mode === "demo") return `<span class="pill"><span class="d"></span>${t("savedLocal")}</span>`;
  const s = store.status;
  if (s === "auth") return `<button class="pill error" data-act="reconnect"><span class="d"></span>${t("reconnect")}</button>`;
  const map = { saving: ["saving", t("saving")], error: ["error", t("syncError")], offline: ["saving", t("offline")] };
  const [cls, txt] = map[s] || ["", t("saved")];
  return `<span class="pill ${cls}"><span class="d"></span>${txt}</span>`;
}
function nav() {
  return `<nav class="nav">${["overview", "labs", "docs", "diary", "meds"].map(k => `<button class="${ui.tab === k ? "on" : ""}" data-tab="${k}">${I[k]}<span>${t("nav_" + k)}</span></button>`).join("")}</nav>`;
}
const foot = () => `<div class="foot"><span>health. · me20 studio</span><span>${t("footer")}</span></div>`;

// ——— сторінки ———
function pageOverview() {
  const p = store.data.profile;
  const meds = store.list("meds").filter(m => m.active);
  const bp = store.list("bp").sort(byDateDesc)[0];
  const w = store.list("weight").sort(byDateDesc);
  const mk = markers(); const bad = mk.filter(m => ["lo", "hi"].includes(status(m.last))); const good = mk.filter(m => status(m.last) === "ok");
  const docs = store.list("docs").sort(byDateDesc).slice(0, 4);
  return `<section>
  <p class="eyebrow">${t("everything")}</p>
  <h1>${p.name ? esc(t("hello", { name: p.name })) : t("helloNo")}</h1>
  <p class="lead">${t("overviewLead")}</p>${syncPill()}
  <div class="card"><div class="card-head"><div><p class="eyebrow">${t("medsNow")}</p><h2>${t("myMeds")}</h2></div><button class="link" data-tab="meds">${t("allMeds")} ↗</button></div>
    ${meds.length ? `<div class="grid2">${meds.map(m => `<div class="med"><h3>${esc(m.name)}</h3><div class="dose">${esc([m.dose, m.schedule].filter(Boolean).join(" · "))}</div></div>`).join("")}</div>` : `<p class="empty">${t("noMeds")}</p>`}
    <div class="grid3" style="margin-top:12px">
      <button class="tile" data-tab="diary" style="text-align:left"><div class="label">${t("bp")}</div><div class="big">${bp ? `${bp.sys}/${bp.dia}` : "—"}</div><div class="small">${bp ? fmtDate(bp.date) : ""}</div></button>
      <button class="tile" data-tab="diary" style="text-align:left"><div class="label">${t("weight")}</div><div class="big">${w[0] ? fmtNum(w[0].kg) : "—"}<small>${t("kg")}</small></div><div class="small">${w.length > 1 ? `${(w[0].kg - w.at(-1).kg > 0 ? "+" : "")}${fmtNum(Math.round((w[0].kg - w.at(-1).kg) * 10) / 10)} ${t("kg")}` : ""}</div></button>
      <button class="tile ${bad.length ? "warn" : ""}" data-tab="labs" style="text-align:left"><div class="label">${t("attention")}</div><div class="big">${bad.length}</div><div class="small">${esc(bad.slice(0, 2).map(m => m.name).join(", "))}</div></button>
    </div></div>
  ${mk.length ? `<div class="card"><p class="eyebrow">${t("lastResults")}</p><h2>${t("attention")} <span style="color:var(--warn)">· ${bad.length}</span></h2>
    ${bad.map(m => `<div class="row" data-marker="${esc(m.key)}" style="cursor:pointer"><div class="ico warn">${status(m.last) === "lo" ? I.down : I.up}</div><div class="grow"><div class="t">${esc(m.name)}</div><div class="s" style="color:var(--warn)">${status(m.last) === "lo" ? t("below") : t("above")} · ${esc(refText(m.last))}</div></div><div class="val warn">${fmtNum(m.last.value)}<small>${esc(m.unit || "")}</small></div></div>`).join("")}
    ${good.length ? `<div class="row"><div class="ico ok">${I.ok}</div><div class="grow"><div class="t">${esc(good.slice(0, 3).map(m => m.name).join(", "))}${good.length > 3 ? "…" : ""}</div><div class="s" style="color:var(--ok)">${t("inRange", { n: good.length })}</div></div><div class="ok-text">${t("allGood")}</div></div>` : ""}
  </div>` : ""}
  <div class="card"><div class="card-head"><div><p class="eyebrow">${t("timeline")}</p><h2>${t("latestDocs")}</h2></div><button class="link" data-tab="docs">${t("allDocs")} ↗</button></div>
    ${docs.length ? docs.map(docRow).join("") : `<p class="empty">${t("noDocs")}</p>`}
    <div class="btns" style="margin-top:12px"><button class="btn small" data-act="addDoc">+ ${t("addDoc")}</button></div>
  </div>${foot()}</section>`;
}
function docRow(d) {
  const link = d.webViewLink ? `<a class="link" href="${esc(d.webViewLink)}" target="_blank" rel="noopener" aria-label="${t("open")}">${I.arrow}</a>` : "";
  return `<div class="row"><div class="ico">${catIcon(d.category)}</div><div class="grow" data-edit-doc="${d.id}" style="cursor:pointer"><div class="s">${fmtDate(d.date)} · ${t("cat_" + (d.category || "other"))}</div><div class="t">${esc(d.title || "—")}${d.clinic ? ` · <span class="small">${esc(d.clinic)}</span>` : ""}</div></div>${link}</div>`;
}

function pageLabs() {
  const mk = markers();
  if (!mk.length) return `<section><p class="eyebrow">${t("everything")}</p><h1>${t("labsTitle")}</h1><p class="lead">${t("labsLead")}</p><div class="card"><p class="empty">${t("noLabs")}</p><div class="btns"><button class="btn small" data-act="addDoc">+ ${t("addDoc")}</button><button class="btn ghost small" data-act="addLab">${t("addValue")}</button></div></div>${foot()}</section>`;
  const m = mk.find(x => x.key === ui.marker) || mk[0]; ui.marker = m.key;
  let pts = m.points; if (ui.range === "2y") { const c = new Date(); c.setFullYear(c.getFullYear() - 2); pts = pts.filter(p => new Date(p.date) >= c); }
  const years = pts.length ? new Date(pts.at(-1).date).getFullYear() - new Date(pts[0].date).getFullYear() : 0;
  return `<section><p class="eyebrow">${t("everything")}</p><h1>${t("labsTitle")}</h1><p class="lead">${t("labsLead")}</p>
  <div class="chip-row">${mk.map(x => { const st = status(x.last); return `<button class="marker ${x.key === m.key ? "on" : ""} ${st || ""}" data-marker="${esc(x.key)}"><div class="code">${esc(x.code || "")}&nbsp;</div><div class="nm">${esc(x.name)}</div><div class="v">${fmtNum(x.last.value)}<small>${esc(x.unit || "")}</small></div></button>`; }).join("")}</div>
  <div class="card"><div class="card-head"><div><p class="eyebrow">${esc(m.name)}${m.code ? " · " + esc(m.code) : ""}</p><h2>${t("dynamics")}${years > 0 ? ` · ${years} ${lang() === "en" ? "yrs" : lang() === "pl" ? "lat" : "р."}` : ""}</h2></div>
    <div class="seg"><button class="${ui.range === "all" ? "on" : ""}" data-range="all">${t("allTime")}</button><button class="${ui.range === "2y" ? "on" : ""}" data-range="2y">${t("years2")}</button></div></div>
    ${chart([{ color: "#6f7fd8", lastColor: "#c27bb4", fill: true, points: pts.map(p => ({ x: p.date, y: +p.value })) }], { lo: m.refLow, hi: m.refHigh, unit: m.unit })}
    <p class="small">${m.points.length} ${t("measurements")}${refText(m.last) ? " · " + t("norm") + " " + esc(refText(m.last)) : ""}</p>
  </div>
  <div class="card"><div class="card-head"><h2>${t("values")}</h2><button class="btn ghost small" data-act="addLab" data-key="${esc(m.key)}">+ ${t("addValue")}</button></div>
    ${[...m.points].reverse().map(p => { const st = status(p); const doc = p.docId && store.list("docs").find(d => d.id === p.docId);
      return `<div class="row"><div class="grow" data-edit-lab="${p.id}" style="cursor:pointer"><div class="t">${fmtDate(p.date)}</div><div class="s">${doc ? esc(doc.title) : ""}</div></div><div class="val ${st === "lo" || st === "hi" ? "warn" : ""}">${fmtNum(p.value)}<small>${esc(p.unit || "")}</small></div></div>`; }).join("")}
  </div>
  <div class="btns"><button class="btn small" data-act="addDoc">+ ${t("addDoc")}</button></div>${foot()}</section>`;
}

function pageDocs() {
  const seg = ui.docsSeg;
  const docs = store.list("docs").sort(byDateDesc), visits = store.list("visits").sort(byDateDesc);
  return `<section><p class="eyebrow">${t("everything")}</p><h1>${t("docsTitle")}</h1><p class="lead">${t("docsLead")}</p>
  <div class="seg"><button class="${seg === "timeline" ? "on" : ""}" data-seg="timeline">${t("timeline")} · ${docs.length}</button><button class="${seg === "visits" ? "on" : ""}" data-seg="visits">${t("visits")} · ${visits.length}</button></div>
  ${seg === "timeline" ? `<div class="card"><div class="card-head"><h2>${t("latestDocs")}</h2><button class="btn small" data-act="addDoc">+ ${t("addDoc")}</button></div>${docs.length ? docs.map(docRow).join("") : `<p class="empty">${t("noDocs")}</p>`}</div>`
  : `<div class="card"><div class="card-head"><h2>${t("visits")}</h2><button class="btn small" data-act="addVisit">+ ${t("addVisit")}</button></div>
    ${visits.length ? visits.map(v => `<div class="row" data-edit-visit="${v.id}" style="cursor:pointer"><div class="ico">${I.steth}</div><div class="grow"><div class="t">${esc(v.specialty || "—")}${v.doctor ? ` · <span class="small">${esc(v.doctor)}</span>` : ""}</div><div class="s">${fmtDate(v.date)}${v.clinic ? " · " + esc(v.clinic) : ""}${v.reason ? " — " + esc(v.reason) : ""}</div></div></div>`).join("") : `<p class="empty">${t("noVisits")}</p>`}</div>`}
  ${foot()}</section>`;
}

function pageDiary() {
  const week = new Date(); week.setDate(week.getDate() - 7);
  const bp = store.list("bp").sort((a, b) => a.date.localeCompare(b.date));
  const bpW = bp.filter(b => new Date(b.date) >= week);
  const w = store.list("weight").sort((a, b) => a.date.localeCompare(b.date));
  const notes = store.list("diary").sort(byDateDesc);
  const ch = w.length > 1 ? Math.round((w.at(-1).kg - w[0].kg) * 10) / 10 : null;
  return `<section><p class="eyebrow">${t("everything")}</p><h1>${t("diaryTitle")}</h1><p class="lead">${t("diaryLead")}</p>
  <div class="card"><div class="card-head"><div><p class="eyebrow">${t("bp")}</p><h2>${t("bpWeek")}</h2></div><button class="btn small" data-act="addBp">+ ${t("logBp")}</button></div>
    ${bpW.length ? chart([{ color: "#6f7fd8", points: bpW.map(b => ({ x: b.date, y: +b.sys })) }, { color: "#c27bb4", points: bpW.map(b => ({ x: b.date, y: +b.dia })) }], { h: 190 }) : ""}
    ${bp.length ? [...bp].reverse().slice(0, 7).map(b => `<div class="row" data-edit-bp="${b.id}" style="cursor:pointer"><div class="grow"><div class="t">${fmtDate(b.date)} <span class="small">${new Date(b.date).toLocaleTimeString(LOCALE[lang()], { hour: "2-digit", minute: "2-digit" })}</span></div></div><div class="val">${b.sys}/${b.dia}<small>${b.pulse ? t("pulse") + " " + b.pulse : "mmHg"}</small></div></div>`).join("") : `<p class="empty">—</p>`}
  </div>
  <div class="card"><div class="card-head"><div><p class="eyebrow">${t("weight")}</p><h2>${t("weightTrend")}</h2></div><button class="btn small" data-act="addWeight">+ ${t("logWeight")}</button></div>
    ${w.length ? `<div class="grid3"><div class="tile"><div class="label">${t("first")}</div><div class="big">${fmtNum(w[0].kg)}<small>${t("kg")}</small></div><div class="small">${fmtDate(w[0].date)}</div></div><div class="tile"><div class="label">${t("latest")}</div><div class="big">${fmtNum(w.at(-1).kg)}<small>${t("kg")}</small></div><div class="small">${fmtDate(w.at(-1).date)}</div></div><div class="tile"><div class="label">${t("change")}</div><div class="big">${ch == null ? "—" : (ch > 0 ? "+" : "") + fmtNum(ch)}<small>${t("kg")}</small></div><div class="small">${w.length} ${t("measurements")}</div></div></div>
    <div style="margin-top:10px">${chart([{ color: "#6f7fd8", lastColor: "#c27bb4", fill: true, points: w.map(x => ({ x: x.date, y: +x.kg })) }], { h: 180 })}</div>
    <div class="chip-row">${[...w].reverse().map(x => `<button class="marker" data-edit-weight="${x.id}"><div class="nm small">${fmtDate(x.date)}</div><div class="v">${fmtNum(x.kg)}<small>${t("kg")}</small></div></button>`).join("")}</div>` : `<p class="empty">—</p>`}
  </div>
  <div class="card"><div class="card-head"><h2>${t("notes")}</h2><button class="btn ghost small" data-act="addNote">+ ${t("addNote")}</button></div>
    ${notes.length ? notes.map(n => `<div class="row" data-edit-note="${n.id}" style="cursor:pointer"><div class="grow"><div class="s">${fmtDate(n.date)}</div><div class="t" style="font-weight:500">${esc(n.text)}</div></div></div>`).join("") : `<p class="empty">—</p>`}
  </div>${foot()}</section>`;
}

function pageMeds() {
  const all = store.list("meds"); const cur = all.filter(m => m.active), past = all.filter(m => !m.active);
  const conf = store.data.profile.medsConfirmedAt;
  const item = m => `<div class="row"><div class="ico">${I.meds.replace("<svg", '<svg width="20" height="20"')}</div><div class="grow" data-edit-med="${m.id}" style="cursor:pointer"><div class="t">${esc(m.name)}</div><div class="s">${esc([m.dose, m.schedule].filter(Boolean).join(" · "))}${m.startDate ? " · " + fmtDate(m.startDate) : ""}</div></div><button class="btn ghost small" data-toggle-med="${m.id}">${m.active ? t("stop") : t("resume")}</button></div>`;
  return `<section><p class="eyebrow">${t("everything")}</p><h1>${t("medsTitle")}</h1><p class="lead">${t("medsLead")}</p>
  <div class="card"><div class="card-head"><div><p class="eyebrow">${t("current")}</p><h2>${t("myMeds")}</h2></div><button class="btn small" data-act="addMed">+ ${t("addMed")}</button></div>
    ${cur.length ? cur.map(item).join("") : `<p class="empty">${t("noMeds")}</p>`}
    ${cur.length ? `<div class="btns" style="margin-top:10px;align-items:center"><button class="btn ghost small" data-act="confirmMeds">✓ ${t("confirmMeds")}</button>${conf ? `<span class="small">${t("confirmed", { date: fmtDate(conf) })}</span>` : ""}</div>` : ""}
  </div>
  ${past.length ? `<div class="card"><p class="eyebrow">${t("past")}</p>${past.map(item).join("")}</div>` : ""}${foot()}</section>`;
}

// ——— вітання й перше налаштування ———
function pageWelcome() {
  return `<div class="welcome"><div class="top" style="justify-content:flex-end">${langPills()}</div>
  <div class="logo"><span class="brand-heart">${I.heart.replace(/22/g, "30")}</span><span class="brand-name">health<i>.</i></span></div>
  <h1>${t("welcomeTitle")}</h1><p class="lead">${t("welcomeLead")}</p>
  <ul class="ticks"><li>${t("w1")}</li><li>${t("w2")}</li><li>${t("w3")}</li><li>${t("w4")}</li></ul>
  <button class="gbtn" data-act="signin">${I.g} ${t("signIn")}</button>
  ${CONFIG.GOOGLE_CLIENT_ID ? "" : `<p class="small" style="text-align:center">${t("notConfigured")}</p>`}
  <p style="text-align:center"><button class="link" data-act="demo">${t("demo")}</button></p>
  <p class="small" style="text-align:center;margin-top:30px">${t("privacyText")}</p></div>`;
}
function aiChoices(sel) {
  const opts = [["server", t("aiServer"), t("aiServerD")], ["chatgpt", t("aiGpt"), t("aiGptD")]]
    .filter(([k]) => k !== "server" || CONFIG.AI_SERVER_URL || store.mode === "demo");
  return opts.map(([k, a, b]) => `<button class="choice ${sel === k ? "on" : ""}" data-ai="${k}"><b>${a}</b><span>${b}</span></button>`).join("");
}
function pageOnboarding() {
  if (ui.obStep === 1) return `<div class="welcome"><p class="eyebrow">health.</p><h1>${t("setupTitle")}</h1>
    <label class="f"><span>${t("yourName")}</span><input class="in" id="obName" value="${esc(ui.obName || store.user?.name || "")}" autocomplete="given-name"></label>
    <button class="btn" data-act="obNext">${t("next")}</button></div>`;
  return `<div class="welcome"><p class="eyebrow">health.</p><h1>${t("aiTitle")}</h1><p class="lead">${t("aiLead")}</p>${aiChoices(ui.obMode)}
    ${ui.obMode === "server" ? `<label class="check"><input type="checkbox" id="obAgree" ${ui.obAgree ? "checked" : ""}><span>${t("agree")}</span></label>` : ""}
    <button class="btn" data-act="obDone" ${!ui.obMode || (ui.obMode === "server" && !ui.obAgree) ? "disabled" : ""}>${t("start")}</button></div>`;
}

// ——— рендер ———
function render() {
  document.documentElement.lang = lang() === "uk" ? "uk" : lang();
  if (!store.mode) { $app.innerHTML = pageWelcome(); return; }
  const p = store.data.profile;
  if (!p.name || !["server", "chatgpt"].includes(p.aiMode)) { $app.innerHTML = pageOnboarding(); return; }
  const pages = { overview: pageOverview, labs: pageLabs, docs: pageDocs, diary: pageDiary, meds: pageMeds };
  $app.innerHTML = header() + (store.mode === "demo" ? `<div class="pill" style="margin-bottom:10px">${t("demoBanner")}</div>` : "") + pages[ui.tab]() + nav();
}
store.on(render);

// ——— повідомлення й шторки ———
function toast(msg) { const d = document.createElement("div"); d.className = "toast"; d.textContent = msg; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
function sheet(title, body, onMount) {
  const bg = document.createElement("div"); bg.className = "sheet-bg";
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="${t("close")}">✕</button></div>${body}</div>`;
  const close = () => bg.remove();
  bg.addEventListener("click", e => { if (e.target === bg || e.target.closest("[data-close]")) close(); });
  document.body.appendChild(bg); onMount?.(bg.querySelector(".sheet"), close);
  return close;
}
const field = (id, label, val = "", type = "text", extra = "") => `<label class="f"><span>${label}</span><input class="in" id="${id}" type="${type}" value="${esc(val)}" ${extra}></label>`;
const val = (root, id) => root.querySelector("#" + id)?.value.trim() ?? "";
const delBtn = item => (item?.id ? `<button class="btn danger" data-del>${t("delete")}</button>` : "");

function editForm({ title, col, item = {}, html, read, after }) {
  sheet(title, `${html(item)}<div class="btns" style="margin-top:14px"><button class="btn" data-save>${t("save")}</button>${delBtn(item)}</div>`, (el, close) => {
    el.querySelector("[data-save]").onclick = () => { const x = read(el); if (!x) return; store.upsert(col, { ...item, ...x }); close(); toast(t("added")); after?.(); };
    el.querySelector("[data-del]")?.addEventListener("click", () => { if (confirm(t("confirmDelete"))) { store.remove(col, item.id); close(); toast(t("deleted")); } });
  });
}
const forms = {
  lab(item = {}, key) {
    const m = key && markers().find(x => x.key === key); if (m && !item.id) item = { code: m.code, name: m.name, unit: m.unit, refLow: m.refLow, refHigh: m.refHigh };
    editForm({ title: t("addValue"), col: "labs", item, html: x => `${field("name", t("name"), x.name)}<div class="frow">${field("value", t("value"), x.value, "number", 'step="any" inputmode="decimal"')}${field("unit", t("unit"), x.unit)}</div><div class="frow">${field("refLow", t("refLow"), x.refLow ?? "", "number", 'step="any"')}${field("refHigh", t("refHigh"), x.refHigh ?? "", "number", 'step="any"')}</div><div class="frow">${field("date", t("date"), x.date || today(), "date")}${field("code", t("code"), x.code)}</div>`,
      read: el => { const v = num(val(el, "value")); if (!val(el, "name") || v == null) return null; return { name: val(el, "name"), value: v, unit: val(el, "unit"), refLow: num(val(el, "refLow")), refHigh: num(val(el, "refHigh")), date: val(el, "date"), code: val(el, "code").toUpperCase() }; } });
  },
  bp(item = {}) {
    const d = item.date ? new Date(item.date) : new Date(); const loc = new Date(d - d.getTimezoneOffset() * 6e4).toISOString();
    editForm({ title: t("logBp"), col: "bp", item, html: x => `<div class="frow">${field("sys", t("sys"), x.sys, "number", 'inputmode="numeric"')}${field("dia", t("dia"), x.dia, "number", 'inputmode="numeric"')}${field("pulse", t("pulse"), x.pulse, "number", 'inputmode="numeric"')}</div><div class="frow">${field("date", t("date"), loc.slice(0, 10), "date")}${field("time", t("time"), loc.slice(11, 16), "time")}</div>`,
      read: el => { const s = num(val(el, "sys")), di = num(val(el, "dia")); if (!s || !di) return null; return { sys: s, dia: di, pulse: num(val(el, "pulse")), date: new Date(val(el, "date") + "T" + (val(el, "time") || "08:00")).toISOString() }; } });
  },
  weight(item = {}) { editForm({ title: t("logWeight"), col: "weight", item, html: x => `<div class="frow">${field("kg", t("kg"), x.kg, "number", 'step="0.1" inputmode="decimal"')}${field("date", t("date"), x.date || today(), "date")}</div>`, read: el => { const k = num(val(el, "kg")); return k ? { kg: k, date: val(el, "date") } : null; } }); },
  note(item = {}) { editForm({ title: t("addNote"), col: "diary", item, html: x => `${field("date", t("date"), x.date || today(), "date")}<label class="f"><span>${t("text")}</span><textarea class="in" id="text">${esc(x.text)}</textarea></label>`, read: el => (val(el, "text") ? { text: val(el, "text"), date: val(el, "date") } : null) }); },
  med(item = { active: true }) { editForm({ title: t("addMed"), col: "meds", item, html: x => `${field("name", t("name"), x.name)}<div class="frow">${field("dose", t("dose"), x.dose)}${field("schedule", t("schedule"), x.schedule)}</div>${field("startDate", t("startDate"), x.startDate || today(), "date")}`, read: el => (val(el, "name") ? { name: val(el, "name"), dose: val(el, "dose"), schedule: val(el, "schedule"), startDate: val(el, "startDate"), active: item.active ?? true } : null) }); },
  visit(item = {}) { editForm({ title: t("addVisit"), col: "visits", item, html: x => `${field("specialty", t("specialty"), x.specialty)}<div class="frow">${field("doctor", t("doctor"), x.doctor)}${field("clinic", t("clinic"), x.clinic)}</div>${field("date", t("date"), x.date || today(), "date")}<label class="f"><span>${t("reason")}</span><textarea class="in" id="reason">${esc(x.reason)}</textarea></label>`, read: el => (val(el, "specialty") || val(el, "reason") ? { specialty: val(el, "specialty"), doctor: val(el, "doctor"), clinic: val(el, "clinic"), date: val(el, "date"), reason: val(el, "reason") } : null) }); }
};

// ——— додавання документа ———
const catSelect = c => `<label class="f"><span>${t("category")}</span><select class="in" id="category">${["lab", "visit", "exam", "other"].map(k => `<option value="${k}" ${c === k ? "selected" : ""}>${t("cat_" + k)}</option>`).join("")}</select></label>`;
function addDoc(existing) {
  const mode = store.data.profile.aiMode, d = existing || {};
  sheet(existing ? t("edit") : t("addDoc"), `
    ${existing ? "" : `<div class="drop"><input type="file" id="file" accept="application/pdf,image/*" class="in"><p class="small">${t("chooseFile")}</p></div>`}
    ${field("title", t("title"), d.title)}${catSelect(d.category || "lab")}<div class="frow">${field("date", t("date"), d.date || "", "date")}${field("clinic", t("clinic"), d.clinic)}</div>
    <div id="busy" class="small hidden"><span class="spin"></span> <span id="busyT"></span></div>
    <div class="btns" style="margin-top:14px"><button class="btn" data-save>${t("save")}</button>
    ${existing && mode === "chatgpt" ? `<button class="btn ghost" data-gpt>${t("importGpt")}</button>` : ""}${delBtn(existing)}</div>`, (el, close) => {
    const busy = (txt) => { el.querySelector("#busy").classList.toggle("hidden", !txt); el.querySelector("#busyT").textContent = txt || ""; el.querySelector("[data-save]").disabled = !!txt; };
    el.querySelector("[data-gpt]")?.addEventListener("click", () => { close(); gptImport(existing); });
    el.querySelector("[data-del]")?.addEventListener("click", () => { if (confirm(t("confirmDelete"))) { store.remove("docs", existing.id); close(); } });
    el.querySelector("[data-save]").onclick = async () => {
      const file = el.querySelector("#file")?.files?.[0];
      const doc = { ...d, title: val(el, "title") || file?.name?.replace(/\.[^.]+$/, "") || "", autoTitle: !val(el, "title"), category: val(el, "category"), date: val(el, "date"), clinic: val(el, "clinic") };
      if (existing) { store.upsert("docs", doc); close(); return; }
      try {
        if (file && store.mode === "google") { busy(t("uploading")); const f = await drive.uploadFile(file); doc.driveFileId = f.id; doc.webViewLink = f.webViewLink; doc.mime = f.mimeType; }
        const saved = store.upsert("docs", doc);
        if (file && mode === "server" && store.mode === "google") {
          busy(t("reading"));
          try { const res = await readWithServer(file, lang()); close(); review(res, saved); }
          catch (e) { close(); toast(e.code === 403 ? t("notAllowed") : t("serverError")); }
        } else if (file && mode === "chatgpt") { close(); gptImport(saved); }
        else { close(); toast(t("added")); }
      } catch (e) { console.error(e); busy(""); if (e.code === 401) { store.setStatus("auth"); toast(t("sessionExpired")); } else toast(t("syncError")); }
    };
  });
}
function gptImport(doc) {
  sheet(t("importGpt"), `<p class="lead">${t("gptStep1")}<br>${t("gptStep2")}<br>${t("gptStep3")}</p>
    ${CONFIG.GPT_URL ? `<a class="btn ghost" href="${esc(CONFIG.GPT_URL)}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none">${t("openGpt")} ↗</a>` : ""}
    <label class="f"><span>${t("paste")}</span><textarea class="in" id="ans" placeholder="{ … }"></textarea></label>
    <div class="btns"><button class="btn" data-go>${t("importBtn")}</button></div>`, (el, close) => {
    el.querySelector("[data-go]").onclick = () => { const r = parseGptAnswer(val(el, "ans")); if (!r) { toast(t("badJson")); return; } close(); review(r, doc); };
  });
}

// Відповідь AI → перевірка користувачем → збереження
function review(res, doc) {
  const labs = (res.labs || []).filter(l => l && (l.name || l.code) && num(l.value) != null);
  const visits = (res.visits || []).filter(v => v && (v.specialty || v.reason));
  const meds = (res.medicines || res.meds || []).filter(m => m && m.name);
  const weight = (res.weight || []).filter(w => w && num(w.kg));
  const dd = res.document || {};
  if (doc) { const upd = {}; if (!doc.date && dd.date) upd.date = dd.date; if ((!doc.title || doc.autoTitle) && dd.title) { upd.title = dd.title; upd.autoTitle = false; } if (!doc.clinic && dd.clinic) upd.clinic = dd.clinic; if (dd.category && ["lab", "visit", "exam", "other"].includes(dd.category)) upd.category = dd.category; if (Object.keys(upd).length) store.upsert("docs", { ...doc, ...upd }); }
  if (!labs.length && !visits.length && !meds.length && !weight.length) { toast(t("nothingFound")); return; }
  const date = x => x.date || dd.date || doc?.date || today();
  const line = (k, i, txt) => `<label class="check"><input type="checkbox" data-k="${k}" data-i="${i}" checked><span>${txt}</span></label>`;
  sheet(t("reviewTitle"), `<p class="lead">${t("reviewLead")}</p>
    ${labs.length ? `<p class="eyebrow">${t("nav_labs")}</p>` + labs.map((l, i) => line("labs", i, `<b>${esc(l.name)}</b> ${l.code ? `<span class="small">${esc(l.code)}</span>` : ""} — <b>${fmtNum(l.value)}</b> ${esc(l.unit || "")} <span class="small">· ${t("norm")} ${esc(refText(l) || "—")} · ${fmtDate(date(l))}</span>`)).join("") : ""}
    ${visits.length ? `<p class="eyebrow" style="margin-top:14px">${t("visits")}</p>` + visits.map((v, i) => line("visits", i, `<b>${esc(v.specialty || "")}</b> ${esc(v.doctor || "")} · ${fmtDate(date(v))}<br><span class="small">${esc(v.reason || "")}</span>`)).join("") : ""}
    ${meds.length ? `<p class="eyebrow" style="margin-top:14px">${t("nav_meds")}</p>` + meds.map((m, i) => line("meds", i, `<b>${esc(m.name)}</b> ${esc([m.dose, m.schedule].filter(Boolean).join(" · "))}`)).join("") : ""}
    ${weight.length ? `<p class="eyebrow" style="margin-top:14px">${t("weight")}</p>` + weight.map((w, i) => line("weight", i, `<b>${fmtNum(w.kg)} ${t("kg")}</b> · ${fmtDate(date(w))}`)).join("") : ""}
    <div class="btns" style="margin-top:14px"><button class="btn" data-save>${t("save")}</button></div>`, (el, close) => {
    el.querySelector("[data-save]").onclick = () => {
      const pick = k => [...el.querySelectorAll(`input[data-k="${k}"]:checked`)].map(c => +c.dataset.i);
      const existing = store.list("labs");
      pick("labs").forEach(i => { const l = labs[i]; const x = { code: (l.code || "").toUpperCase(), name: l.name, value: +l.value, unit: l.unit || "", refLow: num(l.refLow), refHigh: num(l.refHigh), refText: l.refText || "", date: date(l), docId: doc?.id };
        if (!existing.some(e => labKey(e) === labKey(x) && e.date === x.date && +e.value === x.value)) store.upsert("labs", x); });
      pick("visits").forEach(i => { const v = visits[i]; store.upsert("visits", { specialty: v.specialty || "", doctor: v.doctor || "", clinic: v.clinic || dd.clinic || "", reason: v.reason || "", date: date(v), docId: doc?.id }); });
      pick("meds").forEach(i => { const m = meds[i]; if (!store.list("meds").some(e => e.name.toLowerCase() === m.name.toLowerCase() && e.active)) store.upsert("meds", { name: m.name, dose: m.dose || "", schedule: m.schedule || "", startDate: m.startDate || date(m), active: true, docId: doc?.id }); });
      pick("weight").forEach(i => store.upsert("weight", { kg: +weight[i].kg, date: date(weight[i]) }));
      close(); toast(t("added"));
    };
  });
}

// ——— налаштування ———
function settings() {
  const p = store.data.profile;
  sheet(t("settings"), `${field("sName", t("yourName"), p.name)}
    <label class="f"><span>${t("language")}</span><select class="in" id="sLang">${[["uk", "Українська"], ["pl", "Polski"], ["en", "English"]].map(([k, n]) => `<option value="${k}" ${lang() === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
    <p class="eyebrow" style="margin-top:16px">${t("aiMode")}</p><div id="sAi">${aiChoices(p.aiMode)}</div>
    <div class="btns"><button class="btn" data-save>${t("save")}</button></div>
    <p class="eyebrow" style="margin-top:22px">${t("backup")}</p>
    <div class="btns"><button class="btn ghost small" data-export>${t("exportBtn")}</button><label class="btn ghost small">${t("importBackup")}<input type="file" accept="application/json" id="imp" hidden></label></div>
    <p class="eyebrow" style="margin-top:22px">${t("privacy")}</p><p class="small">${t("privacyText")}</p>
    ${store.user?.email ? `<p class="small">${esc(store.user.email)}</p>` : ""}
    <div class="btns" style="margin-top:12px"><button class="btn danger" data-out>${t("signOut")}</button></div>`, (el, close) => {
    let mode = p.aiMode;
    el.querySelector("#sAi").addEventListener("click", e => { const b = e.target.closest("[data-ai]"); if (!b) return; mode = b.dataset.ai; el.querySelectorAll("[data-ai]").forEach(x => x.classList.toggle("on", x === b)); });
    el.querySelector("[data-save]").onclick = () => { if (mode === "server" && p.aiMode !== "server" && !confirm(t("aiServerD"))) return; const l = val(el, "sLang"); localStorage.setItem("health.lang", l); store.setProfile({ name: val(el, "sName") || p.name, lang: l, aiMode: mode, consent: mode === "server" ? true : p.consent }); close(); };
    el.querySelector("[data-export]").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(store.data, null, 2)], { type: "application/json" })); a.download = `health-backup-${today()}.json`; a.click(); };
    el.querySelector("#imp").onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); store.data = merge(store.data, d); store.changed(); close(); toast(t("added")); } catch { toast(t("badJson")); } };
    el.querySelector("[data-out]").onclick = () => { if (store.mode === "google") googleSignOut(); else localStorage.removeItem("health.mode"); store.mode = null; store.data = emptyData(); close(); render(); };
  });
}

// ——— події ———
async function signIn() {
  try {
    await googleSignIn();
    store.data = store.readCache() || emptyData();
    if (!store.data.profile.lang) store.data.profile.lang = lang();
    render(); store.setStatus("saving");
    await store.pull();
  } catch (e) { console.error(e); if (e.code === "config") toast(t("notConfigured")); else if (e.code !== "popup_closed") toast(t("syncError")); render(); }
}

document.addEventListener("click", e => {
  const el = e.target.closest("[data-tab],[data-lang],[data-act],[data-marker],[data-range],[data-seg],[data-ai],[data-toggle-med],[data-edit-lab],[data-edit-bp],[data-edit-weight],[data-edit-note],[data-edit-med],[data-edit-visit],[data-edit-doc]");
  if (!el || el.closest(".sheet")) return;
  const ds = el.dataset;
  if (ds.tab) { e.preventDefault(); ui.tab = ds.tab; render(); scrollTo(0, 0); return; }
  if (ds.lang) { localStorage.setItem("health.lang", ds.lang); if (store.mode && store.data.profile.name) store.setProfile({ lang: ds.lang }); else { store.data.profile.lang = ds.lang; render(); } return; }
  if (ds.marker) { ui.marker = ds.marker; ui.tab = "labs"; render(); return; }
  if (ds.range) { ui.range = ds.range; render(); return; }
  if (ds.seg) { ui.docsSeg = ds.seg; render(); return; }
  if (ds.ai) { ui.obMode = ds.ai; ui.obName = document.getElementById("obName")?.value ?? ui.obName; render(); return; }
  if (ds.toggleMed) { const m = store.list("meds").find(x => x.id === ds.toggleMed); store.upsert("meds", { ...m, active: !m.active, endDate: m.active ? today() : "" }); return; }
  const find = (col, id) => store.list(col).find(x => x.id === id);
  if (ds.editLab) return forms.lab(find("labs", ds.editLab));
  if (ds.editBp) return forms.bp(find("bp", ds.editBp));
  if (ds.editWeight) return forms.weight(find("weight", ds.editWeight));
  if (ds.editNote) return forms.note(find("diary", ds.editNote));
  if (ds.editMed) return forms.med(find("meds", ds.editMed));
  if (ds.editVisit) return forms.visit(find("visits", ds.editVisit));
  if (ds.editDoc) return addDoc(find("docs", ds.editDoc));
  switch (ds.act) {
    case "signin": return signIn();
    case "reconnect": return signIn();
    case "demo": localStorage.setItem("health.mode", "demo"); store.mode = "demo"; store.data = store.readCache() || demoData(lang()); store.writeCache(); render(); return;
    case "settings": return settings();
    case "addDoc": return addDoc();
    case "addLab": return forms.lab({}, ds.key);
    case "addBp": return forms.bp();
    case "addWeight": return forms.weight();
    case "addNote": return forms.note();
    case "addMed": return forms.med();
    case "addVisit": return forms.visit();
    case "confirmMeds": store.setProfile({ medsConfirmedAt: today() }); toast("✓"); return;
    case "obNext": { const n = document.getElementById("obName").value.trim(); if (!n) return; ui.obName = n; ui.obStep = 2; render(); return; }
    case "obDone": store.setProfile({ name: ui.obName, aiMode: ui.obMode, consent: ui.obMode === "server", lang: lang() }); ui.tab = "overview"; return;
  }
});
document.addEventListener("change", e => { if (e.target.id === "obAgree") { ui.obAgree = e.target.checked; render(); } });

// ——— старт ———
(function boot() {
  const m = localStorage.getItem("health.mode");
  if (m === "demo") { store.mode = "demo"; store.data = store.readCache() || demoData(lang()); }
  else if (m === "google") {
    store.mode = "google"; store.user = { email: localStorage.getItem("health.email") || "" };
    store.data = store.readCache() || emptyData(); store.status = "auth"; // потрібен один дотик, щоб знову підключити Drive
  }
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
