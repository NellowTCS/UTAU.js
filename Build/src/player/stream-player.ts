import type { AudioChunk } from "../core/types";

/** Playback state of a StreamPlayer. */
export type PlayerState = "idle" | "playing" | "paused";

/** Events emitted by StreamPlayer during playback. Subscribe via `on()`. */
export type PlayerEvent =
  | {
      /** Playback state has changed. */
      type: "stateChange";
      state: PlayerState;
    }
  | {
      /** Periodic progress update during playback. */
      type: "progress";
      /** Number of samples scheduled so far. */
      renderedSamples: number;
      /** Total samples in the full stream (may be 0 if unknown). */
      totalSamples: number;
      /** Seconds of audio ahead of the current playhead. */
      bufferAhead: number;
    }
  | {
      /** Stream has been fully rendered and played. */
      type: "done";
    }
  | {
      /** Buffer fell below the safe threshold (may cause audio dropout). */
      type: "bufferUnderrun";
      bufferAhead: number;
    }
  | {
      /** An error occurred during rendering or playback. */
      type: "error";
      error: Error;
    };

/** Options for StreamPlayer.play(). */
export interface PlayOptions {
  /** Playback volume (0-1). */
  volume?: number;
  /** Output sample rate. Defaults to the AudioContext default. */
  sampleRate?: number;
  /** Seconds of audio to pre-buffer before starting playback. Default 1.0. */
  preBufferThreshold?: number;
}

interface PoolEntry {
  buf: AudioBuffer;
  inUse: boolean;
}

const BATCH_TARGET_SEC = 0.5;

/** Streaming audio player that consumes an AsyncGenerator of AudioChunks
 *  and schedules them against the Web Audio API clock. Uses batching to
 *  reduce scheduling overhead and a buffer pool to minimise GC pressure.
 *
 *  Emits PlayerEvents for state changes, progress, and errors. */
export class StreamPlayer {
  private ctx: AudioContext | null = null;
  private state: PlayerState = "idle";
  private listeners: Array<(event: PlayerEvent) => void> = [];
  private startTime = 0;
  private abortController: AbortController | null = null;
  private gainNode: GainNode | null = null;
  private totalSamplesScheduled = 0;
  private totalDurationSec = 0;
  private preBufferThreshold = 1.0;
  private underrunEmitted = false;

  // Batching + buffer pool
  private bufferPool: PoolEntry[] = [];
  private currentBatch: AudioChunk[] = [];
  private currentBatchStartSample = 0;
  private currentBatchDuration = 0;
  private playbackEndInterval: ReturnType<typeof setInterval> | null = null;

  /** Set the output volume (0-1). */
  setVolume(v: number): void {
    if (this.gainNode) this.gainNode.gain.value = v;
  }

  /** Current player state. */
  get currentState(): PlayerState {
    return this.state;
  }

  /** Subscribe to player events. Returns an unsubscribe function. */
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

  private acquireBuffer(sampleRate: number, length: number, ctx: AudioContext): AudioBuffer {
    for (const entry of this.bufferPool) {
      if (!entry.inUse && entry.buf.sampleRate === sampleRate && entry.buf.length >= length) {
        entry.inUse = true;
        entry.buf.getChannelData(0).fill(0);
        return entry.buf;
      }
    }
    const buf = ctx.createBuffer(1, length, sampleRate);
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
    const totalLen = this.currentBatch.reduce((s, c) => s + c.data[0].length, 0);
    const batchStartSec = this.currentBatchStartSample / sr;
    const t = Math.max(ctx.currentTime + 0.01, this.startTime + batchStartSec);

    for (let c = 0; c < channels; c++) {
      const buf = this.acquireBuffer(sr, totalLen, ctx);
      const channelData = buf.getChannelData(0);
      let offset = 0;
      for (const chunk of this.currentBatch) {
        const src = chunk.data[c];
        channelData.set(src, offset);
        offset += src.length;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gainNode);
      src.start(t, 0, totalLen / sr);
      src.onended = () => this.releaseBuffer(buf);
    }

    const lastChunk = this.currentBatch[this.currentBatch.length - 1];
    const scheduledEnd = this.startTime + (lastChunk.startSample + lastChunk.data[0].length) / sr;
    const bufferAhead = Math.max(0, scheduledEnd - ctx.currentTime);

    if (bufferAhead < 0.15 && !this.underrunEmitted) {
      this.underrunEmitted = true;
      this.emit({ type: "bufferUnderrun", bufferAhead });
    }

    if (this.totalSamplesScheduled > 0) {
      this.emit({
        type: "progress",
        renderedSamples: this.totalSamplesScheduled,
        totalSamples: this.totalDurationSec > 0 ? Math.round(this.totalDurationSec * sr) : this.totalSamplesScheduled,
        bufferAhead,
      });
    }

    this.currentBatch = [];
    this.currentBatchDuration = 0;
  }

  private scheduleChunk(chunk: AudioChunk, ctx: AudioContext, gainNode: GainNode): void {
    if (this.abortController?.signal.aborted) return;
    this.currentBatch.push(chunk);
    if (this.currentBatch.length === 1) {
      this.currentBatchStartSample = chunk.startSample;
    }
    this.currentBatchDuration += chunk.data[0].length / chunk.sampleRate;
    this.totalDurationSec += chunk.data[0].length / chunk.sampleRate;
    this.totalSamplesScheduled = Math.max(this.totalSamplesScheduled, chunk.startSample + chunk.data[0].length);
    if (this.currentBatchDuration >= BATCH_TARGET_SEC) {
      this.flushBatch(ctx, gainNode);
    }
  }

  /** Start playback of an AudioChunk stream. Pre-buffers `preBufferThreshold`
   *  seconds before allowing audio to reach the output, then schedules chunks
   *  in batches against the AudioContext clock. Stops any current playback
   *  first. */
  async play(stream: AsyncGenerator<AudioChunk>, volume = 0.8, sampleRate?: number, options?: PlayOptions): Promise<void> {
    this.stop();
    this.preBufferThreshold = options?.preBufferThreshold ?? 1.0;
    this.underrunEmitted = false;
    this.ctx = new AudioContext({ sampleRate: sampleRate ?? 44100 });
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    if (this.ctx.state === "suspended") {
      await this.ctx.resume().catch(() => {});
    }
    const ctx = this.ctx;
    const gainNode = this.gainNode;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.totalSamplesScheduled = 0;
    this.totalDurationSec = 0;
    this.bufferPool = [];
    this.currentBatch = [];
    this.currentBatchDuration = 0;

    const iter = stream[Symbol.asyncIterator]();

    // Pre-buffer: collect chunks until threshold met or stream exhausted
    const buf: AudioChunk[] = [];
    let bufSec = 0;
    for (;;) {
      if (signal.aborted) {
        await this.finalizeStream(iter);
        this.cleanup();
        return;
      }
      const { value: chunk, done } = await iter.next();
      if (done) break;
      buf.push(chunk);
      bufSec += chunk.data[0].length / chunk.sampleRate;
      if (bufSec >= this.preBufferThreshold) break;
    }

    // Start playback
    this.startTime = this.ctx.currentTime + 0.05;
    this.state = "playing";
    this.emit({ type: "stateChange", state: "playing" });

    // Schedule pre-buffered chunks (goes through batching)
    for (const chunk of buf) this.scheduleChunk(chunk, ctx, gainNode);
    this.flushBatch(ctx, gainNode);

    // Consume remaining chunks
    try {
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
      console.log("[diag][stream] ERROR", err);
      this.state = "idle";
      this.emit({
        type: "error",
        error: err instanceof Error ? err : new Error(String(err)),
      });
      this.emit({ type: "stateChange", state: "idle" });
    } finally {
      await this.finalizeStream(iter);
      if (signal.aborted) this.cleanup();
    }
  }

  /** Finalize the source generator. For a worker-backed stream this tears
   *  down the worker; for an inline generator it simply closes the iterator. */
  private async finalizeStream(iter: AsyncIterator<AudioChunk>): Promise<void> {
    try {
      await iter.return?.();
    } catch {
      // Generator already closed or threw during finalization.
    }
  }

  /** Resolve once the AudioContext clock has advanced past the end of the
   *  fully-scheduled timeline, i.e. when the last buffered sample is audible.
   *  Polled against `ctx.currentTime` so it naturally pauses when the context
   *  is suspended. Rejects/aborts immediately if playback is stopped. */
  private waitForPlaybackEnd(ctx: AudioContext, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const endSec = this.startTime + this.totalDurationSec;
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

  private cleanup(): void {
    if (this.playbackEndInterval) {
      clearInterval(this.playbackEndInterval);
      this.playbackEndInterval = null;
    }
    this.abortController = null;
    this.ctx = null;
    this.gainNode = null;
    this.bufferPool = [];
    this.currentBatch = [];
    this.currentBatchDuration = 0;
  }

  /** Pause playback. The AudioContext is suspended and can be resumed via
   *  `resume()`. */
  pause(): void {
    if (this.state !== "playing" || !this.ctx) return;
    this.ctx.suspend();
    this.state = "paused";
    this.emit({ type: "stateChange", state: "paused" });
  }

  /** Resume playback after a pause. */
  resume(): void {
    if (this.state !== "paused" || !this.ctx) return;
    this.ctx.resume();
    this.state = "playing";
    this.emit({ type: "stateChange", state: "playing" });
  }

  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Stop playback immediately (with a 50ms fade-out to avoid click) and
   *  close the underlying AudioContext. */
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
      if (oldCtx.state !== "closed") oldCtx.close().catch(() => {});
      this.fadeTimer = null;
    }, 60);
  }
}
