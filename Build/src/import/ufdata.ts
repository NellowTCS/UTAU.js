import type { Score, Note } from "../core/types"

interface UfPitch {
  ticks: number[]
  values: (number | null)[]
  isAbsolute: boolean
}

interface UfTrack {
  name: string
  notes: { key: number; tickOn: number; tickOff: number; lyric: string; phoneme?: string | null }[]
  pitch?: UfPitch | null
}

export interface UfData {
  formatVersion: number
  project: {
    name: string
    tracks: UfTrack[]
    tempos: { tickPosition: number; bpm: number }[]
    measurePrefix: number
  }
}

export interface ImportOptions {
  trackIndex?: number
  pitch?: boolean
}

function splitPitchPerNote(notes: Note[], trackPitch: UfPitch): void {
  const { ticks, values, isAbsolute } = trackPitch
  if (!ticks.length) return

  for (const note of notes) {
    const noteStart = note.tick!
    const noteEnd = noteStart + note.length

    const relTicks: number[] = []
    const relValues: number[] = []

    for (let i = 0; i < ticks.length; i++) {
      const t = ticks[i]
      const v = values[i]
      if (v === null) continue
      if (t >= noteStart && t <= noteEnd) {
        relTicks.push(t - noteStart)
        relValues.push(isAbsolute ? v - note.noteNum : v)
      }
    }

    if (relTicks.length === 0) continue

    if (relTicks[0] > 0) {
      let valAtStart = 0
      for (let i = ticks.length - 1; i >= 0; i--) {
        if (ticks[i] <= noteStart && values[i] !== null) {
          valAtStart = isAbsolute ? values[i]! - note.noteNum : values[i]!
          break
        }
      }
      relTicks.unshift(0)
      relValues.unshift(valAtStart)
    }

    const last = relTicks[relTicks.length - 1]
    if (last < note.length) {
      relTicks.push(note.length)
      relValues.push(relValues[relValues.length - 1])
    }

    note.pitchBend = { ticks: relTicks, values: relValues }
  }
}

export function ufDataToScore(data: UfData, options: ImportOptions = {}): Score {
  const { trackIndex = 0, pitch = true } = options
  const project = data.project
  const track = project.tracks[trackIndex]
  if (!track) throw new Error(`Track ${trackIndex} not found (project has ${project.tracks.length} tracks)`)

  const tempos = project.tempos.map((t) => ({ tick: t.tickPosition, tempo: t.bpm }))
  const resolution = 480

  if (!tempos.length) tempos.push({ tick: 0, tempo: 120 })

  const notes: Note[] = track.notes.map((n) => ({
    tick: n.tickOn,
    lyric: n.lyric,
    noteNum: n.key,
    length: Math.max(1, n.tickOff - n.tickOn),
  }))

  if (pitch && track.pitch) {
    splitPitchPerNote(notes, track.pitch)
  }

  return { tempos, resolution, notes, voice: track.name }
}

const EXT_MAP: Record<string, Function> = {}

async function lazyInit(): Promise<void> {
  if (Object.keys(EXT_MAP).length) return
  const m = await import("@sevenc-nanashi/utaformatix-ts/base")
  EXT_MAP.ust = m.parseUst as Function
  EXT_MAP.ustx = m.parseUstx as Function
  EXT_MAP.vpr = m.parseVpr as Function
  EXT_MAP.vsqx = m.parseVsqx as Function
  EXT_MAP.vsq = m.parseVsq as Function
  EXT_MAP.svp = m.parseSvp as Function
  EXT_MAP.mid = m.parseStandardMid as Function
  EXT_MAP.midi = m.parseStandardMid as Function
  EXT_MAP.musicxml = m.parseMusicXml as Function
  EXT_MAP.xml = m.parseMusicXml as Function
  EXT_MAP.ppsf = m.parsePpsf as Function
  EXT_MAP.s5p = m.parseS5p as Function
  EXT_MAP.tssln = m.parseTssln as Function
  EXT_MAP.ccs = m.parseCcs as Function
  EXT_MAP.dv = m.parseDv as Function
  EXT_MAP.ufdata = m.parseUfData as Function
}

function extFromFile(name: string): string {
  const dot = name.lastIndexOf(".")
  if (dot < 0) return name.toLowerCase()
  return name.slice(dot + 1).toLowerCase()
}

export async function importScoreFromFile(file: File, options: ImportOptions = {}): Promise<Score> {
  const ext = extFromFile(file.name)
  await lazyInit()
  const parseFn = EXT_MAP[ext] as (data: Uint8Array | File, params?: { pitch?: boolean }) => Promise<UfData>
  if (!parseFn) throw new Error(`Unsupported file format: .${ext}`)
  const data = await parseFn(file, { pitch: options.pitch ?? true })
  return ufDataToScore(data, options)
}

export async function importScoreFromBytes(buf: Uint8Array, filename: string, options: ImportOptions = {}): Promise<Score> {
  const ext = extFromFile(filename)
  await lazyInit()
  const parseFn = EXT_MAP[ext] as (data: Uint8Array | File, params?: { pitch?: boolean }) => Promise<UfData>
  if (!parseFn) throw new Error(`Unsupported file format: .${ext}`)
  const data = await parseFn(buf, { pitch: options.pitch ?? true })
  return ufDataToScore(data, options)
}
