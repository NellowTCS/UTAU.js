<script lang="ts">
  import PianoRoll from "./components/PianoRoll.svelte";
  import VoicePanel from "./components/VoicePanel.svelte";
  import TransportBar from "./components/TransportBar.svelte";
  import SettingsPanel from "./components/SettingsPanel.svelte";
  import { Settings } from "@lucide/svelte";
  import { streamScore, renderScore, mixChunks, encodeWav, buildVoice, scaleVoice, importScoreFromFile, downloadScore } from "utaujs";
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
  let settingsOpen = $state(false);
  let autoScroll = $state(true);
  let volume = $state(0.8);
  let tempo = $state(120);
  let player: StreamPlayer | null = $state(null);
  let playerState = $state("idle");
  let exporting = $state(false);
  let buffering = $state(false);
  let bufferAhead = $state(0);

  $effect(() => {
    score.notes = notes;
  });

  $effect(() => {
    if (score.tempos[0]) score.tempos[0].tempo = tempo;
  });
  $effect(() => {
    const s = createDemoScore(langId);
    score = s;
    notes = s.notes;
    tempo = s.tempos[0]?.tempo ?? 120;
  });

  async function handlePlay() {
    player?.stop();
    const p = new StreamPlayer();
    player = p;
    buffering = true;
    p.on((ev) => {
      if (ev.type === "stateChange") {
        playerState = ev.state;
        if (ev.state === "playing") buffering = false;
        if (ev.state === "idle") buffering = false;
      }
    });
    p.on((ev) => {
      if (ev.type === "progress") bufferAhead = ev.bufferAhead;
    });
    p.on((ev) => {
      if (ev.type === "bufferUnderrun") bufferAhead = ev.bufferAhead;
    });
    p.on((ev) => {
      if (ev.type === "done") {
        player = null;
        playerState = "idle";
        bufferAhead = 0;
      }
    });
    p.on((ev) => {
      if (ev.type === "error") {
        buffering = false;
        bufferAhead = 0;
      }
    });
    const v = scaleVoice(buildVoice(), voiceParams);
    const currentLang = langId;
    const stream = streamScore(score, v, currentLang);
    await p.play(stream, volume, v.sampleRate, { preBufferThreshold: 0.5 }).catch(() => {
      player = null;
      playerState = "idle";
      buffering = false;
      bufferAhead = 0;
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
    tempo = s.tempos[0]?.tempo ?? 120;
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

  async function handleScoreExport() {
    await downloadScore(score, { projectName: "utaujs-export", format: "ustx" });
  }

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function noteName(n: number) {
    return `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
  }
</script>

<div class="app">
  <header>
    <h1>UTAU.js</h1>
    <div class="header-controls">
      <input
        type="file"
        bind:this={fileInput}
        accept=".ust,.ustx,.vsqx,.vpr,.svp,.mid,.midi,.musicxml,.ppsf,.s5p,.tssln,.ccs,.dv,.ufdata"
        style="display:none"
        onchange={handleOpen}
      />
      <button onclick={() => fileInput?.click()}>Open</button>
      <select bind:value={langId}>
        <option value="jp">Japanese</option>
        <option value="en">English</option>
      </select>
      <button class="icon-btn" onclick={() => (settingsOpen = true)}><Settings size={16} /></button>
    </div>
  </header>
  <main>
    <div class="piano-area">
      <PianoRoll bind:notes bind:selectedNote />
      {#if selectedNote != null && notes[selectedNote]}
        <div class="note-editor">
          <span>Lyric:</span>
          <input type="text" bind:value={notes[selectedNote].lyric} oninput={() => (notes = notes)} />
          <span>Note:</span>
          <input type="number" min={0} max={127} bind:value={notes[selectedNote].noteNum} oninput={() => (notes = notes)} />
          <span class="note-name">{noteName(notes[selectedNote].noteNum)}</span>
        </div>
      {/if}
    </div>
    <div class="voice-area">
      <VoicePanel bind:params={voiceParams} bind:advancedOpen />
    </div>
  </main>
  <SettingsPanel bind:open={settingsOpen} bind:autoScroll onClose={() => (settingsOpen = false)} />
  <TransportBar
    bind:state={playerState}
    bind:volume
    bind:tempo
    {buffering}
    {bufferAhead}
    onPlay={handlePlay}
    onPause={handlePause}
    onResume={handleResume}
    onStop={handleStop}
    onExport={handleExport}
    onScoreExport={handleScoreExport}
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
  .icon-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }
  .icon-btn:hover {
    background: #2a2a4e;
    color: #fff;
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
