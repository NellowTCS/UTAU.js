import type { AudioChunk } from "../core/types";

export type PlayerState = "idle" | "playing" | "paused";

export type PlayerEvent =
  | {
      type: "stateChange";
      state: PlayerState;
    }
  | {
      type: "progress";
      renderedSamples: number;
      totalSamples: number;
      bufferAhead: number;
    }
  | {
      type: "done";
    }
  | {
      type: "bufferUnderrun";
      bufferAhead: number;
    }
  | {
      type: "error";
      error: Error;
    };

export interface PlayOptions {
  volume?: number;
  sampleRate?: number;
  /** Seconds of audio to pre-buffer before starting playback. Default 0.5. */
  preBufferThreshold?: number;
}

export class StreamPlayer {
  private ctx: AudioContext | null = null;
  private state: PlayerState = "idle";
  private listeners: Array<(event: PlayerEvent) => void> = [];
  private startTime = 0;
  private abortController: AbortController | null = null;
  private gainNode: GainNode | null = null;
  private totalSamplesScheduled = 0;
  private totalDurationSec = 0;
  private preBufferThreshold = 0.5;
  private underrunEmitted = false;

  setVolume(v: number): void {
    if (this.gainNode) this.gainNode.gain.value = v;
  }

  get currentState(): PlayerState {
    return this.state;
  }

  on(cb: (event: PlayerEvent) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private emit(event: PlayerEvent): void {
    for (const cb of this.listeners) {
      try {
        cb(event);
      } catch {
        /* noop */
      }
    }
  }

  private scheduleChunk(chunk: AudioChunk): void {
    if (this.abortController?.signal.aborted) return;
    const sr = chunk.sampleRate;
    const startSec = chunk.startSample / sr;
    const t = Math.max(this.ctx!.currentTime + 0.01, this.startTime + startSec);
    for (let c = 0; c < chunk.data.length; c++) {
      const buf = this.ctx!.createBuffer(1, chunk.data[c].length, sr);
      buf.copyToChannel(chunk.data[c] as Float32Array<ArrayBuffer>, 0);
      const src = this.ctx!.createBufferSource();
      src.buffer = buf;
      src.connect(this.gainNode!);
      src.start(t);
    }
    this.totalSamplesScheduled = Math.max(this.totalSamplesScheduled, chunk.startSample + chunk.data[0].length);

    const scheduledEnd = this.startTime + (chunk.startSample + chunk.data[0].length) / sr;
    const bufferAhead = Math.max(0, scheduledEnd - this.ctx!.currentTime);
    if (bufferAhead < 0.15 && !this.underrunEmitted) {
      this.underrunEmitted = true;
      this.emit({ type: "bufferUnderrun", bufferAhead });
    }
    if (this.totalSamplesScheduled > 0) {
      this.emit({
        type: "progress",
        renderedSamples: chunk.startSample + chunk.data[0].length,
        totalSamples: this.totalDurationSec > 0
          ? Math.round(this.totalDurationSec * sr)
          : this.totalSamplesScheduled,
        bufferAhead,
      });
    }
  }

  async play(stream: AsyncGenerator<AudioChunk>, volume = 0.8, sampleRate?: number, options?: PlayOptions): Promise<void> {
    this.stop();
    this.preBufferThreshold = options?.preBufferThreshold ?? 0.5;
    this.underrunEmitted = false;
    this.ctx = new AudioContext({ sampleRate: sampleRate ?? 44100 });
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.totalSamplesScheduled = 0;
    this.totalDurationSec = 0;

    const iter = stream[Symbol.asyncIterator]();

    // Pre-buffer: collect chunks until threshold met or stream exhausted
    const buf: AudioChunk[] = [];
    let bufSec = 0;
    for (;;) {
      if (signal.aborted) { this.cleanup(); return; }
      const { value: chunk, done } = await iter.next();
      if (done) break;
      this.totalDurationSec += chunk.data[0].length / chunk.sampleRate;
      buf.push(chunk);
      bufSec += chunk.data[0].length / chunk.sampleRate;
      if (bufSec >= this.preBufferThreshold) break;
    }

    // Start playback
    this.startTime = this.ctx.currentTime + 0.05;
    this.state = "playing";
    this.emit({ type: "stateChange", state: "playing" });
    for (const chunk of buf) this.scheduleChunk(chunk);

    // Consume remaining chunks
    try {
      for (;;) {
        if (signal.aborted) break;
        const { value: chunk, done } = await iter.next();
        if (done) break;
        this.scheduleChunk(chunk);
      }
      if (!signal.aborted) {
        this.state = "idle";
        this.emit({ type: "done" });
        this.emit({ type: "stateChange", state: "idle" });
      }
    } catch (err) {
      this.state = "idle";
      this.emit({ type: "error", error: err instanceof Error ? err : new Error(String(err)) });
      this.emit({ type: "stateChange", state: "idle" });
    } finally {
      if (signal.aborted) this.cleanup();
    }
  }

  private cleanup(): void {
    this.abortController = null;
    this.ctx = null;
    this.gainNode = null;
  }

  pause(): void {
    if (this.state !== "playing" || !this.ctx) return;
    this.ctx.suspend();
    this.state = "paused";
    this.emit({ type: "stateChange", state: "paused" });
  }
  resume(): void {
    if (this.state !== "paused" || !this.ctx) return;
    this.ctx.resume();
    this.state = "playing";
    this.emit({ type: "stateChange", state: "playing" });
  }

  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  stop(): void {
    this.abortController?.abort();
    this.abortController = null;
    const oldCtx = this.ctx;
    const oldGain = this.gainNode;
    this.ctx = null;
    this.gainNode = null;
    if (!oldCtx) return;
    if (oldGain) {
      oldGain.gain.setValueAtTime(oldGain.gain.value, oldCtx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, oldCtx.currentTime + 0.05);
    }
    this.state = "idle";
    this.emit({ type: "stateChange", state: "idle" });
    this.fadeTimer = setTimeout(() => {
      if (oldCtx.state !== "closed") oldCtx.close().catch(() => {});
      this.fadeTimer = null;
    }, 60);
  }
}
