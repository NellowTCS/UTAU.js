<script lang="ts">
  import PianoRoll from "./components/PianoRoll.svelte";
  import VoicePanel from "./components/VoicePanel.svelte";
  import TransportBar from "./components/TransportBar.svelte";
  import {
    streamScore,
    renderScore,
    mixChunks,
    encodeWav,
    buildVoice,
    scaleVoice,
    importScoreFromFile,
  } from "utaujs";
  import { StreamPlayer } from "utaujs";
  import { createDemoScore } from "./lib/score";

  let langId = $state("jp");
  const _initScore = createDemoScore("jp");
  let score = $state(_initScore);
  let notes = $state(_initScore.notes);
  let selectedNote = $state<number | null>(null);
  let voiceParams = $state({
    gender: 0,
    breathiness: 0.3,
    tension: 0.5,
    brightness: 0.5,
    vibratoAmount: 0.5,
  } as {
    gender: number;
    breathiness: number;
    tension: number;
    brightness: number;
    vibratoAmount: number;
    oq?: number;
    sq?: number;
    fScale?: number;
    fShift?: number;
    vRate?: number;
    vAttack?: number;
  });
  let advancedOpen = $state(false);
  let volume = $state(0.8);
  let player: StreamPlayer | null = $state(null);
  let playerState = $state("idle");
  let exporting = $state(false);

  $effect(() => {
    score.notes = notes;
  });
  $effect(() => {
    const s = createDemoScore(langId);
    score = s;
    notes = s.notes;
  });

  async function handlePlay() {
    player?.stop();
    const p = new StreamPlayer();
    player = p;
    p.on((ev) => {
      if (ev.type === "stateChange") playerState = ev.state;
    });
    p.on((ev) => {
      if (ev.type === "done") {
        player = null;
        playerState = "idle";
      }
    });
    const v = scaleVoice(buildVoice(), voiceParams);
    const currentLang = langId;
    const stream = streamScore(score, v, currentLang);
    await p.play(stream, volume, v.sampleRate).catch(() => {
      player = null;
      playerState = "idle";
    });
  }

  function handlePause() {
    player?.pause();
  }
  function handleResume() {
    player?.resume();
  }
  function handleStop() {
    player?.stop();
    player = null;
    playerState = "idle";
  }

  let fileInput: HTMLInputElement | undefined;

  async function handleOpen() {
    const files = fileInput?.files;
    if (!files || !files.length) return;
    const s = await importScoreFromFile(files[0]);
    score = s;
    notes = s.notes;
    selectedNote = null;
  }

  $effect(() => {
    score.notes = notes;
  });

  async function handleExport() {
    if (exporting) return;
    exporting = true;
    try {
      const v = scaleVoice(buildVoice(), voiceParams);
      const chunks = await renderScore(score, v, langId);
      const mixed = mixChunks(chunks);
      const wav = encodeWav([mixed], volume);
      const blob = new Blob([wav], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "utaujs-export.wav";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      exporting = false;
    }
  }

  const NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  function noteName(n: number) {
    return `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
  }
</script>

<div class="app">
  <header>
    <h1>UTAU.js</h1>
    <div class="header-controls">
      <input type="file" bind:this={fileInput} accept=".ust,.ustx,.vsqx,.vpr,.svp,.mid,.midi,.musicxml,.ppsf,.s5p,.tssln,.ccs,.dv,.ufdata"
        style="display:none" onchange={handleOpen} />
      <button onclick={() => fileInput?.click()}>Open</button>
      <select bind:value={langId}>
        <option value="jp">Japanese</option>
        <option value="en">English</option>
      </select>
    </div>
  </header>
  <main>
    <div class="piano-area">
      <PianoRoll bind:notes bind:selectedNote />
      {#if selectedNote != null && notes[selectedNote]}
        <div class="note-editor">
          <span>Lyric:</span>
          <input
            type="text"
            bind:value={notes[selectedNote].lyric}
            oninput={() => (notes = notes)}
          />
          <span>Note:</span>
          <input
            type="number"
            min={0}
            max={127}
            bind:value={notes[selectedNote].noteNum}
            oninput={() => (notes = notes)}
          />
          <span class="note-name">{noteName(notes[selectedNote].noteNum)}</span>
        </div>
      {/if}
    </div>
    <div class="voice-area">
      <VoicePanel bind:params={voiceParams} bind:advancedOpen />
    </div>
  </main>
  <TransportBar
    bind:state={playerState}
    bind:volume
    onPlay={handlePlay}
    onPause={handlePause}
    onResume={handleResume}
    onStop={handleStop}
    onExport={handleExport}
    {exporting}
  />
</div>

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  :global(body) {
    background: #0f0f23;
    color: #ddd;
    font-family: monospace;
    overflow: hidden;
  }
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #0f0f23;
    border-bottom: 1px solid #333;
  }
  header h1 {
    font-size: 16px;
    color: #4fc3f7;
    letter-spacing: 2px;
  }
  .header-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .header-controls button {
    background: #1a1a2e;
    color: #ddd;
    border: 1px solid #555;
    padding: 4px 10px;
    font-family: monospace;
    cursor: pointer;
  }
  .header-controls button:hover {
    background: #2a2a4e;
  }
  header select {
    background: #1a1a2e;
    color: #ddd;
    border: 1px solid #555;
    padding: 4px 8px;
    font-family: monospace;
    cursor: pointer;
  }
  main {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .piano-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 8px;
  }
  .voice-area {
    width: 280px;
    flex-shrink: 0;
    overflow-y: auto;
  }
  .note-editor {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    background: #1a1a2e;
    border-radius: 4px;
  }
  .note-editor span {
    color: #999;
    font-size: 12px;
  }
  .note-editor span.note-name {
    color: #4fc3f7;
    font-weight: bold;
    min-width: 30px;
  }
  .note-editor input {
    background: #0f0f23;
    color: #ddd;
    border: 1px solid #555;
    padding: 3px 6px;
    font-family: monospace;
    font-size: 12px;
    width: 60px;
  }
  .note-editor input[type="number"] {
    width: 45px;
  }
</style>
