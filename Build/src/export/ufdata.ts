import type { Score } from "../core/types";

export interface ExportOptions {
  format?: string;
  projectName?: string;
  pitch?: boolean;
}

const FORMAT_GENERATORS: Record<string, string> = {
  ustx: "generateUstx",
  vsqx: "generateVsqx",
  vsq: "generateVsq",
  vpr: "generateVpr",
  svp: "generateSvp",
  s5p: "generateS5p",
  ccs: "generateCcs",
  dv: "generateDv",
  mid: "generateStandardMid",
  midi: "generateStandardMid",
  musicxml: "generateMusicXml",
  xml: "generateMusicXml",
};

/* eslint-disable @typescript-eslint/no-unused-vars */
function buildTrackPitch(notes: Score["notes"], resolution: number): { ticks: number[]; values: number[] } | undefined {
  const totalTicks: number[] = [];
  const totalValues: number[] = [];

  for (const note of notes) {
    if (!note.pitchBend) continue;
    const noteStart = note.tick ?? 0;
    for (let i = 0; i < note.pitchBend.ticks.length; i++) {
      totalTicks.push(noteStart + note.pitchBend.ticks[i]);
      totalValues.push(note.pitchBend.values[i] + note.noteNum);
    }
  }

  if (!totalTicks.length) return undefined;

  const combined = totalTicks.map((t, i) => ({ tick: t, value: totalValues[i] }));
  combined.sort((a, b) => a.tick - b.tick);

  const mergedTicks: number[] = [];
  const mergedValues: number[] = [];
  for (const pt of combined) {
    const last = mergedTicks.length - 1;
    if (last >= 0 && mergedTicks[last] === pt.tick && mergedValues[last] === pt.value) continue;
    mergedTicks.push(pt.tick);
    mergedValues.push(pt.value);
  }

  return { ticks: mergedTicks, values: mergedValues };
}

export function scoreToUfData(score: Score, options: ExportOptions = {}) {
  const { projectName = "Untitled" } = options;

  const trackNotes = score.notes.map((n) => ({
    key: n.noteNum,
    tickOn: n.tick ?? 0,
    tickOff: (n.tick ?? 0) + n.length,
    lyric: n.lyric,
  }));

  const pitch = options.pitch !== false ? buildTrackPitch(score.notes, score.resolution) : undefined;

  const tempos = score.tempos.map((t) => ({
    tickPosition: t.tick,
    bpm: t.tempo,
  }));

  return {
    formatVersion: 1,
    project: {
      name: projectName,
      tracks: [
        {
          name: score.voice ?? "Voice",
          notes: trackNotes,
          ...(pitch ? { pitch: { ticks: pitch.ticks, values: pitch.values, isAbsolute: true } } : {}),
        },
      ],
      timeSignatures: [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos,
      measurePrefix: 0,
    },
  };
}

function serializeUfData(data: unknown): Uint8Array {
  const json = JSON.stringify(data);
  return new TextEncoder().encode(json);
}

let _generators: Record<string, (data: unknown, params?: { pitch?: boolean }) => Promise<Uint8Array>> | null = null;

async function lazyInit(): Promise<void> {
  if (_generators) return;
  const m = await import("@sevenc-nanashi/utaformatix-ts/base");
  const gens: Record<string, (data: unknown, params?: { pitch?: boolean }) => Promise<Uint8Array>> = {};
  for (const [ext, fnName] of Object.entries(FORMAT_GENERATORS)) {
    const fn = (m as Record<string, unknown>)[fnName];
    if (typeof fn === "function") {
      gens[ext] = fn as (data: unknown, params?: { pitch?: boolean }) => Promise<Uint8Array>;
    }
  }
  _generators = gens;
}

export async function exportScoreToBytes(score: Score, options: ExportOptions = {}): Promise<Uint8Array> {
  const fmt = (options.format ?? "ustx").toLowerCase();
  const ufData = scoreToUfData(score, options);

  if (fmt === "ufdata") {
    return serializeUfData(ufData);
  }

  if (!FORMAT_GENERATORS[fmt]) {
    throw new Error(`Unsupported export format: ${fmt}`);
  }

  await lazyInit();
  const gen = _generators?.[fmt];
  if (!gen) throw new Error(`Unsupported export format: ${fmt}`);
  return gen(ufData, { pitch: options.pitch ?? true });
}

export function exportScoreToBlob(score: Score, options: ExportOptions = {}): Promise<Blob> {
  return exportScoreToBytes(score, options).then((bytes) => new Blob([new Uint8Array(bytes)]));
}

export function exportScoreToUrl(score: Score, options: ExportOptions = {}): Promise<string> {
  return exportScoreToBlob(score, options).then((blob) => URL.createObjectURL(blob));
}

export function downloadScore(score: Score, options: ExportOptions = {}): Promise<void> {
  const fmt = options.format ?? "ustx";
  const filename = `${options.projectName ?? "Untitled"}.${fmt}`;
  return exportScoreToUrl(score, options).then((url) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}
