// Демо-дані (вигадані) — щоб показати застосунок без входу
import { emptyData, uid } from "./store.js";

export function demoData(lang) {
  const d = emptyData();
  const t = "2026-01-01T00:00:00.000Z";
  const L = (code, name, unit, lo, hi, pts) => pts.forEach(([date, v]) => d.labs.push({ id: uid(), code, name, unit, refLow: lo, refHigh: hi, value: v, date, updatedAt: t }));
  const ua = lang !== "en" && lang !== "pl";
  L("HGB", ua ? "Гемоглобін" : lang === "pl" ? "Hemoglobina" : "Haemoglobin", "г/л", 120, 155, [["2022-03-10", 128], ["2023-02-14", 133], ["2024-01-20", 137], ["2025-01-15", 139], ["2025-09-02", 140], ["2026-06-05", 141]]);
  L("FER", ua ? "Феритин" : lang === "pl" ? "Ferrytyna" : "Ferritin", "нг/мл", 15, 150, [["2023-02-14", 22], ["2024-01-20", 31], ["2025-01-15", 40], ["2026-06-05", 48]]);
  L("TSH", ua ? "ТТГ" : "TSH", "мМО/л", 0.4, 4.0, [["2024-01-20", 3.1], ["2025-01-15", 2.6], ["2026-06-05", 2.9]]);
  L("VITD", ua ? "Вітамін D · 25(OH)D" : lang === "pl" ? "Witamina D · 25(OH)D" : "Vitamin D · 25(OH)D", "нг/мл", 30, 50, [["2025-01-15", 19], ["2026-06-05", 24]]);
  L("LDL", ua ? "ЛПНЩ-холестерин" : lang === "pl" ? "Cholesterol LDL" : "LDL cholesterol", "ммоль/л", null, 3.0, [["2025-01-15", 3.1], ["2026-06-05", 3.4]]);
  L("GLU", ua ? "Глюкоза" : lang === "pl" ? "Glukoza" : "Glucose", "ммоль/л", 3.9, 5.6, [["2025-01-15", 5.0], ["2026-06-05", 4.8]]);

  const doc = (date, title, category, clinic) => { const x = { id: uid(), date, title, category, clinic, updatedAt: t }; d.docs.push(x); return x.id; };
  const tx = ua ? {
    blood: "Загальний аналіз крові", us: "УЗД щитоподібної залози", card: "Консультація кардіолога", pr: "Продовження рецепта", c1: "Лабораторія «Здоров'я»", c2: "Клініка Медком",
    v1: ["Кардіолог", "Лікарка Новак", "Перевірка тиску, порада вести щоденник"], v2: ["Ендокринолог", "Лікар Ковальчук", "Контроль ТТГ, дозу не змінювати"], v3: ["Сімейний лікар", "", "Продовження рецепта"],
    m: [["Левотироксин", "50 мкг", "1 раз на день"], ["Вітамін D3", "2000 МО", "1 раз на день"], ["Магній", "375 мг", "ввечері"], ["Омега-3", "1000 мг", "1 раз на день"]],
    note: "Добре спала, пішки до роботи."
  } : lang === "pl" ? {
    blood: "Morfologia krwi", us: "USG tarczycy", card: "Konsultacja kardiologiczna", pr: "Przedłużenie recepty", c1: "Laboratorium Zdrowie", c2: "Klinika Medkom",
    v1: ["Kardiolog", "Dr Nowak", "Kontrola ciśnienia, prowadzić dziennik"], v2: ["Endokrynolog", "Dr Kowalczyk", "Kontrola TSH, dawka bez zmian"], v3: ["Lekarz rodzinny", "", "Przedłużenie recepty"],
    m: [["Lewotyroksyna", "50 mcg", "raz dziennie"], ["Witamina D3", "2000 IU", "raz dziennie"], ["Magnez", "375 mg", "wieczorem"], ["Omega-3", "1000 mg", "raz dziennie"]],
    note: "Dobrze spałam, pieszo do pracy."
  } : {
    blood: "Complete blood count", us: "Thyroid ultrasound", card: "Cardiology consultation", pr: "Prescription renewal", c1: "Health Lab", c2: "Medcom Clinic",
    v1: ["Cardiologist", "Dr Nowak", "Blood pressure check, keep a diary"], v2: ["Endocrinologist", "Dr Kowalczyk", "TSH check, dose unchanged"], v3: ["Family doctor", "", "Prescription renewal"],
    m: [["Levothyroxine", "50 mcg", "once a day"], ["Vitamin D3", "2000 IU", "once a day"], ["Magnesium", "375 mg", "evening"], ["Omega-3", "1000 mg", "once a day"]],
    note: "Slept well, walked to work."
  };
  doc("2026-06-05", tx.blood, "lab", tx.c1);
  doc("2026-04-28", tx.us, "exam", tx.c2);
  doc("2026-03-03", tx.card, "visit", tx.c2);
  doc("2026-02-21", tx.pr, "visit", tx.c2);
  [["2026-03-03", ...tx.v1], ["2026-01-12", ...tx.v2], ["2026-02-21", ...tx.v3]].forEach(([date, specialty, doctor, reason]) => d.visits.push({ id: uid(), date, specialty, doctor, reason, clinic: tx.c2, updatedAt: t }));
  tx.m.forEach(([name, dose, schedule]) => d.meds.push({ id: uid(), name, dose, schedule, active: true, startDate: "2026-01-12", updatedAt: t }));
  const today = new Date();
  [[121, 79, 68], [118, 76, 64], [124, 80, 70], [119, 77, 66], [122, 78, 69], [117, 75, 63], [118, 76, 65]].forEach(([s, di, p], i) => {
    const x = new Date(today); x.setDate(today.getDate() - (6 - i)); x.setHours(8, 30, 0, 0);
    d.bp.push({ id: uid(), date: x.toISOString(), sys: s, dia: di, pulse: p, updatedAt: t });
  });
  [["2026-03-03", 79.6], ["2026-04-02", 78.9], ["2026-05-04", 78.1], ["2026-06-03", 77.5], ["2026-07-05", 77.2], ["2026-08-04", 76.8]].forEach(([date, kg]) => d.weight.push({ id: uid(), date, kg, updatedAt: t }));
  d.diary.push({ id: uid(), date: today.toISOString().slice(0, 10), text: tx.note, updatedAt: t });
  d.profile = { name: ua ? "Анно" : "Anna", lang, aiMode: "chatgpt", consent: true, medsConfirmedAt: "", updatedAt: t };
  return d;
}
