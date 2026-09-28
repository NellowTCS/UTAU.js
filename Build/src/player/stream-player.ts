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
  preBufferThreshold?: number;
}

interface PoolEntry {
  buf: AudioBuffer;
  inUse: boolean;
}

const BATCH_TARGET_SEC = 0.5;
const START_LEAD_SECONDS = 0.05;

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export class StreamPlayer {
  private ctx: AudioContext | null = null;
  private state: PlayerState = "idle";
  private listeners: Array<(event: PlayerEvent) => void> = [];
  private startTime = 0;
  private abortController: AbortController | null = null;
  private gainNode: GainNode | null = null;
  private totalSamplesScheduled = 0;
  private scheduledEndTime = 0;
  private preBufferThreshold = 1.0;
  private underrunEmitted = false;

  private bufferPool: PoolEntry[] = [];
  private currentBatch: AudioChunk[] = [];
  private currentBatchStartSample = 0;
  private currentBatchDuration = 0;
  private playbackEndInterval: ReturnType<typeof setInterval> | null = null;

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
      } catch (err) {
        console.error("[StreamPlayer] event listener threw", { event: event.type, err });
      }
    }
  }

  private acquireBuffer(channels: number, sampleRate: number, length: number, ctx: AudioContext): AudioBuffer {
    for (const entry of this.bufferPool) {
      if (!entry.inUse && entry.buf.sampleRate === sampleRate && entry.buf.numberOfChannels === channels && entry.buf.length >= length) {
        entry.inUse = true;
        for (let c = 0; c < channels; c++) entry.buf.getChannelData(c).fill(0);
        return entry.buf;
      }
    }
    const buf = ctx.createBuffer(channels, length, sampleRate);
    this.bufferPool.push({ buf, inUse: true });
    return buf;
  }

  private releaseBuffer(buf: AudioBuffer): void {
    for (const entry of this.bufferPool) {
      if (entry.buf === buf) {
        entry.inUse = false;
        return;
      }
    }
  }

  private flushBatch(ctx: AudioContext, gainNode: GainNode): void {
    if (this.currentBatch.length === 0) return;
    const sr = this.currentBatch[0].sampleRate;
    const channels = this.currentBatch[0].data.length;

    const spanStart = this.currentBatchStartSample;
    let spanEnd = spanStart;
    for (const c of this.currentBatch) spanEnd = Math.max(spanEnd, c.startSample + c.data[0].length);
    const totalLen = Math.max(1, spanEnd - spanStart);

    const buf = this.acquireBuffer(channels, sr, totalLen, ctx);
    for (let c = 0; c < channels; c++) {
      const dst = buf.getChannelData(c);
      for (const chunk of this.currentBatch) {
        const src = chunk.data[Math.min(c, chunk.data.length - 1)];
        const at = chunk.startSample - spanStart;
        for (let i = 0; i < src.length; i++) {
          const idx = at + i;
          if (idx >= 0 && idx < totalLen) dst[idx] += src[i];
        }
      }
    }

    const t = Math.max(ctx.currentTime + 0.01, this.startTime + spanStart / sr);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gainNode);
    src.start(t, 0, totalLen / sr);
    src.onended = () => this.releaseBuffer(buf);

    this.totalSamplesScheduled = Math.max(this.totalSamplesScheduled, spanEnd);
    this.scheduledEndTime = Math.max(this.scheduledEndTime, t + totalLen / sr);
    const bufferAhead = Math.max(0, this.scheduledEndTime - ctx.currentTime);

    if (bufferAhead < 0.15 && !this.underrunEmitted) {
      this.underrunEmitted = true;
      this.emit({ type: "bufferUnderrun", bufferAhead });
    }

    if (this.totalSamplesScheduled > 0) {
      this.emit({
        type: "progress",
        renderedSamples: this.totalSamplesScheduled,
        bufferAhead,
      });
    }

    this.currentBatch = [];
    this.currentBatchDuration = 0;
  }

  private scheduleChunk(chunk: AudioChunk, ctx: AudioContext, gainNode: GainNode): void {
    if (this.abortController?.signal.aborted) return;
    if (this.currentBatch.length > 0 && chunk.sampleRate !== this.currentBatch[0].sampleRate) {
      this.flushBatch(ctx, gainNode);
    }
    this.currentBatch.push(chunk);
    if (this.currentBatch.length === 1) {
      this.currentBatchStartSample = chunk.startSample;
    } else {
      this.currentBatchStartSample = Math.min(this.currentBatchStartSample, chunk.startSample);
    }
    this.currentBatchDuration += chunk.data[0].length / chunk.sampleRate;
    this.totalSamplesScheduled = Math.max(this.totalSamplesScheduled, chunk.startSample + chunk.data[0].length);
    if (this.currentBatchDuration >= BATCH_TARGET_SEC) {
      this.flushBatch(ctx, gainNode);
    }
  }

  async play(stream: AsyncGenerator<AudioChunk>, volume = 0.8, sampleRate?: number, options?: PlayOptions): Promise<void> {
    this.stop();
    this.preBufferThreshold = options?.preBufferThreshold ?? 1.0;
    this.underrunEmitted = false;
    this.ctx = new AudioContext({ sampleRate: sampleRate ?? 44100 });
    const ctx = this.ctx;
    this.gainNode = ctx.createGain();
    this.gainNode.connect(ctx.destination);
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch (err) {
        this.cleanup(ctx);
        await ctx.close().catch((closeErr) => console.error("[StreamPlayer] failed to close AudioContext", closeErr));
        this.state = "idle";
        this.emit({ type: "error", error: toError(err) });
        this.emit({ type: "stateChange", state: "idle" });
        return;
      }
    }
    const gainNode = this.gainNode;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.totalSamplesScheduled = 0;
    this.scheduledEndTime = 0;
    this.bufferPool = [];
    this.currentBatch = [];
    this.currentBatchDuration = 0;

    const iter = stream[Symbol.asyncIterator]();

    const buf: AudioChunk[] = [];
    let bufSec = 0;
    try {
      for (;;) {
        if (signal.aborted) break;
        const { value: chunk, done } = await iter.next();
        if (done) break;
        buf.push(chunk);
        bufSec += chunk.data[0].length / chunk.sampleRate;
        if (bufSec >= this.preBufferThreshold) break;
      }

      if (!signal.aborted) {
        this.startTime = ctx.currentTime + START_LEAD_SECONDS;
        this.state = "playing";
        this.emit({ type: "stateChange", state: "playing" });
        for (const chunk of buf) this.scheduleChunk(chunk, ctx, gainNode);
        this.flushBatch(ctx, gainNode);
      }

      for (;;) {
        if (signal.aborted) break;
        const { value: chunk, done } = await iter.next();
        if (done) break;
        this.scheduleChunk(chunk, ctx, gainNode);
      }
      this.flushBatch(ctx, gainNode);
      if (!signal.aborted) {
        await this.waitForPlaybackEnd(ctx, signal);
        if (!signal.aborted) {
          this.state = "idle";
          this.emit({ type: "done" });
          this.emit({ type: "stateChange", state: "idle" });
        }
      }
    } catch (err) {
      this.state = "idle";
      this.emit({ type: "error", error: toError(err) });
      this.emit({ type: "stateChange", state: "idle" });
    } finally {
      await this.finalizeStream(iter);
      this.cleanup(ctx);
      if (!signal.aborted && ctx.state !== "closed") {
        ctx.close().catch((err) => console.error("[StreamPlayer] failed to close AudioContext", err));
      }
    }
  }

  private async finalizeStream(iter: AsyncIterator<AudioChunk>): Promise<void> {
    try {
      await iter.return?.();
    } catch (err) {
      console.error("[StreamPlayer] failed to finalize the source stream", err);
    }
  }

  private waitForPlaybackEnd(ctx: AudioContext, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const endSec = this.scheduledEndTime;
      const check = () => {
        if (signal.aborted) {
          if (this.playbackEndInterval) clearInterval(this.playbackEndInterval);
          this.playbackEndInterval = null;
          resolve();
          return;
        }
        if (ctx.currentTime >= endSec) {
          if (this.playbackEndInterval) clearInterval(this.playbackEndInterval);
          this.playbackEndInterval = null;
          resolve();
        }
      };
      this.playbackEndInterval = setInterval(check, 50);
      check();
    });
  }

  private cleanup(ctx?: AudioContext): void {
    if (this.playbackEndInterval) {
      clearInterval(this.playbackEndInterval);
      this.playbackEndInterval = null;
    }
    this.abortController = null;
    if (ctx === undefined || this.ctx === ctx) {
      this.ctx = null;
      this.gainNode = null;
    }
    this.bufferPool = [];
    this.currentBatch = [];
    this.currentBatchDuration = 0;
  }

  pause(): void {
    if (this.state !== "playing" || !this.ctx) return;
    const ctx = this.ctx;
    this.state = "paused";
    this.emit({ type: "stateChange", state: "paused" });
    ctx.suspend().catch((err) => {
      this.state = "playing";
      this.emit({ type: "error", error: toError(err) });
      this.emit({ type: "stateChange", state: "playing" });
    });
  }

  resume(): void {
    if (this.state !== "paused" || !this.ctx) return;
    const ctx = this.ctx;
    this.state = "playing";
    this.emit({ type: "stateChange", state: "playing" });
    ctx.resume().catch((err) => {
      this.state = "paused";
      this.emit({ type: "error", error: toError(err) });
      this.emit({ type: "stateChange", state: "paused" });
    });
  }

  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  stop(): void {
    this.abortController?.abort();
    this.abortController = null;
    if (this.playbackEndInterval) {
      clearInterval(this.playbackEndInterval);
      this.playbackEndInterval = null;
    }
    const oldCtx = this.ctx;
    const oldGain = this.gainNode;
    this.ctx = null;
    this.gainNode = null;
    this.bufferPool = [];
    this.currentBatch = [];
    this.currentBatchDuration = 0;
    if (!oldCtx) return;
    if (oldGain) {
      oldGain.gain.setValueAtTime(oldGain.gain.value, oldCtx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, oldCtx.currentTime + 0.05);
    }
    this.state = "idle";
    this.emit({ type: "stateChange", state: "idle" });
    this.fadeTimer = setTimeout(() => {
      if (oldCtx.state !== "closed") {
        oldCtx.close().catch((err) => console.error("[StreamPlayer] failed to close AudioContext", err));
      }
      this.fadeTimer = null;
    }, 60);
  }
}
