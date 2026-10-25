// health. — сервер AI (Cloudflare Worker).
// Що робить: приймає PDF/фото документа, просить OpenAI прочитати показники, повертає JSON.
// Чого НЕ робить: нічого не зберігає (ні файл, ні результат), не пише логи з даними.
//
// Змінні (Cloudflare → Worker → Settings → Variables):
//   OPENAI_API_KEY   — секрет, ваш ключ OpenAI
//   GOOGLE_CLIENT_ID — той самий Client ID, що в config.js застосунку
//   ALLOWED_ORIGIN   — https://health.me20.studio
//   ALLOWED_EMAILS   — email-и через кому, кому дозволено (або * — всім)
//   OPENAI_MODEL     — (необов'язково) модель, за замовчуванням gpt-4.1-mini

const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["document", "labs", "visits", "medicines", "weight"],
  properties: {
    document: { type: "object", additionalProperties: false, required: ["date", "title", "category", "clinic"],
      properties: { date: { type: "string" }, title: { type: "string" }, category: { type: "string", enum: ["lab", "visit", "exam", "other"] }, clinic: { type: "string" } } },
    labs: { type: "array", items: { type: "object", additionalProperties: false, required: ["code", "name", "value", "unit", "refLow", "refHigh", "refText", "date"],
      properties: { code: { type: "string" }, name: { type: "string" }, value: { type: "number" }, unit: { type: "string" }, refLow: { type: ["number", "null"] }, refHigh: { type: ["number", "null"] }, refText: { type: "string" }, date: { type: "string" } } } },
    visits: { type: "array", items: { type: "object", additionalProperties: false, required: ["date", "specialty", "doctor", "clinic", "reason"],
      properties: { date: { type: "string" }, specialty: { type: "string" }, doctor: { type: "string" }, clinic: { type: "string" }, reason: { type: "string" } } } },
    medicines: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "dose", "schedule", "startDate"],
      properties: { name: { type: "string" }, dose: { type: "string" }, schedule: { type: "string" }, startDate: { type: "string" } } } },
    weight: { type: "array", items: { type: "object", additionalProperties: false, required: ["date", "kg"], properties: { date: { type: "string" }, kg: { type: "number" } } } }
  }
};

const LANG = { uk: "Ukrainian", pl: "Polish", en: "English" };
const prompt = lang => `You extract structured data from one medical document (lab report, visit summary, prescription, imaging report, body-composition printout).
Rules:
- Copy values exactly as printed. Never guess, never calculate, never add medical interpretation.
- Dates as YYYY-MM-DD. For lab values use the sample collection date if printed, otherwise the document date.
- labs: one item per numeric result. "code" = short standard code if obvious (HGB, FER, TSH, VITD, LDL, HDL, CHOL, TG, GLU, HBA1C, CRP, ALT, AST, CREA, WBC, RBC, PLT, FT4, FT3, B12, FE), otherwise "". "name" = marker name in ${LANG[lang] || "Ukrainian"}. Use a dot as decimal separator. refLow/refHigh from the printed reference range (null if absent); refText = the range exactly as printed.
- Skip non-numeric results (e.g. "negative") unless they have a number.
- visits: only if the document is a doctor's visit; "reason" = short summary of the reason and the doctor's recommendations as written, in ${LANG[lang] || "Ukrainian"}.
- medicines: only medicines explicitly prescribed or listed as currently taken.
- weight: only if body weight is printed.
- document.title: short human title in ${LANG[lang] || "Ukrainian"}, e.g. "Загальний аналіз крові". document.clinic: clinic or lab name.
- If something is not in the document, return an empty array or empty string.`;

const json = (body, status, origin) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
const cors = origin => ({ "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "86400", Vary: "Origin" });

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
    const ok = allowed.includes(origin) || origin.startsWith("http://localhost");
    const o = ok ? origin : allowed[0] || "";
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(o) });
    const url = new URL(req.url);
    if (url.pathname === "/" ) return json({ ok: true, service: "health. AI" }, 200, o);
    if (url.pathname !== "/parse" || req.method !== "POST") return json({ error: "not found" }, 404, o);
    if (!ok) return json({ error: "origin" }, 403, o);

    // 1. Хто це? Перевіряємо Google-токен користувача
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "auth" }, 401, o);
    const info = await (await fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(token))).json().catch(() => ({}));
    if (!info.email || info.aud !== env.GOOGLE_CLIENT_ID) return json({ error: "auth" }, 401, o);
    const list = (env.ALLOWED_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
    if (!list.includes("*") && !list.includes(info.email.toLowerCase())) return json({ error: "forbidden" }, 403, o);

    // 2. Файл
    let body; try { body = await req.json(); } catch { return json({ error: "bad request" }, 400, o); }
    const { data, mime = "application/pdf", fileName = "document.pdf", lang = "uk" } = body || {};
    if (!data || data.length > 14_000_000) return json({ error: "file too large or empty" }, 413, o);
    const filePart = mime.startsWith("image/")
      ? { type: "input_image", image_url: `data:${mime};base64,${data}` }
      : { type: "input_file", filename: fileName, file_data: `data:${mime};base64,${data}` };

    // 3. OpenAI (store:false — OpenAI не зберігає відповідь для історії)
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4.1-mini",
        store: false,
        instructions: prompt(lang),
        input: [{ role: "user", content: [filePart, { type: "input_text", text: "Extract the data from this document." }] }],
        text: { format: { type: "json_schema", name: "health_document", strict: true, schema: SCHEMA } }
      })
    });
    if (!r.ok) return json({ error: "ai", status: r.status }, 502, o);
    const out = await r.json();
    const text = out.output_text ?? out.output?.flatMap(x => x.content || []).find(c => c.type === "output_text")?.text;
    try { return json(JSON.parse(text), 200, o); } catch { return json({ error: "ai parse" }, 502, o); }
  }
};
