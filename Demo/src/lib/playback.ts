import type { Score } from "utaujs"
import { StreamPlayer, streamScore } from "utaujs"

export function createPlayback(score: () => Score, voiceName: () => string, langId: () => string) {
  const player = new StreamPlayer()
  return {
    player,
    async start() {
      const stream = streamScore(score(), voiceName(), langId())
      await player.play(stream)
    },
    pause() { player.pause() },
    resume() { player.resume() },
    stop() { player.stop() },
  }
}
