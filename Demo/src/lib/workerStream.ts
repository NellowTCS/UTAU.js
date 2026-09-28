import type { AudioChunk, Score, VoiceConfig } from "ichikara";
export interface WorkerStream {
  stream: AsyncGenerator<AudioChunk>;
  cancel: () => void;
}
interface JobPayload {
  score: Score;
  voice: VoiceConfig;
  langId: string;
}
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
      if (resolveNext) finish({ value: chunk, done: false });
      else queue.push(chunk);
    } else if (msg?.type === "done") {
      done = true;
      if (resolveNext) finish({ value: undefined as unknown as AudioChunk, done: true });
    } else if (msg?.type === "error") {
      error = new Error(msg.error ?? "worker failed");
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
    const ack = (): void => {
      worker.postMessage({ type: "ack" });
    };
    try {
      while (true) {
        if (queue.length) {
          const chunk = queue.shift() as AudioChunk;
          yield chunk;
          ack();
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
          while (queue.length) {
            yield queue.shift() as AudioChunk;
            ack();
          }
          if (error) throw error;
          return;
        }
        yield res.value;
        ack();
      }
    } finally {
      worker.terminate();
    }
  })();
  return {
    stream,
    cancel: () => {
      done = true;
      queue.length = 0;
      if (resolveNext) finish({ value: undefined as unknown as AudioChunk, done: true });
      worker.terminate();
    },
  };
}
