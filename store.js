// Дані: Google Drive користувача (папка «health.») + локальна копія для швидкості й офлайну.
import { CONFIG } from "./config.js";

const SCOPE = "https://www.googleapis.com/auth/drive.file openid email profile";
const FOLDER = "health.";
const DATA_FILE = "health-data.json";
const COLLECTIONS = ["labs", "visits", "meds", "bp", "weight", "docs", "diary"];

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
export const now = () => new Date().toISOString();

export function emptyData() {
  const d = { version: 1, profile: { name: "", lang: "", extraLangs: [], aiMode: "", consent: false, medsConfirmedAt: "", updatedAt: "" } };
  COLLECTIONS.forEach(c => (d[c] = []));
  return d;
}

// Злиття двох версій (два пристрої): по кожному запису перемагає новіший updatedAt
export function merge(a, b) {
  if (!a) return b; if (!b) return a;
  const out = emptyData();
  out.profile = (a.profile?.updatedAt || "") >= (b.profile?.updatedAt || "") ? { ...b.profile, ...a.profile } : { ...a.profile, ...b.profile };
  for (const c of COLLECTIONS) {
    const map = new Map();
    for (const it of [...(a[c] || []), ...(b[c] || [])]) {
      const prev = map.get(it.id);
      if (!prev || (it.updatedAt || "") > (prev.updatedAt || "")) map.set(it.id, it);
    }
    out[c] = [...map.values()];
  }
  return out;
}

const listeners = new Set();
export const store = {
  mode: null,          // "demo" | "google"
  data: emptyData(),
  user: null,          // {email, name, picture}
  status: "idle",      // idle | saving | saved | error | offline | auth
  token: null, tokenExp: 0,
  folderId: null, fileId: null,
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit() { listeners.forEach(f => f()); },
  setStatus(s) { this.status = s; this.emit(); },
  cacheKey() { return this.mode === "demo" ? "health.demo" : "health.cache." + (this.user?.email || "me"); },
  readCache() { try { return JSON.parse(localStorage.getItem(this.cacheKey()) || "null"); } catch { return null; } },
  writeCache() { try { localStorage.setItem(this.cacheKey(), JSON.stringify(this.data)); } catch {} },

  // ——— зміни даних ———
  upsert(col, item) {
    item.id ||= uid(); item.updatedAt = now();
    const i = this.data[col].findIndex(x => x.id === item.id);
    if (i >= 0) this.data[col][i] = { ...this.data[col][i], ...item }; else this.data[col].push(item);
    this.changed(); return item;
  },
  remove(col, id) {
    const it = this.data[col].find(x => x.id === id);
    if (it) { it.deleted = true; it.updatedAt = now(); this.changed(); }
  },
  setProfile(p) { this.data.profile = { ...this.data.profile, ...p, updatedAt: now() }; this.changed(); },
  list(col) { return this.data[col].filter(x => !x.deleted); },
  changed() { this.writeCache(); this.emit(); this.schedulePush(); },

  // ——— синхронізація ———
  _t: null,
  schedulePush() {
    if (this.mode !== "google") { this.setStatus("saved"); return; }
    clearTimeout(this._t); this.setStatus("saving");
    this._t = setTimeout(() => this.push(), 900);
  },
  async push() {
    if (this.mode !== "google") return;
    if (!navigator.onLine) { this.setStatus("offline"); return; }
    try {
      const remote = await drive.readData();
      this.data = merge(this.data, remote);
      await drive.writeData(this.data);
      this.writeCache(); localStorage.setItem("health.dirty", "");
      this.setStatus("saved");
    } catch (e) {
      console.error(e); store.lastError = String(e.message || e).slice(0, 400);
      localStorage.setItem("health.dirty", "1");
      this.setStatus(e.code === 401 ? "auth" : "error");
      if (e.code !== 401) { clearTimeout(this._t); this._t = setTimeout(() => this.push(), 15000); }
    }
  },
  async pull() {
    const remote = await drive.readData();
    this.data = merge(this.readCache() || emptyData(), remote || emptyData());
    this.writeCache(); this.emit();
    if (!remote || localStorage.getItem("health.dirty")) await this.push(); else this.setStatus("saved");
  }
};
window.addEventListener("online", () => store.mode === "google" && store.push());

// ——— Google: вхід і Drive ———
let gisReady;
function loadGis() {
  gisReady ||= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = res; s.onerror = () => rej(new Error("gis"));
    document.head.appendChild(s);
  });
  return gisReady;
}

let tokenClient, pending;
export async function googleSignIn({ silent = false } = {}) {
  if (!CONFIG.GOOGLE_CLIENT_ID) throw Object.assign(new Error("not configured"), { code: "config" });
  await loadGis();
  tokenClient ||= google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID, scope: SCOPE,
    include_granted_scopes: false, // не підтягувати дозволи інших застосунків цього проєкту (напр. YouTube)
    callback: r => { if (r.error) pending?.rej(r); else pending?.res(r); },
    error_callback: e => pending?.rej(e)
  });
  const r = await new Promise((res, rej) => {
    pending = { res, rej };
    tokenClient.requestAccessToken({ prompt: silent ? "" : "", login_hint: localStorage.getItem("health.email") || undefined });
  });
  store.token = r.access_token; store.tokenExp = Date.now() + (r.expires_in - 60) * 1000;
  const info = await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + store.token } })).json();
  store.user = { email: info.email, name: info.given_name || info.name || "", picture: info.picture };
  localStorage.setItem("health.email", info.email);
  localStorage.setItem("health.mode", "google");
  store.mode = "google";
  return store.user;
}
export function googleSignOut() {
  if (store.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(store.token, () => {});
  ["health.mode", "health.folder", "health.file", "health.named"].forEach(k => localStorage.removeItem(k));
  store.token = null; store.user = null; store.mode = null;
}

async function gfetch(url, opts = {}) {
  if (!store.token || Date.now() > store.tokenExp) throw Object.assign(new Error("auth"), { code: 401 });
  const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: "Bearer " + store.token } });
  if (r.status === 401) throw Object.assign(new Error("auth"), { code: 401 });
  if (!r.ok) throw Object.assign(new Error("drive " + r.status + " " + (await r.text())), { code: r.status });
  return r;
}
const API = "https://www.googleapis.com/drive/v3/files";
const UP = "https://www.googleapis.com/upload/drive/v3/files";

function multipart(meta, blob) {
  const b = "health" + Math.random().toString(36).slice(2);
  const body = new Blob([
    `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`,
    `--${b}\r\nContent-Type: ${blob.type || "application/octet-stream"}\r\n\r\n`, blob, `\r\n--${b}--`
  ]);
  return { body, type: `multipart/related; boundary=${b}` };
}

export const drive = {
  async find(q) {
    const r = await gfetch(`${API}?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive&pageSize=10`);
    return (await r.json()).files || [];
  },
  // Папка на Drive людини: «health. · Ім'я». Шукаємо за міткою застосунку, а старі папки «health.» перейменовуємо.
  folderName() { const n = store.user?.name || (store.user?.email || "").split("@")[0]; return n ? `${FOLDER} · ${n}` : FOLDER; },
  async folder() {
    if (store.folderId) return store.folderId;
    let id = localStorage.getItem("health.folder");
    if (!id) {
      const type = "mimeType='application/vnd.google-apps.folder' and trashed=false";
      let f = await this.find(`appProperties has { key='healthApp' and value='1' } and ${type}`);
      if (!f.length) f = await this.find(`name='${FOLDER}' and ${type}`);
      id = f[0]?.id;
      if (!id) {
        const r = await gfetch(API + "?fields=id", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: this.folderName(), mimeType: "application/vnd.google-apps.folder", appProperties: { healthApp: "1" }, description: "health. — медичні дані / medical records · health.me20.studio" }) });
        id = (await r.json()).id;
      }
      localStorage.setItem("health.folder", id);
    }
    if (!localStorage.getItem("health.named")) { // один раз: додати ім'я в назву папки й мітку застосунку
      await gfetch(`${API}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.folderName(), appProperties: { healthApp: "1" } }) }).then(() => localStorage.setItem("health.named", "1")).catch(() => {});
    }
    return (store.folderId = id);
  },
  async dataFileId() {
    if (store.fileId) return store.fileId;
    const folder = await this.folder();
    const f = await this.find(`name='${DATA_FILE}' and '${folder}' in parents and trashed=false`);
    store.fileId = f[0]?.id || null;
    return store.fileId;
  },
  async readData() {
    const id = await this.dataFileId();
    if (!id) return null;
    const r = await gfetch(`${API}/${id}?alt=media`, { cache: "no-store" });
    return await r.json();
  },
  async writeData(data) {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const id = await this.dataFileId();
    if (id) { await gfetch(`${UP}/${id}?uploadType=media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: blob }); return; }
    const m = multipart({ name: DATA_FILE, parents: [await this.folder()], mimeType: "application/json" }, blob);
    const r = await gfetch(`${UP}?uploadType=multipart&fields=id`, { method: "POST", headers: { "Content-Type": m.type }, body: m.body });
    store.fileId = (await r.json()).id;
  },
  async uploadFile(file, name) {
    const m = multipart({ name: name || file.name, parents: [await this.folder()] }, file);
    const r = await gfetch(`${UP}?uploadType=multipart&fields=id,webViewLink,mimeType`, { method: "POST", headers: { "Content-Type": m.type }, body: m.body });
    return await r.json();
  }
};

// ——— AI від health. (сервер) ———
export async function readWithServer(file, lang) {
  const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.onerror = rej; fr.readAsDataURL(file); });
  const r = await fetch(CONFIG.AI_SERVER_URL.replace(/\/$/, "") + "/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + store.token },
    body: JSON.stringify({ fileName: file.name, mime: file.type || "application/pdf", data, lang })
  });
  if (r.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!r.ok) throw new Error("server " + r.status);
  return await r.json();
}

// Відповідь ChatGPT → об'єкт (шукаємо JSON у тексті)
export function parseGptAnswer(text) {
  const t = String(text || "").replace(/```(json)?/gi, "");
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
}
