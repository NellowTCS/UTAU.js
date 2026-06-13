import type { AudioChunk } from "../core/types"

export type PlayerState = "idle" | "playing" | "paused"

export type PlayerEvent = {
  type: "stateChange"; state: PlayerState
} | {
  type: "progress"; renderedSamples: number; totalSamples: number
} | {
  type: "done"
} | {
  type: "error"; error: Error
}

export class StreamPlayer {
  private ctx: AudioContext | null = null
  private state: PlayerState = "idle"
  private listeners: Array<(event: PlayerEvent) => void> = []
  private startTime = 0
  private abortController: AbortController | null = null
  private gainNode: GainNode | null = null
  private totalSamplesScheduled = 0

  get currentState(): PlayerState { return this.state }

  on(cb: (event: PlayerEvent) => void): () => void {
    this.listeners.push(cb)
    return () => { this.listeners = this.listeners.filter((l) => l !== cb) }
  }

  private emit(event: PlayerEvent): void {
    for (const cb of this.listeners) { try { cb(event) } catch { /* noop */ } }
  }

  async play(stream: AsyncGenerator<AudioChunk>): Promise<void> {
    this.stop()
    this.ctx = new AudioContext()
    this.gainNode = this.ctx.createGain()
    this.gainNode.connect(this.ctx.destination)
    this.gainNode.gain.value = 0.8
    this.abortController = new AbortController()
    this.state = "playing"
    this.startTime = this.ctx.currentTime
    this.emit({ type: "stateChange", state: "playing" })
    const signal = this.abortController.signal
    let totalSamplesScheduled = 0

    try {
      for await (const chunk of stream) {
        if (signal.aborted) break
        const sr = chunk.sampleRate
        const startSec = chunk.startSample / sr
        const t = this.startTime + startSec
        for (let c = 0; c < chunk.data.length; c++) {
          const buf = this.ctx.createBuffer(1, chunk.data[c].length, sr)
          buf.copyToChannel(chunk.data[c] as Float32Array<ArrayBuffer>, 0)
          const src = this.ctx.createBufferSource()
          src.buffer = buf; src.connect(this.gainNode!); src.start(t)
        }
        totalSamplesScheduled = Math.max(totalSamplesScheduled, chunk.startSample + chunk.data[0].length)
      }
      if (!signal.aborted) { this.state = "idle"; this.emit({ type: "done" }); this.emit({ type: "stateChange", state: "idle" }) }
    } catch (err) {
      this.state = "idle"
      this.emit({ type: "error", error: err instanceof Error ? err : new Error(String(err)) })
      this.emit({ type: "stateChange", state: "idle" })
    }
  }

  pause(): void { if (this.state !== "playing" || !this.ctx) return; this.ctx.suspend(); this.state = "paused"; this.emit({ type: "stateChange", state: "paused" }) }
  resume(): void { if (this.state !== "paused" || !this.ctx) return; this.ctx.resume(); this.state = "playing"; this.emit({ type: "stateChange", state: "playing" }) }

  stop(): void {
    this.abortController?.abort(); this.abortController = null
    if (this.ctx && this.ctx.state !== "closed") this.ctx.close().catch(() => {})
    this.ctx = null; this.gainNode = null; this.state = "idle"
    this.emit({ type: "stateChange", state: "idle" })
  }
}
