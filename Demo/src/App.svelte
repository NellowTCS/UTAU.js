<script lang="ts">
  import PianoRoll from "./components/PianoRoll.svelte";
  import VoicePanel from "./components/VoicePanel.svelte";
  import TransportBar from "./components/TransportBar.svelte";
  import SettingsPanel from "./components/SettingsPanel.svelte";
  import Tooltip from "./components/ui/Tooltip.svelte";
  import { Tooltip as BitsTooltip } from "bits-ui";
  import Segmented from "./components/ui/Segmented.svelte";
  import { Undo2, Redo2, Settings, FileUp, Music2 } from "@lucide/svelte";
  import type { Note } from "ichikara";
  import {
    streamScore,
    renderScore,
    mixChunks,
    encodeWav,
    buildVoice,
    scaleVoice,
    importScoreFromFile,
    downloadScore,
    type AudioChunk,
  } from "ichikara";
import { StreamPlayer } from "ichikara";
  import { createDemoScore } from "./lib/score";
  import { createWorkerStream, type WorkerStream } from "./lib/workerStream";
  import { Undora } from "undora";

  let langId = $state("jp");
  const _initScore = createDemoScore("jp");
  let score = $state(_initScore);
  let notes = $state(_initScore.notes);
  let selectedNote = $state<number | null>(null);
  let projectName = $state("Untitled");
  let voiceParams = $state({
    gender: 0,
    breathiness: 0.3,
    tension: 0.5,
    brightness: 0.5,
    vibratoAmount: 0.5,
  } as Record<string, number>);
  let advancedOpen = $state(false);
  let settingsOpen = $state(false);
  let showWelcome = $state(true);
  let autoScroll = $state(true);
  let canUndo = $state(false);
  let canRedo = $state(false);
  const history = new Undora<Note[]>({ capacity: 50 });
  history.pushState(_initScore.notes, { silent: true });
  function saveSnapshot() {
    history.pushState(notes, { silent: true });
    canUndo = history.canUndo();
    canRedo = history.canRedo();
  }
  function handleUndo() {
    history.undo();
    const state = history.getCurrent();
    if (state !== undefined) notes = state;
    canUndo = history.canUndo();
    canRedo = history.canRedo();
  }
  function handleRedo() {
    history.redo();
    const state = history.getCurrent();
    if (state !== undefined) notes = state;
    canUndo = history.canUndo();
    canRedo = history.canRedo();
  }
  let volume = $state(0.8);
  let tempo = $state(120);
  let player: StreamPlayer | null = $state(null);
  let currentStream: WorkerStream | null = null;
  let playerState = $state("idle");
  let exporting = $state(false);
  let buffering = $state(false);
  let bufferAhead = $state(0);

  let playheadTick = $state<number | null>(null);
  let rafId = 0;
  let baseSec = 0;
  let basePerf = 0;
  let playSr = 44100;
  const RES = 480;
  function secToTick(sec: number) {
    return sec * (tempo / 60) * RES;
  }
  function tickLoop() {
    if (player && playerState === "playing") {
      const sec = baseSec + (performance.now() - basePerf) / 1000;
      playheadTick = secToTick(sec);
      rafId = requestAnimationFrame(tickLoop);
    }
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

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
    history.clear();
    history.pushState(s.notes, { silent: true });
    canUndo = false;
    canRedo = false;
    playheadTick = null;
  });

  const totalTicks = $derived(
    notes.reduce((m, n) => Math.max(m, (n.tick ?? 0) + n.length), 0),
  );

  async function handlePlay() {
    player?.stop();
    currentStream?.cancel();
    stopLoop();
    const p = new StreamPlayer();
    player = p;
    buffering = true;
    p.on((ev) => {
      if (ev.type === "stateChange") {
        playerState = ev.state;
        if (ev.state === "playing") {
          buffering = false;
          basePerf = performance.now();
          if (!rafId) rafId = requestAnimationFrame(tickLoop);
        }
        if (ev.state === "idle") {
          buffering = false;
          stopLoop();
          playheadTick = null;
        }
        if (ev.state === "paused") stopLoop();
      } else if (ev.type === "progress") {
        baseSec = ev.renderedSamples / playSr - ev.bufferAhead;
        basePerf = performance.now();
      } else if (ev.type === "bufferUnderrun") {
        bufferAhead = ev.bufferAhead;
      } else if (ev.type === "done") {
        player = null;
        playerState = "idle";
        stopLoop();
        playheadTick = null;
      } else if (ev.type === "error") {
        buffering = false;
        stopLoop();
        playheadTick = null;
      }
    });
    p.on((ev) => {
      if (ev.type === "progress") bufferAhead = ev.bufferAhead;
    });
    const v = scaleVoice(buildVoice(), voiceParams);
    playSr = v.sampleRate;
    const currentLang = langId;
    currentStream = createWorkerStream({ score: $state.snapshot(score), voice: v, langId: currentLang });
    try {
      await p.play(currentStream.stream, volume, v.sampleRate, { preBufferThreshold: 0.5 });
    } catch (e) {
      console.warn("[play] worker stream failed; falling back to main-thread render", e);
      currentStream?.cancel();
      currentStream = null;
      const p2 = new StreamPlayer();
      player = p2;
      const stream = streamScore($state.snapshot(score), v, currentLang);
      await p2.play(stream, volume, v.sampleRate, { preBufferThreshold: 0.5 }).catch((e2) => {
        console.error("[play] fallback also failed", e2);
        player = null;
        playerState = "idle";
        buffering = false;
        stopLoop();
        playheadTick = null;
      });
    }
  }

  function handlePause() {
    player?.pause();
  }
  function handleResume() {
    player?.resume();
  }
  function handleStop() {
    player?.stop();
    currentStream?.cancel();
    currentStream = null;
    stopLoop();
    player = null;
    playerState = "idle";
    playheadTick = null;
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
    history.clear();
    history.pushState(s.notes, { silent: true });
    canUndo = false;
    canRedo = false;
  }

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
      a.download = `${projectName || "ichikara-export"}.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      exporting = false;
    }
  }

  async function handleScoreExport() {
    await downloadScore(score, { projectName: projectName || "ichikara-export", format: "ustx" });
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    } else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
    }
  }

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function noteName(n: number) {
    return `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />
<BitsTooltip.Provider>
  <div class="app">
    <header class="app-header">
      <div class="brand">Ichikara</div>
      <input class="project-name" bind:value={projectName} spellcheck="false" aria-label="Project name" />
      <div class="header-spacer"></div>
      <Segmented
        bind:value={langId}
        options={[
          { value: "jp", label: "JP" },
          { value: "en", label: "EN" },
          { value: "zh", label: "ZH" },
        ]}
      />
      <div class="header-group">
        <input
          type="file"
          bind:this={fileInput}
          accept=".ust,.ustx,.vsqx,.vpr,.svp,.mid,.midi,.musicxml,.ppsf,.s5p,.tssln,.ccs,.dv,.ufdata"
          style="display:none"
          onchange={handleOpen}
        />
        <Tooltip text="Open project">
          {#snippet trigger(p)}
            <button class="icon-btn" title="Open" {...p} onclick={() => fileInput?.click()}>
              <FileUp size={16} />
            </button>
          {/snippet}
        </Tooltip>
        <Tooltip text="Undo (Ctrl/Cmd+Z)">
          {#snippet trigger(p)}
            <button class="icon-btn" title="Undo" {...p} onclick={handleUndo} disabled={!canUndo}>
              <Undo2 size={16} />
            </button>
          {/snippet}
        </Tooltip>
        <Tooltip text="Redo">
          {#snippet trigger(p)}
            <button class="icon-btn" title="Redo" {...p} onclick={handleRedo} disabled={!canRedo}>
              <Redo2 size={16} />
            </button>
          {/snippet}
        </Tooltip>
        <Tooltip text="Settings">
          {#snippet trigger(p)}
            <button class="icon-btn" title="Settings" {...p} onclick={() => (settingsOpen = true)}>
              <Settings size={16} />
            </button>
          {/snippet}
        </Tooltip>
      </div>
    </header>

    <main class="app-main">
      <div class="piano-area">
        {#if showWelcome}
          <div class="welcome">
            <h4><Music2 size={14} style="vertical-align:-2px" /> Welcome to Ichikara</h4>
            <p>
              Click the grid to add notes, drag to move, drag the right edge to resize. Right-click a
              note to add or remove <b>pitch-bend</b> points. Use the sliders to shape the voice.
            </p>
            <button class="welcome-close" onclick={() => (showWelcome = false)}>Got it</button>
          </div>
        {/if}
        <PianoRoll
          bind:notes
          bind:selectedNote
          bind:playheadTick
          bind:autoScroll
          {saveSnapshot}
          {handleUndo}
          {handleRedo}
        />
        {#if selectedNote != null && notes[selectedNote]}
          <div class="note-editor">
            <span class="field">
              <span class="ed-label">Lyric</span>
              <input type="text" bind:value={notes[selectedNote].lyric} onblur={saveSnapshot} />
            </span>
            <span class="field">
              <span class="ed-label">Note</span>
              <input
                type="number"
                min={0}
                max={127}
                bind:value={notes[selectedNote].noteNum}
                onblur={saveSnapshot}
              />
            </span>
            <span class="note-name">{noteName(notes[selectedNote].noteNum)}</span>
            <span class="field">
              <span class="ed-label">Velocity</span>
              <input
                type="number"
                min={0}
                max={127}
                bind:value={notes[selectedNote].velocity}
                onblur={saveSnapshot}
              />
            </span>
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
      bind:tempo
      {buffering}
      {bufferAhead}
      {playheadTick}
      {totalTicks}
      onPlay={handlePlay}
      onPause={handlePause}
      onResume={handleResume}
      onStop={handleStop}
      onExport={handleExport}
      onScoreExport={handleScoreExport}
      {exporting}
    />
  </div>

  <SettingsPanel bind:open={settingsOpen} bind:autoScroll onClose={() => (settingsOpen = false)} />
</BitsTooltip.Provider>

<style>
  .brand {
    display: flex;
    align-items: baseline;
    gap: 1px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 19px;
    letter-spacing: 0.01em;
  }
  .project-name {
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-dim);
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: var(--r-sm);
    width: 150px;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
  }
  .project-name:hover {
    border-color: var(--border);
    color: var(--text);
  }
  .project-name:focus {
    outline: none;
    background: var(--bg-inset);
    border-color: var(--accent-line);
    color: var(--text);
  }
  .welcome-close {
    background: var(--accent-soft);
    border: 1px solid var(--accent-line);
    color: var(--accent);
    border-radius: var(--r-sm);
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .welcome-close:hover {
    background: var(--accent-line);
  }
</style>
