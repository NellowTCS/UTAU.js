/// <reference lib="webworker" />
import { streamScore } from "ichikara";
import type { Score, VoiceConfig } from "ichikara";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// Bound the work in flight so the worker renders only a small window ahead of
// the main thread's consume rate (render-ahead buffer), not the entire song.
const CAP = 6;
let outstanding = 0;
let ackWaiter: (() => void) | null = null;
let running = false;

ctx.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  if (msg?.type === "ack") {
    outstanding--;
    if (ackWaiter) {
      const w = ackWaiter;
      ackWaiter = null;
      w();
    }
    return;
  }
  if (msg?.type === "start" && !running) {
    running = true;
    runJob(msg.score as Score, msg.voice as VoiceConfig, msg.langId as string).catch((err) =>
      ctx.postMessage({ type: "error", error: String((err as Error)?.message ?? err) }),
    );
  }
};

async function runJob(score: Score, voice: VoiceConfig, langId: string): Promise<void> {
  try {
    for await (const chunk of streamScore(score, voice, langId)) {
      while (outstanding >= CAP) {
        await new Promise<void>((res) => {
          ackWaiter = res;
        });
      }
      const bufs = chunk.data.map((c) => c.buffer);
      outstanding++;
      ctx.postMessage(
        {
          type: "chunk",
          data: bufs,
          startSample: chunk.startSample,
          sampleRate: chunk.sampleRate,
        },
        bufs,
      );
    }
    ctx.postMessage({ type: "done" });
  } catch (err) {
    ctx.postMessage({ type: "error", error: String((err as Error)?.message ?? err) });
  }
}
