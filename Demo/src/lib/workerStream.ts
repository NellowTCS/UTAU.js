import type { AudioChunk, Score, VoiceConfig } from "ichikara";

export interface WorkerStream {
  /** AsyncGenerator consumed by StreamPlayer. Yields chunks as the worker
   *  produces them; resolves on the worker thread so the main thread never
   *  blocks on synthesis. */
  stream: AsyncGenerator<AudioChunk>;
  /** Tear down the worker immediately (e.g. on stop). */
  cancel: () => void;
}

interface JobPayload {
  score: Score;
  voice: VoiceConfig;
  langId: string;
}

/** Run score synthesis in a Web Worker and expose it as an AsyncGenerator of
 *  AudioChunks. The worker renders ahead of the playback clock (bounded by a
 *  small in-flight cap) and transfers chunk buffers to avoid copies. */
export function createWorkerStream(payload: JobPayload): WorkerStream {
  const worker = new Worker(new URL("./render.worker.ts", import.meta.url), {
    type: "module",
  });

  const queue: AudioChunk[] = [];
  let resolveNext: ((r: IteratorResult<AudioChunk>) => void) | null = null;
  let done = false;
  let error: Error | null = null;

  function finish(res: IteratorResult<AudioChunk>): void {
    const r = resolveNext;
    resolveNext = null;
    r?.(res);
  }

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    if (msg?.type === "chunk") {
      const buffers = msg.data as ArrayBuffer[];
      const chunk: AudioChunk = {
        data: buffers.map((b) => new Float32Array(b)),
        startSample: msg.startSample,
        sampleRate: msg.sampleRate,
        channels: buffers.length,
      };
      worker.postMessage({ type: "ack" });
      if (resolveNext) finish({ value: chunk, done: false });
      else queue.push(chunk);
    } else if (msg?.type === "done") {
      done = true;
      if (resolveNext) finish({ value: undefined as unknown as AudioChunk, done: true });
    } else if (msg?.type === "error") {
      error = new Error(msg.error);
      done = true;
      if (resolveNext) finish({ value: undefined as unknown as AudioChunk, done: true });
    }
  };

  worker.onerror = (e) => {
    error = new Error(e.message || "worker error");
    done = true;
    if (resolveNext) finish({ value: undefined as unknown as AudioChunk, done: true });
  };

  worker.postMessage({ type: "start", ...payload });

  const stream = (async function* () {
    try {
      while (true) {
        if (queue.length) {
          yield queue.shift() as AudioChunk;
          continue;
        }
        if (done) {
          if (error) throw error;
          return;
        }
        const res = await new Promise<IteratorResult<AudioChunk>>((r) => {
          resolveNext = r;
        });
        if (res.done) {
          // Worker finished: drain any chunks already received but not yet
          // yielded before ending, otherwise the song would cut off short.
          while (queue.length) yield queue.shift() as AudioChunk;
          if (error) throw error;
          return;
        }
        yield res.value;
      }
    } finally {
      worker.terminate();
    }
  })();

  return {
    stream,
    cancel: () => {
      done = true;
      if (resolveNext) finish({ value: undefined as unknown as AudioChunk, done: true });
      worker.terminate();
    },
  };
}
