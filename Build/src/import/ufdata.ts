import type { Score, Note } from "../core/types";

interface UfPitch {
  ticks: number[];
  values: (number | null)[];
  isAbsolute: boolean;
}

interface UfTrack {
  name: string;
  notes: { key: number; tickOn: number; tickOff: number; lyric: string; phoneme?: string | null }[];
  pitch?: UfPitch | null;
}

/** UTAU Format Data (UfData) structure, the intermediate representation
 *  produced by utaformatix-ts parsers and consumed by ufDataToScore. */
export interface UfData {
  /** Format version number. */
  formatVersion: number;
  /** Project data containing tracks, tempos, and time signature. */
  project: {
    /** Project name. */
    name: string;
    /** Track list (typically 1 track per voice). */
    tracks: UfTrack[];
    /** Tempo events (ordered by tick). */
    tempos: { tickPosition: number; bpm: number }[];
    /** Measure prefix (leading silence in beats). */
    measurePrefix: number;
  };
}

/** Options for importing a score file. */
export interface ImportOptions {
  /** Index of the track to import (0-based). Default 0. */
  trackIndex?: number;
  /** Whether to import pitch-bend data. Default true. */
  pitch?: boolean;
}

function splitPitchPerNote(notes: Note[], trackPitch: UfPitch): void {
  const { ticks, values, isAbsolute } = trackPitch;
  if (!ticks.length) return;

  for (const note of notes) {
    const noteStart = note.tick!;
    const noteEnd = noteStart + note.length;

    const relTicks: number[] = [];
    const relValues: number[] = [];

    for (let i = 0; i < ticks.length; i++) {
      const t = ticks[i];
      const v = values[i];
      if (v === null) continue;
      if (t >= noteStart && t <= noteEnd) {
        relTicks.push(t - noteStart);
        relValues.push(isAbsolute ? v - note.noteNum : v);
      }
    }

    if (relTicks.length === 0) continue;

    if (relTicks[0] > 0) {
      let valAtStart = 0;
      for (let i = ticks.length - 1; i >= 0; i--) {
        if (ticks[i] <= noteStart && values[i] !== null) {
          valAtStart = isAbsolute ? values[i]! - note.noteNum : values[i]!;
          break;
        }
      }
      relTicks.unshift(0);
      relValues.unshift(valAtStart);
    }

    const last = relTicks[relTicks.length - 1];
    if (last < note.length) {
      relTicks.push(note.length);
      relValues.push(relValues[relValues.length - 1]);
    }

    note.pitchBend = { ticks: relTicks, values: relValues };
  }
}

/** Convert a UfData object (from utaformatix-ts) into a Score suitable for
 *  the renderer. Extracts the specified track, tempos, and (optionally)
 *  pitch-bend data. */
export function ufDataToScore(data: UfData, options: ImportOptions = {}): Score {
  const { trackIndex = 0, pitch = true } = options;
  const project = data.project;
  const track = project.tracks[trackIndex];
  if (!track) throw new Error(`Track ${trackIndex} not found (project has ${project.tracks.length} tracks)`);

  const tempos = project.tempos.map((t) => ({ tick: t.tickPosition, tempo: t.bpm }));
  const resolution = 480;

  if (!tempos.length) tempos.push({ tick: 0, tempo: 120 });

  const notes: Note[] = track.notes.map((n) => ({
    tick: n.tickOn,
    lyric: n.lyric,
    noteNum: n.key,
    length: Math.max(1, n.tickOff - n.tickOn),
  }));

  if (pitch && track.pitch) {
    splitPitchPerNote(notes, track.pitch);
  }

  return { tempos, resolution, notes, voice: track.name };
}

type ParseFn = (data: Uint8Array | File, params?: { pitch?: boolean }) => Promise<UfData>;

const EXT_MAP: Record<string, ParseFn> = {};

async function lazyInit(): Promise<void> {
  if (Object.keys(EXT_MAP).length) return;
  const m = await import("@sevenc-nanashi/utaformatix-ts/base");
  EXT_MAP.ust = m.parseUst as unknown as ParseFn;
  EXT_MAP.ustx = m.parseUstx as unknown as ParseFn;
  EXT_MAP.vpr = m.parseVpr as unknown as ParseFn;
  EXT_MAP.vsqx = m.parseVsqx as unknown as ParseFn;
  EXT_MAP.vsq = m.parseVsq as unknown as ParseFn;
  EXT_MAP.svp = m.parseSvp as unknown as ParseFn;
  EXT_MAP.mid = m.parseStandardMid as unknown as ParseFn;
  EXT_MAP.midi = m.parseStandardMid as unknown as ParseFn;
  EXT_MAP.musicxml = m.parseMusicXml as unknown as ParseFn;
  EXT_MAP.xml = m.parseMusicXml as unknown as ParseFn;
  EXT_MAP.ppsf = m.parsePpsf as unknown as ParseFn;
  EXT_MAP.s5p = m.parseS5p as unknown as ParseFn;
  EXT_MAP.tssln = m.parseTssln as unknown as ParseFn;
  EXT_MAP.ccs = m.parseCcs as unknown as ParseFn;
  EXT_MAP.dv = m.parseDv as unknown as ParseFn;
  EXT_MAP.ufdata = m.parseUfData as unknown as ParseFn;
}

function extFromFile(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return name.toLowerCase();
  return name.slice(dot + 1).toLowerCase();
}

/** Import a score from a File object (e.g. from a file input). Supports
 *  UST, USTX, VPR, VSQX, VSQ, SVP, MIDI, MusicXML, PPSF, S5P, TSSLN, CCS,
 *  DV, and UFData formats via utaformatix-ts (lazily loaded). */
export async function importScoreFromFile(file: File, options: ImportOptions = {}): Promise<Score> {
  const ext = extFromFile(file.name);
  await lazyInit();
  const parseFn = EXT_MAP[ext];
  if (!parseFn) throw new Error(`Unsupported file format: .${ext}`);
  const data = await parseFn(file, { pitch: options.pitch ?? true });
  return ufDataToScore(data, options);
}

/** Import a score from raw bytes. `filename` must include the extension to
 *  determine the format. Same format support as `importScoreFromFile`. */
export async function importScoreFromBytes(buf: Uint8Array, filename: string, options: ImportOptions = {}): Promise<Score> {
  const ext = extFromFile(filename);
  await lazyInit();
  const parseFn = EXT_MAP[ext];
  if (!parseFn) throw new Error(`Unsupported file format: .${ext}`);
  const data = await parseFn(buf, { pitch: options.pitch ?? true });
  return ufDataToScore(data, options);
}
