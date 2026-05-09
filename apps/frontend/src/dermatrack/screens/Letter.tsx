import { useMemo, useRef, useState } from "react";
import { MiniBody } from "../body";
import { SCORADChart } from "../charts";
import { fmtDate, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";
import type { DermaTrackData, Lang } from "../data";

function esc(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function localDate(date: Date, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function lineChartSvg(values: number[]) {
  const width = 620;
  const height = 150;
  const pad = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="SCORAD trend">
      <rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="#fafafa" />
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#d8dedc" />
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#d8dedc" />
      <polyline fill="none" stroke="#2f5f4a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      ${values
        .filter((_, index) => index % 5 === 0 || index === values.length - 1)
        .map((value, index) => {
          const realIndex = index === Math.ceil(values.length / 5) ? values.length - 1 : index * 5;
          const x = pad + (realIndex / Math.max(1, values.length - 1)) * (width - pad * 2);
          const y = height - pad - ((values[realIndex] - min) / range) * (height - pad * 2);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#2f5f4a" />`;
        })
        .join("")}
    </svg>`;
}

function generateDoctorLetterHtml(data: DermaTrackData, lang: Lang) {
  const days = data.days.slice(-30);
  const firstDay = days[0]?.date ?? data.TODAY;
  const lastDay = days[days.length - 1]?.date ?? data.TODAY;
  const scorads = days.map((day) => day.scorad);
  const avg = scorads.reduce((sum, value) => sum + value, 0) / Math.max(1, scorads.length);
  const min = Math.min(...scorads);
  const max = Math.max(...scorads);
  const delta = scorads[scorads.length - 1] - scorads[0];
  const regionRows = data.today.regions
    .map((region) => {
      const body = data.BODY_REGIONS.find((item) => item.id === region.regionId);
      return `<li><strong>${esc(body?.[lang] ?? region.regionId)}</strong><span>${esc(region.sev)}/10</span></li>`;
    })
    .join("");
  const symptomRows = [
    ["SCORAD", data.today.scorad.toFixed(1)],
    [lang === "de" ? "Juckreiz" : "Itch", `${data.today.itch}/10`],
    [lang === "de" ? "Schlafverlust" : "Sleep loss", `${data.today.sleepLoss}/10`],
    [lang === "de" ? "Schlafdauer" : "Sleep duration", `${data.today.sleepH.toFixed(1)} h`],
    [lang === "de" ? "Stress" : "Stress", `${data.today.stress}/5`],
  ]
    .map(([label, value]) => `<li><strong>${esc(label)}</strong><span>${esc(value)}</span></li>`)
    .join("");
  const environmentRows = [
    [lang === "de" ? "Temperatur" : "Temperature", `${data.today.tempC.toFixed(1)} °C`],
    [lang === "de" ? "Luftfeuchtigkeit" : "Humidity", `${data.today.humidity}%`],
    [lang === "de" ? "Birkenpollen" : "Birch pollen", `${data.today.birchPollen}/4`],
    [lang === "de" ? "Gräserpollen" : "Grass pollen", `${data.today.grassPollen}/4`],
    [lang === "de" ? "Aktivität" : "Activity", data.today.activity[lang]],
  ]
    .map(([label, value]) => `<li><strong>${esc(label)}</strong><span>${esc(value)}</span></li>`)
    .join("");
  const triggerRows = data.triggers
    .slice(0, 5)
    .map(
      (trigger, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${esc(trigger.label[lang])}</strong><br><span>${esc(trigger.kind)}</span></td>
          <td>~${esc(trigger.lag)} h</td>
          <td>+${esc(trigger.deltaScorad.toFixed(1))}</td>
          <td>${esc(trigger.confidence)}%</td>
        </tr>`
    )
    .join("");
  const treatmentRows = data.treatments
    .slice(0, 4)
    .map((treatment) => {
      const med = data.MEDS.find((item) => item.id === treatment.medId);
      const width = Math.min(48, Math.max(8, Math.abs(treatment.deltaScorad) * 14));
      return `
        <div class="effect-row">
          <strong>${esc(med?.[lang] ?? treatment.medId)}</strong>
          <span>n=${esc(treatment.applications)}</span>
          <div class="effect-track"><i style="width:${width}%;"></i><b></b></div>
          <em>${esc(treatment.deltaScorad.toFixed(1))}</em>
        </div>`;
    })
    .join("");
  const photoRows = days
    .filter((day) => day.hasPhoto)
    .slice(-6)
    .map((day) => {
      const sevHere = (day.regions[0] || { sev: 1 }).sev || 1;
      const hue = 30 + (10 - sevHere) * 4;
      return `<div class="photo-card" style="background: radial-gradient(circle at 34% 36%, oklch(${0.78 - sevHere * 0.012} ${0.06 + sevHere * 0.014} ${hue}), oklch(${0.66 - sevHere * 0.012} ${0.06 + sevHere * 0.014} ${hue + 4}));"><span>${esc(fmtDate(day.date, lang))}</span></div>`;
    })
    .join("");

  const copy =
    lang === "de"
      ? {
          title: "Arztbrief",
          subtitle: "Atopische Dermatitis - strukturierter 30-Tage-Verlauf",
          patient: "Patient",
          period: "Zeitraum",
          generated: "Erstellt",
          summary: "Kurzbefund",
          score: "SCORAD-Verlauf",
          triggers: "Top-Trigger",
          localization: "Aktuelle Lokalisation",
          treatment: "Behandlungswirkung",
          photos: "Foto-Zeitachse",
          symptoms: "Aktuelle Symptome",
          environment: "Umwelt / Kontext",
          note:
            "Dieser Bericht dient der strukturierten Symptom- und Trigger-Dokumentation. Er ersetzt keine aerztliche Diagnostik.",
          intro:
            "In den letzten 30 Tagen wurden Symptome, moegliche Trigger, Umweltfaktoren und Behandlungen protokolliert. Die folgenden Muster koennen im Termin gezielt besprochen werden.",
          noRegions: "Keine aktuelle Lokalisation dokumentiert.",
        }
      : {
          title: "Doctor letter",
          subtitle: "Atopic dermatitis - structured 30-day report",
          patient: "Patient",
          period: "Period",
          generated: "Generated",
          summary: "Clinical summary",
          score: "SCORAD trend",
          triggers: "Top triggers",
          localization: "Current localization",
          treatment: "Treatment effect",
          photos: "Photo timeline",
          symptoms: "Current symptoms",
          environment: "Environment / context",
          note:
            "This report supports structured symptom and trigger documentation. It does not replace medical diagnosis.",
          intro:
            "Symptoms, possible triggers, environmental factors and treatments were tracked over the last 30 days. The following patterns can be reviewed during the appointment.",
          noRegions: "No current localization documented.",
        };

  return `<!doctype html>
  <html lang="${lang}">
    <head>
      <meta charset="utf-8" />
      <title>DermaTrack ${esc(copy.title)} ${esc(localDate(lastDay, lang))}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        html { background: #f3f0ea; }
        body { margin: 0; color: #171d1c; font-family: Inter, Arial, sans-serif; background: #f3f0ea; font-size: 11px; }
        .page { width: 794px; min-height: 1123px; margin: 0 auto; background: #fff; padding: 42px 48px; box-shadow: 0 24px 60px rgba(20,28,40,.18); }
        header { display: grid; grid-template-columns: 1fr auto; gap: 24px; padding-bottom: 16px; border-bottom: 2px solid #171d1c; }
        .eyebrow { color: #788381; font-size: 9px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; }
        h1 { margin: 6px 0 8px; font-size: 22px; line-height: 1.12; letter-spacing: -0.01em; }
        h2 { margin: 0 0 10px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #464c4b; }
        p { margin: 0; line-height: 1.45; }
        .meta { color: #66716f; font-size: 10px; line-height: 1.5; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
        .meta-grid div { border: 1px solid #e4ebe8; border-radius: 8px; padding: 7px 8px; }
        .meta-grid span { display: block; color: #7a8583; font-size: 8px; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 2px; }
        .qr { width: 58px; height: 58px; border: 1px solid #cbd4d1; border-radius: 8px; display: grid; place-items: center; color: #8c9694; font-family: monospace; font-size: 9px; }
        .grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 12px; margin-top: 12px; }
        .card { border: 1px solid #e0e7e4; border-radius: 10px; padding: 12px; break-inside: avoid; background: #fff; }
        .wide { grid-column: 1 / -1; }
        .summary { margin-top: 14px; background: #f7f8f6; border: 1px solid #e3e9e6; border-radius: 12px; padding: 12px; }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 10px; }
        .stat { background: #fff; border-radius: 8px; padding: 8px; border: 1px solid #ebf0ee; }
        .stat strong { display: block; font-size: 16px; }
        .stat span, td span { color: #6f7a78; font-size: 9px; }
        .chart-card { background: #fafafa; border-radius: 10px; padding: 9px; }
        .chart-card svg { width: 100%; height: 126px; display: block; }
        .chart-stats { display: flex; justify-content: space-between; margin-top: 6px; color: #666; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9px; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        td, th { padding: 6px 5px; border-bottom: 1px solid #edf1ef; text-align: left; vertical-align: top; }
        th { color: #66716f; font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; }
        ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
        li { display: flex; justify-content: space-between; gap: 12px; background: #f6f8f7; border-radius: 8px; padding: 7px 8px; font-size: 10px; }
        li span { color: #66716f; }
        .photos { display: grid; grid-template-columns: repeat(6, 1fr); gap: 7px; }
        .photo-card { height: 72px; border-radius: 7px; position: relative; overflow: hidden; }
        .photo-card span { position: absolute; left: 5px; bottom: 5px; border-radius: 5px; background: rgba(63, 39, 22, 0.72); color: #fff; padding: 2px 5px; font-size: 8px; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
        .effect-row { display: grid; grid-template-columns: minmax(0, 1fr) 34px 92px 36px; gap: 8px; align-items: center; font-size: 10px; margin: 7px 0; }
        .effect-row span, .effect-row em { color: #555; font-style: normal; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; text-align: right; }
        .effect-row em { color: #171d1c; font-weight: 800; }
        .effect-track { height: 6px; border-radius: 999px; background: #eceeed; position: relative; overflow: hidden; }
        .effect-track b { position: absolute; left: 50%; top: -2px; width: 1px; height: 10px; background: #8f9895; }
        .effect-track i { position: absolute; right: 50%; top: 0; bottom: 0; border-radius: 999px; background: #2f5f4a; }
        .note { margin-top: 14px; padding-top: 10px; border-top: 1px solid #dce4e1; color: #66716f; font-size: 8px; display: flex; justify-content: space-between; gap: 16px; }
        @media print { body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; } }
      </style>
    </head>
    <body>
      <main class="page">
        <header>
          <div>
            <div class="eyebrow">DermaTrack · ${esc(copy.title)}</div>
            <h1>${esc(copy.subtitle)}</h1>
            <div class="meta">
              ${esc(copy.patient)}: L.K. · *1994<br />
              ${esc(copy.period)}: ${esc(localDate(firstDay, lang))} - ${esc(localDate(lastDay, lang))}<br />
              Recipient: Dr. Lehmann, Praxis Mitte
            </div>
          </div>
          <div class="qr">QR</div>
        </header>

        <section class="summary wide">
          <h2>${esc(copy.summary)}</h2>
          <p>${esc(copy.intro)}</p>
          <div class="stats">
            <div class="stat"><strong>${esc(data.today.scorad.toFixed(1))}</strong><span>SCORAD today</span></div>
            <div class="stat"><strong>${esc(avg.toFixed(1))}</strong><span>30-day average</span></div>
            <div class="stat"><strong>${esc(min.toFixed(1))} / ${esc(max.toFixed(1))}</strong><span>min / max</span></div>
            <div class="stat"><strong>${delta >= 0 ? "+" : ""}${esc(delta.toFixed(1))}</strong><span>30-day delta</span></div>
          </div>
        </section>

        <section class="wide" style="margin-top:12px;">
          <h2>${esc(copy.score)}</h2>
          <div class="chart-card">
            ${lineChartSvg(scorads)}
            <div class="chart-stats">
              <span>ø ${esc(avg.toFixed(1))}</span>
              <span>min ${esc(min.toFixed(1))}</span>
              <span>max ${esc(max.toFixed(1))}</span>
              <span>Δ ${delta >= 0 ? "+" : ""}${esc(delta.toFixed(1))}</span>
            </div>
          </div>
        </section>

        <div class="grid">
          <section class="card">
            <h2>${esc(copy.triggers)}</h2>
            <table>
              <thead><tr><th>#</th><th>Trigger</th><th>Lag</th><th>SCORAD</th><th>Conf.</th></tr></thead>
              <tbody>${triggerRows}</tbody>
            </table>
          </section>

          <section class="card">
            <h2>${esc(copy.localization)}</h2>
            ${regionRows ? `<ul>${regionRows}</ul>` : `<p class="meta">${esc(copy.noRegions)}</p>`}
          </section>

          <section class="card">
            <h2>${esc(copy.symptoms)}</h2>
            <ul>${symptomRows}</ul>
          </section>

          <section class="card">
            <h2>${esc(copy.environment)}</h2>
            <ul>${environmentRows}</ul>
          </section>

          <section class="card wide">
            <h2>${esc(copy.treatment)}</h2>
            ${treatmentRows}
          </section>

          <section class="wide">
            <h2>${esc(copy.photos)}</h2>
            <div class="photos">${photoRows || `<span>No photos</span>`}</div>
          </section>
        </div>

        <footer class="note">
          <span>${esc(copy.note)}</span>
          <span>${esc(copy.generated)} ${esc(localDate(new Date(), lang))} · SHA-256: 4f8a...d3c1</span>
        </footer>
      </main>
    </body>
  </html>`;
}

function generateClinicalDoctorLetterHtml(data: DermaTrackData, lang: Lang) {
  const days = data.days.slice(-30);
  const firstDay = days[0]?.date ?? data.TODAY;
  const lastDay = days[days.length - 1]?.date ?? data.TODAY;
  const scorads = days.map((day) => day.scorad);
  const avg = scorads.reduce((sum, value) => sum + value, 0) / Math.max(1, scorads.length);
  const min = Math.min(...scorads);
  const max = Math.max(...scorads);
  const delta = scorads[scorads.length - 1] - scorads[0];
  const photoDays = days.filter((day) => day.hasPhoto);
  const flareDays = days.filter((day) => day.scorad >= avg + 2 || day.itch >= 7 || day.regions.length > 0);
  const affectedRegions =
    data.today.regions
      .map((region) => {
        const body = data.BODY_REGIONS.find((item) => item.id === region.regionId);
        return `${body?.[lang] ?? region.regionId} (${region.sev}/10)`;
      })
      .join(", ") || (lang === "de" ? "Keine aktuelle Lokalisation dokumentiert" : "No current localization documented");
  const photoDates = photoDays.map((day) => localDate(day.date, lang)).join(", ") || (lang === "de" ? "Keine Fotos dokumentiert" : "No photos documented");
  const highScoreRows = [...days]
    .sort((a, b) => b.scorad - a.scorad)
    .slice(0, 5)
    .map(
      (day) => `
        <tr>
          <td>${esc(localDate(day.date, lang))}</td>
          <td>${esc(day.scorad.toFixed(1))}</td>
          <td>${esc(day.itch)}/10</td>
          <td>${esc(day.sleepH.toFixed(1))} h</td>
          <td>${esc(day.stress)}/5</td>
          <td>${esc(day.foods.map((food) => food[lang]).join(", ") || "-")}</td>
        </tr>`
    )
    .join("");
  const triggerRows = data.triggers
    .slice(0, 5)
    .map(
      (trigger, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${esc(trigger.label[lang])}</td>
          <td>${esc(trigger.kind)}</td>
          <td>~${esc(trigger.lag)} h</td>
          <td>+${esc(trigger.deltaScorad.toFixed(1))}</td>
          <td>${esc(trigger.evidence)}</td>
          <td>${esc(trigger.confidence)}%</td>
        </tr>`
    )
    .join("");
  const treatmentRows = data.treatments
    .slice(0, 4)
    .map((treatment) => {
      const med = data.MEDS.find((item) => item.id === treatment.medId);
      return `
        <tr>
          <td>${esc(med?.[lang] ?? treatment.medId)}</td>
          <td>${esc(med?.kind ?? "-")}</td>
          <td>${esc(treatment.applications)}</td>
          <td>${esc(treatment.daysToOnset)} d</td>
          <td>${esc(treatment.deltaScorad.toFixed(1))}</td>
          <td>${esc(treatment.sideEffects)}</td>
        </tr>`;
    })
    .join("");
  const copy =
    lang === "de"
      ? {
          title: "Arztbrief",
          subtitle: "Atopische Dermatitis - strukturierter 30-Tage-Bericht",
          summary: "Kurzbefund",
          current: "Aktueller Status",
          course: "30-Tage-Verlauf",
          triggers: "Trigger-Hinweise",
          environment: "Umwelt und Kontext",
          treatment: "Behandlung",
          notable: "Tage mit hoechstem Score",
          photos: "Foto-Dokumentation",
          note: "Dieser Bericht dient der strukturierten Symptom- und Trigger-Dokumentation und ersetzt keine aerztliche Diagnostik.",
          intro:
            "Im dokumentierten Zeitraum wurden Symptome, moegliche Trigger, Umweltfaktoren und Behandlungen protokolliert. Die Daten zeigen wiederkehrende Symptomspitzen, die im Termin in Bezug auf Trigger, Schlaf, Stress, Umweltbelastung und Therapieansprechen eingeordnet werden koennen.",
          generated: "Erstellt",
          period: "Zeitraum",
          patient: "Patient",
        }
      : {
          title: "Doctor letter",
          subtitle: "Atopic dermatitis - structured 30-day report",
          summary: "Clinical summary",
          current: "Current status",
          course: "30-day course",
          triggers: "Trigger signals",
          environment: "Environment and context",
          treatment: "Treatment",
          notable: "Highest-score days",
          photos: "Photo documentation",
          note: "This report supports structured symptom and trigger documentation. It does not replace medical diagnosis.",
          intro:
            "Symptoms, possible triggers, environmental factors and treatments were tracked during the reporting period. The data shows recurring symptom peaks that can be reviewed in relation to triggers, sleep, stress, environmental exposure and treatment response.",
          generated: "Generated",
          period: "Period",
          patient: "Patient",
        };

  return `<!doctype html>
  <html lang="${lang}">
    <head>
      <meta charset="utf-8" />
      <title>DermaTrack ${esc(copy.title)} ${esc(localDate(lastDay, lang))}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        html { background: #f5f5f2; }
        body { margin: 0; color: #202423; font-family: Arial, Helvetica, sans-serif; background: #f5f5f2; font-size: 10px; line-height: 1.35; }
        .page { width: 794px; min-height: 1123px; margin: 0 auto; background: #fff; padding: 38px 44px; box-shadow: 0 18px 50px rgba(20,28,40,.14); }
        header { border-bottom: 2px solid #202423; padding-bottom: 12px; margin-bottom: 14px; }
        h1 { margin: 0 0 5px; font-size: 21px; font-weight: 700; letter-spacing: 0; }
        h2 { margin: 14px 0 6px; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #303736; }
        p { margin: 0 0 7px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; }
        th { color: #4f5a58; font-size: 8px; font-weight: 700; text-align: left; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid #9ba5a2; padding: 5px 6px; }
        td { border-bottom: 1px solid #dfe5e3; padding: 5px 6px; vertical-align: top; overflow-wrap: anywhere; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 18px; color: #4f5a58; font-size: 9px; }
        .summary { border-left: 3px solid #3f6a52; padding-left: 10px; margin-bottom: 8px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
        .small { color: #5d6866; font-size: 9px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
        .note { margin-top: 13px; padding-top: 8px; border-top: 1px solid #cbd4d1; color: #5d6866; font-size: 8px; display: flex; justify-content: space-between; gap: 16px; }
        @media print { html, body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; } }
      </style>
    </head>
    <body>
      <main class="page">
        <header>
          <h1>${esc(copy.subtitle)}</h1>
          <div class="meta">
            <div><strong>${esc(copy.patient)}:</strong> L.K. / *1994</div>
            <div><strong>${esc(copy.period)}:</strong> ${esc(localDate(firstDay, lang))} - ${esc(localDate(lastDay, lang))}</div>
            <div><strong>Recipient:</strong> Dr. Lehmann, Praxis Mitte</div>
            <div><strong>${esc(copy.generated)}:</strong> ${esc(localDate(new Date(), lang))}</div>
          </div>
        </header>

        <section class="summary">
          <h2>${esc(copy.summary)}</h2>
          <p>${esc(copy.intro)}</p>
        </section>

        <div class="two-col">
          <section>
            <h2>${esc(copy.current)}</h2>
            <table>
              <tbody>
                <tr><td>SCORAD today</td><td class="mono">${esc(data.today.scorad.toFixed(1))}</td></tr>
                <tr><td>Itch</td><td class="mono">${esc(data.today.itch)}/10</td></tr>
                <tr><td>Sleep loss</td><td class="mono">${esc(data.today.sleepLoss)}/10</td></tr>
                <tr><td>Sleep duration</td><td class="mono">${esc(data.today.sleepH.toFixed(1))} h</td></tr>
                <tr><td>Stress</td><td class="mono">${esc(data.today.stress)}/5</td></tr>
                <tr><td>Affected regions</td><td>${esc(affectedRegions)}</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2>${esc(copy.course)}</h2>
            <table>
              <tbody>
                <tr><td>Average SCORAD</td><td class="mono">${esc(avg.toFixed(1))}</td></tr>
                <tr><td>Minimum / maximum</td><td class="mono">${esc(min.toFixed(1))} / ${esc(max.toFixed(1))}</td></tr>
                <tr><td>Current vs. start</td><td class="mono">${delta >= 0 ? "+" : ""}${esc(delta.toFixed(1))}</td></tr>
                <tr><td>Flagged flare days</td><td class="mono">${esc(flareDays.length)}</td></tr>
                <tr><td>Photo entries</td><td class="mono">${esc(photoDays.length)}</td></tr>
              </tbody>
            </table>
          </section>
        </div>

        <h2>${esc(copy.triggers)}</h2>
        <table>
          <thead><tr><th style="width:24px;">#</th><th>Trigger</th><th>Type</th><th>Lag</th><th>SCORAD assoc.</th><th>Evidence</th><th>Conf.</th></tr></thead>
          <tbody>${triggerRows}</tbody>
        </table>

        <div class="two-col">
          <section>
            <h2>${esc(copy.environment)}</h2>
            <table>
              <tbody>
                <tr><td>Temperature</td><td class="mono">${esc(data.today.tempC.toFixed(1))} C</td></tr>
                <tr><td>Humidity</td><td class="mono">${esc(data.today.humidity)}%</td></tr>
                <tr><td>Birch pollen</td><td class="mono">${esc(data.today.birchPollen)}/4</td></tr>
                <tr><td>Grass pollen</td><td class="mono">${esc(data.today.grassPollen)}/4</td></tr>
                <tr><td>Dust high</td><td>${data.today.dustHigh ? "yes" : "no"}</td></tr>
                <tr><td>Activity / sweat</td><td>${esc(data.today.activity[lang])} / ${esc(data.today.sweat)}/10</td></tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2>${esc(copy.treatment)}</h2>
            <table>
              <thead><tr><th>Medication</th><th>Type</th><th>n</th><th>Onset</th><th>Delta</th><th>Side effects</th></tr></thead>
              <tbody>${treatmentRows}</tbody>
            </table>
          </section>
        </div>

        <h2>${esc(copy.notable)}</h2>
        <table>
          <thead><tr><th>Date</th><th>SCORAD</th><th>Itch</th><th>Sleep</th><th>Stress</th><th>Logged foods</th></tr></thead>
          <tbody>${highScoreRows}</tbody>
        </table>

        <h2>${esc(copy.photos)}</h2>
        <p class="small">Photo entries: ${esc(photoDays.length)}. Dates: ${esc(photoDates)}.</p>

        <footer class="note">
          <span>${esc(copy.note)}</span>
          <span>DermaTrack / SHA-256: 4f8a...d3c1</span>
        </footer>
      </main>
    </body>
  </html>`;
}

function printDoctorLetterFrame(frame: HTMLIFrameElement | null) {
  if (!frame?.contentWindow) return;
  frame.contentWindow.focus();
  frame.contentWindow.print();
}

export function Letter({ data, lang }: ScreenProps) {
  const t = useT(lang);
  const [sent, setSent] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportFrameRef = useRef<HTMLIFrameElement | null>(null);
  const exportHtml = useMemo(() => generateClinicalDoctorLetterHtml(data, lang), [data, lang]);

  const includes = [
    {
      Icon: Icon.chart,
      label: lang === "de" ? "SCORAD-Verlauf · 30 Tage" : "30-day SCORAD trend",
      detail: "30 " + t("tage"),
    },
    { Icon: Icon.sparkle, label: t("top_trigger"), detail: "5" },
    { Icon: Icon.camera, label: t("foto_zeitachse"), detail: "6" },
    { Icon: Icon.pill, label: t("effektivität"), detail: "5" },
    {
      Icon: Icon.body,
      label: lang === "de" ? "Lokalisationskarte" : "Body distribution map",
      detail: "14",
    },
  ];

  return (
    <>
    <div className="main-inner">
      <PageHead
        kicker={lang === "de" ? "Export · DiGA-konform · TI-Messenger" : "Export · DiGA-ready · TI-Messenger"}
        title={t("arztbrief")}
        sub={
          lang === "de"
            ? "Strukturierter 30-Tage-Bericht für deine Praxis: SCORAD-Verlauf, Top-Trigger, Foto-Zeitachse und Behandlungswirkung — digital signiert."
            : "Structured 30-day report for your clinic: SCORAD trend, top triggers, photo timeline and treatment effect — digitally signed."
        }
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" size="md" icon={<Icon.download size={14} />} onClick={() => setExportOpen(true)}>
              PDF
            </Btn>
            <Btn
              kind="primary"
              size="md"
              icon={<Icon.share size={14} color="var(--bg)" />}
              onClick={() => {
                setSent(true);
                setTimeout(() => setSent(false), 2400);
              }}
            >
              {t("teilen")}
            </Btn>
          </div>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div>
          <div
            className="card-head"
            style={{ background: "transparent", border: "none", padding: "0 4px 10px" }}
          >
            <h3>{t("pdf_vorschau")}</h3>
            <span className="head-sub">A4 · 1 / 3</span>
          </div>
          <div
            style={{
              background: "#fff",
              color: "#1a1a1a",
              border: "1px solid var(--line)",
              borderRadius: 12,
              boxShadow: "0 24px 48px -16px rgba(20,28,40,0.18)",
              padding: 36,
              position: "relative",
              fontFamily: "var(--font-sans)",
              maxWidth: 720,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 18,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "oklch(0.55 0.10 155)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#666",
                    }}
                  >
                    DermaTrack · {t("bericht")}
                  </span>
                </div>
                <div
                  className="serif"
                  style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1, fontStyle: "normal" }}
                >
                  Atopische Dermatitis · 30-Tage-Verlauf
                </div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 8, fontFamily: "var(--font-mono)" }}>
                  {lang === "de" ? "Patient" : "Patient"}: L.K. · *1994 · {t("arzt_zeitraum")} 10.04. – 09.05.2026 ·{" "}
                  {lang === "de" ? "an" : "to"}: Dr. Lehmann, Praxis Mitte
                </div>
              </div>
              <div
                style={{
                  width: 64,
                  height: 64,
                  border: "1.5px solid #ddd",
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 9,
                  color: "#aaa",
                  fontFamily: "var(--font-mono)",
                }}
              >
                QR
              </div>
            </div>
            <div style={{ height: 1, background: "#222", marginBottom: 18 }} />

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  color: "#444",
                  marginBottom: 8,
                }}
              >
                {t("score_fortschritt")}
              </div>
              <div style={{ background: "#fafafa", borderRadius: 8, padding: 10 }}>
                <SCORADChart days={data.days} height={150} width={620} highlightToday={false} />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "#666",
                  marginTop: 6,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span>⌀ 22.4</span>
                <span>min 14.6</span>
                <span>max 31.2</span>
                <span>Δ −4.1</span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 180px",
                gap: 24,
                marginBottom: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.10em",
                    color: "#444",
                    marginBottom: 8,
                  }}
                >
                  {t("top_trigger")}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {data.triggers.slice(0, 5).map((tr, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                      <span style={{ width: 14, fontFamily: "var(--font-mono)", fontSize: 10, color: "#888" }}>
                        {i + 1}.
                      </span>
                      <span style={{ flex: 1, fontWeight: 600 }}>{tr.label[lang]}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#666", fontSize: 11 }}>
                        ~{tr.lag}h
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#666", fontSize: 11 }}>
                        +{tr.deltaScorad.toFixed(1)}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11 }}>
                        {tr.confidence}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.10em",
                    color: "#444",
                    marginBottom: 8,
                  }}
                >
                  {lang === "de" ? "Lokalisation" : "Body"}
                </div>
                <div
                  style={{
                    background: "#fafafa",
                    borderRadius: 8,
                    height: 180,
                    padding: 4,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <MiniBody side="front" regions={data.today.regions} size={100} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  color: "#444",
                  marginBottom: 8,
                }}
              >
                {t("foto_zeitachse")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                {data.days
                  .filter((d) => d.hasPhoto)
                  .slice(-6)
                  .map((p, i) => {
                    const sevHere = (p.regions[0] || { sev: 1 }).sev || 1;
                    const hue = 30 + (10 - sevHere) * 4;
                    return (
                      <div
                        key={i}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 6,
                          position: "relative",
                          background: `radial-gradient(circle at 35% 40%, oklch(${
                            0.78 - sevHere * 0.012
                          } ${0.06 + sevHere * 0.014} ${hue}), oklch(${0.66 - sevHere * 0.012} ${
                            0.06 + sevHere * 0.014
                          } ${hue + 4}))`,
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            bottom: 3,
                            left: 3,
                            fontSize: 8,
                            color: "#fff",
                            fontFamily: "var(--font-mono)",
                            background: "rgba(0,0,0,0.4)",
                            padding: "1px 4px",
                            borderRadius: 3,
                          }}
                        >
                          {fmtDate(p.date, lang)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  color: "#444",
                  marginBottom: 8,
                }}
              >
                {t("effektivität")}
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {data.treatments.slice(0, 4).map((tre, i) => {
                  const med = data.MEDS.find((m) => m.id === tre.medId);
                  if (!med) return null;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                      <span style={{ flex: 1, fontWeight: 600 }}>{med[lang]}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "#666", fontSize: 11 }}>
                        n={tre.applications}
                      </span>
                      <div
                        style={{
                          width: 100,
                          height: 6,
                          background: "#eee",
                          borderRadius: 3,
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            right: "50%",
                            top: 0,
                            bottom: 0,
                            width: `${Math.min(50, (Math.abs(tre.deltaScorad / 4) * 100) / 2)}%`,
                            background: "#2c5d52",
                            borderRadius: 3,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            top: -1,
                            bottom: -1,
                            width: 1,
                            background: "#999",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          fontSize: 11,
                          width: 40,
                          textAlign: "right",
                        }}
                      >
                        {tre.deltaScorad.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                paddingTop: 12,
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#999",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span>
                DermaTrack v0.4.2 · {lang === "de" ? "erstellt" : "generated"} 09.05.2026
              </span>
              <span>SHA-256: 4f8a…d3c1</span>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gap: 16, alignContent: "start" }}>
          <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--bg-2)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ink-2)",
              }}
            >
              DL
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Dr. Lehmann</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)" }}>Praxis Mitte · Berlin</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                {lang === "de" ? "Termin" : "Appt"} 14.05.
              </div>
            </div>
            <span className="pill sage">
              <Icon.check size={11} /> {t("diga")}
            </span>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>{t("enthält")}</h3>
              <span className="head-sub">5</span>
            </div>
            {includes.map((row, i) => (
              <div
                key={i}
                className="row"
                style={{ gridTemplateColumns: "20px 1fr 50px 18px", padding: "10px 14px" }}
              >
                <row.Icon size={16} color="var(--ink-2)" />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{row.label}</span>
                <span className="num" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>
                  {row.detail}
                </span>
                <Icon.check size={14} color="var(--sage-d)" />
              </div>
            ))}
          </div>

          {sent && (
            <div
              className="card card-pad"
              style={{
                background: "color-mix(in oklch, var(--sage) 18%, var(--card))",
                color: "var(--sage-d)",
                textAlign: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {t("versendet")}
            </div>
          )}

          <div
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {t("digital_signiert")}
            <br />
            {t("sicher_übertragen")}
          </div>
        </div>
      </div>
    </div>
    {exportOpen && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={lang === "de" ? "PDF Export" : "PDF export"}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(22, 28, 27, 0.48)",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: "14px 18px",
            background: "var(--card)",
            borderBottom: "1px solid var(--line)",
            boxShadow: "0 12px 30px rgba(20, 28, 40, 0.12)",
          }}
        >
          <div>
            <div className="stat-label">{lang === "de" ? "Export preview" : "Export preview"}</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{t("arztbrief")} · A4</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" size="md" onClick={() => setExportOpen(false)}>
              {lang === "de" ? "Schliessen" : "Close"}
            </Btn>
            <Btn kind="sage" size="md" icon={<Icon.download size={14} />} onClick={() => printDoctorLetterFrame(exportFrameRef.current)}>
              {lang === "de" ? "PDF exportieren" : "Export PDF"}
            </Btn>
          </div>
        </div>
        <div
          style={{
            minHeight: 0,
            overflow: "auto",
            padding: 24,
            display: "grid",
            placeItems: "start center",
          }}
        >
          <div
            style={{
              width: "min(920px, 100%)",
              height: "calc(100vh - 126px)",
              minHeight: 680,
              borderRadius: 16,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 28px 70px rgba(20, 28, 40, 0.28)",
              border: "1px solid color-mix(in oklch, var(--line) 70%, transparent)",
            }}
          >
            <iframe
              ref={exportFrameRef}
              title={lang === "de" ? "Arztbrief PDF Vorschau" : "Doctor letter PDF preview"}
              srcDoc={exportHtml}
              style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
