import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { Command, Flags } from "@oclif/core";
import { safeExists } from "../../lib/shared/util/fs.js";
import { atomicWriteText, buildResult, jsonDumps } from "../../lib/stream/pipeline-utils.js";

interface StreamRow {
  stream_key: string;
  date: string;
  time: string;
  day: number | null;
  total_words: number;
  duration_sec: number | null;
  pure_fillers: Record<string, number>;
  narration_markers: Record<string, number>;
}

class FillersTimelineError extends Error {
  constructor(
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FillersTimelineError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function findFillersFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      results.push(...findFillersFilesRecursive(fullPath));
    } else if (entry.endsWith("_fillers.json")) {
      results.push(fullPath);
    }
  }
  return results;
}

function numericRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      out[key] = raw;
    }
  }
  return out;
}

function parseStreamRow(fillersFile: string): StreamRow {
  const payload = JSON.parse(readFileSync(fillersFile, "utf8"));
  if (!isRecord(payload)) {
    throw new FillersTimelineError("invalid_fillers_payload", `Fillers payload must be a JSON object: ${fillersFile}`);
  }

  const nameMatch = fillersFile.match(/(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})_fillers\.json$/);
  if (!nameMatch) {
    throw new FillersTimelineError(
      "unexpected_fillers_filename",
      `Fillers filename does not match <date>_<time>_fillers.json: ${fillersFile}`,
    );
  }

  const date = nameMatch[1];
  const time = nameMatch[2].replace(/-/g, ":");
  const streamKey = `${date}_${nameMatch[2]}`;
  const dayMatch = fillersFile.match(/_day-(\d+)\//);
  const day = dayMatch ? Number.parseInt(dayMatch[1], 10) : null;

  const totalWords = typeof payload.total_words === "number" ? payload.total_words : 0;
  const durationSec =
    typeof payload.duration_sec === "number" && Number.isFinite(payload.duration_sec) ? payload.duration_sec : null;

  return {
    stream_key: streamKey,
    date,
    time,
    day,
    total_words: totalWords,
    duration_sec: durationSec,
    pure_fillers: numericRecord(payload.pure_fillers),
    narration_markers: numericRecord(payload.narration_markers),
  };
}

function renderTimelineHtml(rows: StreamRow[]): string {
  const firstDate = rows[0]?.date ?? "";
  const lastDate = rows[rows.length - 1]?.date ?? "";
  const totalWords = rows.reduce((sum, row) => sum + row.total_words, 0);
  const dataJson = JSON.stringify(rows, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Kyle's Filler Words Timeline</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  :root { color-scheme: dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: #0e0e10;
    color: #e4e4e7;
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px 80px;
    line-height: 1.5;
  }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 40px 0 12px; font-weight: 600; color: #a1a1aa; }
  .sub { color: #71717a; margin: 0 0 24px; font-size: 14px; }
  .controls {
    display: flex;
    gap: 24px;
    margin: 16px 0;
    padding: 12px 16px;
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 8px;
    flex-wrap: wrap;
    align-items: center;
    font-size: 14px;
  }
  .controls label { cursor: pointer; }
  .controls input { margin-right: 6px; }
  .chart-wrap {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 8px;
    padding: 16px;
    height: 440px;
    position: relative;
  }
  .chart-wrap.bar { height: 360px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
  th, td { padding: 6px 10px; text-align: right; border-bottom: 1px solid #27272a; }
  th:first-child, td:first-child { text-align: left; }
  th { font-weight: 600; color: #a1a1aa; background: #18181b; position: sticky; top: 0; }
  tr:hover td { background: #1f1f23; }
  .muted { color: #71717a; }
  .summary-wrap { overflow-x: auto; border: 1px solid #27272a; border-radius: 8px; }
</style>
</head>
<body>

<h1>Kyle's Filler Words Timeline</h1>
<p class="sub">${rows.length} streams · ${firstDate} → ${lastDate} · ${totalWords.toLocaleString()} total words analyzed</p>

<div class="controls">
  <strong>Metric:</strong>
  <label><input type="radio" name="metric" value="rate" checked> Per 1,000 words</label>
  <label><input type="radio" name="metric" value="count"> Raw count</label>
  <span class="muted">|</span>
  <strong>Show:</strong>
  <label><input type="checkbox" id="showPure" checked> Pure fillers</label>
  <label><input type="checkbox" id="showNarration"> Narration markers</label>
</div>

<h2>Over time</h2>
<div class="chart-wrap"><canvas id="timeChart"></canvas></div>

<h2>Totals across all streams</h2>
<div class="chart-wrap bar"><canvas id="totalChart"></canvas></div>

<h2>Per-stream stats</h2>
<div class="summary-wrap">
<table>
  <thead>
    <tr>
      <th>Stream</th><th>Day</th><th>Words</th><th>Minutes</th>
      <th>like</th><th>uh</th><th>um</th><th>kind_of</th><th>i_mean</th>
      <th>Pure total</th><th>Per 1K</th>
    </tr>
  </thead>
  <tbody id="summaryBody"></tbody>
</table>
</div>

<script>
const DATA = ${dataJson};

const PURE_KEYS = ["like", "uh", "um", "kind_of", "i_mean", "i_guess", "you_know", "basically", "anyway", "hmm"];
const NARRATION_KEYS = ["so", "just", "okay", "yeah", "actually", "right", "oh", "i_think", "all_right"];

const PALETTE = [
  "#ef4444", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#f43f5e", "#64748b", "#78716c", "#a3a3a3", "#6b7280",
  "#d946ef", "#a855f7", "#7c3aed", "#2563eb", "#0ea5e9",
];

function labels() { return DATA.map(r => r.stream_key); }

function datasetFor(key, source, color) {
  const points = DATA.map(r => {
    const v = r[source][key] ?? 0;
    return { raw: v, rate: r.total_words > 0 ? (v / r.total_words) * 1000 : 0 };
  });
  return { key, source, color, points };
}

const allDatasets = [
  ...PURE_KEYS.map((k, i) => datasetFor(k, "pure_fillers", PALETTE[i])),
  ...NARRATION_KEYS.map((k, i) => datasetFor(k, "narration_markers", PALETTE[i + PURE_KEYS.length])),
];

function currentMetric() {
  return document.querySelector('input[name="metric"]:checked').value;
}
function showPure() { return document.getElementById("showPure").checked; }
function showNarration() { return document.getElementById("showNarration").checked; }

function buildChartDatasets() {
  const metric = currentMetric();
  return allDatasets
    .filter(d => (d.source === "pure_fillers" && showPure()) || (d.source === "narration_markers" && showNarration()))
    .map(d => ({
      label: d.key + (d.source === "narration_markers" ? " (n)" : ""),
      data: d.points.map(p => metric === "rate" ? p.rate : p.raw),
      borderColor: d.color,
      backgroundColor: d.color + "33",
      tension: 0.25,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 1.8,
    }));
}

function buildTotalsDatasets() {
  const metric = currentMetric();
  const totalWords = DATA.reduce((s, r) => s + r.total_words, 0);
  const visible = allDatasets.filter(d =>
    (d.source === "pure_fillers" && showPure()) || (d.source === "narration_markers" && showNarration())
  );
  const totals = visible.map(d => {
    const raw = d.points.reduce((s, p) => s + p.raw, 0);
    return { label: d.key, raw, rate: totalWords > 0 ? (raw / totalWords) * 1000 : 0, color: d.color };
  });
  totals.sort((a, b) => (metric === "rate" ? b.rate - a.rate : b.raw - a.raw));
  return {
    labels: totals.map(t => t.label),
    data: totals.map(t => metric === "rate" ? t.rate : t.raw),
    colors: totals.map(t => t.color),
  };
}

const axisLabel = () => currentMetric() === "rate" ? "count per 1,000 words" : "raw count";

const commonAxes = {
  x: {
    ticks: { color: "#a1a1aa", autoSkip: true, maxTicksLimit: 14, maxRotation: 60, minRotation: 30, font: { size: 10 } },
    grid: { color: "#27272a" },
  },
  y: {
    ticks: { color: "#a1a1aa" },
    grid: { color: "#27272a" },
    title: { display: true, text: axisLabel(), color: "#a1a1aa" },
  },
};

const timeChart = new Chart(document.getElementById("timeChart"), {
  type: "line",
  data: { labels: labels(), datasets: buildChartDatasets() },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "nearest", intersect: false },
    plugins: { legend: { labels: { color: "#e4e4e7", boxWidth: 12, font: { size: 11 } } } },
    scales: commonAxes,
  },
});

let totalsData = buildTotalsDatasets();
const totalChart = new Chart(document.getElementById("totalChart"), {
  type: "bar",
  data: {
    labels: totalsData.labels,
    datasets: [{
      label: "Total",
      data: totalsData.data,
      backgroundColor: totalsData.colors,
      borderWidth: 0,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: "#a1a1aa" },
        grid: { color: "#27272a" },
        title: { display: true, text: axisLabel(), color: "#a1a1aa" },
      },
      y: {
        ticks: { color: "#e4e4e7" },
        grid: { color: "#27272a" },
      },
    },
  },
});

function refreshAll() {
  timeChart.data.datasets = buildChartDatasets();
  timeChart.options.scales.y.title.text = axisLabel();
  timeChart.update();

  const td = buildTotalsDatasets();
  totalChart.data.labels = td.labels;
  totalChart.data.datasets[0].data = td.data;
  totalChart.data.datasets[0].backgroundColor = td.colors;
  totalChart.options.scales.x.title.text = axisLabel();
  totalChart.update();
}

document.querySelectorAll('input[name="metric"]').forEach(el => el.addEventListener("change", refreshAll));
document.getElementById("showPure").addEventListener("change", refreshAll);
document.getElementById("showNarration").addEventListener("change", refreshAll);

const fmt = (n) => n.toLocaleString();
const rateFmt = (n, words) => words > 0 ? ((n / words) * 1000).toFixed(1) : "0.0";
const body = document.getElementById("summaryBody");
DATA.forEach(r => {
  const pureTotal = PURE_KEYS.reduce((s, k) => s + (r.pure_fillers[k] ?? 0), 0);
  const minutes = r.duration_sec ? (r.duration_sec / 60).toFixed(0) : "\u2014";
  const tr = document.createElement("tr");
  tr.innerHTML = \`
    <td>\${r.stream_key}</td>
    <td>\${r.day ?? "\u2014"}</td>
    <td>\${fmt(r.total_words)}</td>
    <td>\${minutes}</td>
    <td>\${fmt(r.pure_fillers.like ?? 0)}</td>
    <td>\${fmt(r.pure_fillers.uh ?? 0)}</td>
    <td>\${fmt(r.pure_fillers.um ?? 0)}</td>
    <td>\${fmt(r.pure_fillers.kind_of ?? 0)}</td>
    <td>\${fmt(r.pure_fillers.i_mean ?? 0)}</td>
    <td><strong>\${fmt(pureTotal)}</strong></td>
    <td>\${rateFmt(pureTotal, r.total_words)}</td>
  \`;
  body.appendChild(tr);
});
</script>

</body>
</html>
`;
}

function buildTimeline(options: { root: string; output: string }): { streams_included: number } {
  if (!safeExists(options.root)) {
    throw new FillersTimelineError("root_not_found", `Stream videos root not found: ${options.root}`);
  }

  const fillersFiles = findFillersFilesRecursive(options.root).sort();
  if (fillersFiles.length === 0) {
    throw new FillersTimelineError("no_fillers_files", `No *_fillers.json files found under: ${options.root}`);
  }

  const rows = fillersFiles.map(parseStreamRow);
  const html = renderTimelineHtml(rows);
  atomicWriteText(options.output, html);

  return { streams_included: rows.length };
}

export default class StreamFillersTimeline extends Command {
  static description = "Regenerate the fillers timeline HTML by aggregating all per-stream fillers JSON files";

  static flags = {
    root: Flags.string({
      required: true,
      description: "Absolute path to the stream-videos root to scan for *_fillers.json",
    }),
    output: Flags.string({
      required: true,
      description: "Absolute path to write the timeline HTML",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(StreamFillersTimeline);
    const root = resolve(flags.root);
    const output = resolve(flags.output);

    try {
      const result = buildTimeline({ root, output });
      process.stdout.write(
        jsonDumps(
          buildResult("success", {
            timeline_file: output,
            streams_included: result.streams_included,
          }),
        ),
      );
    } catch (error) {
      const reason = error instanceof FillersTimelineError ? error.reason : "fillers_timeline_failed";
      const details = error instanceof Error ? error.message : String(error);
      process.stdout.write(
        jsonDumps(
          buildResult("error", {
            reason,
            details,
            timeline_file: output,
          }),
        ),
      );
      this.exit(1);
    }
  }
}
