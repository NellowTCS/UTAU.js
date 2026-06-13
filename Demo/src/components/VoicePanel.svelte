<script lang="ts">
  let { params = $bindable({}), advancedOpen = $bindable(false) } = $props();
  const ADV_DEFAULTS = {
    oq: 0.5,
    sq: 0.9,
    fScale: 0.94,
    fShift: 1,
    vRate: 5.8,
    vAttack: 0.12,
  } as const;
  function adv(key: keyof typeof ADV_DEFAULTS): number {
    return (params as any)[key] ?? ADV_DEFAULTS[key];
  }
  function setAdv(key: keyof typeof ADV_DEFAULTS, value: number) {
    (params as any)[key] = value;
  }
  function bindAdv(key: keyof typeof ADV_DEFAULTS) {
    return (e: Event) => {
      const t = e.currentTarget as HTMLInputElement;
      setAdv(key, parseFloat(t.value));
    };
  }
</script>

<div class="voice-panel">
  <h2>Voice</h2>
  <div class="section">
    <h3>Easy</h3>
    <label
      >Gender
      <input
        type="range"
        min="-1"
        max="1"
        step="0.01"
        bind:value={params.gender}
      />
      <span class="val">{params.gender?.toFixed(2)}</span>
    </label>
    <label
      >Breathiness
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        bind:value={params.breathiness}
      />
      <span class="val">{params.breathiness?.toFixed(2)}</span>
    </label>
    <label
      >Tension
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        bind:value={params.tension}
      />
      <span class="val">{params.tension?.toFixed(2)}</span>
    </label>
    <label
      >Brightness
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        bind:value={params.brightness}
      />
      <span class="val">{params.brightness?.toFixed(2)}</span>
    </label>
    <label
      >Vibrato
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        bind:value={params.vibratoAmount}
      />
      <span class="val">{params.vibratoAmount?.toFixed(2)}</span>
    </label>
  </div>

  <button class="toggle" onclick={() => (advancedOpen = !advancedOpen)}>
    {advancedOpen ? "Hide" : "Show"} Advanced
  </button>

  {#if advancedOpen}
    <div class="section advanced">
      <h3>Glottal Source</h3>
      <label
        >Open Quotient <input
          type="range"
          min="0.2"
          max="0.9"
          step="0.01"
          value={params.oq ?? 0.5}
          oninput={(e) => (params.oq = parseFloat(e.currentTarget.value))}
        /></label
      >
      <label
        >Speed Quotient <input
          type="range"
          min="0.3"
          max="3"
          step="0.1"
          value={params.sq ?? 0.9}
          oninput={(e) => (params.sq = parseFloat(e.currentTarget.value))}
        /></label
      >
      <h3>Formant</h3>
      <label
        >Scale <input
          type="range"
          min="0.7"
          max="1.3"
          step="0.01"
          value={params.fScale ?? 0.94}
          oninput={(e) => (params.fScale = parseFloat(e.currentTarget.value))}
        /></label
      >
      <label
        >Shift <input
          type="range"
          min="-6"
          max="6"
          step="1"
          value={params.fShift ?? 1}
          oninput={(e) => (params.fShift = parseFloat(e.currentTarget.value))}
        /></label
      >
      <h3>Vibrato</h3>
      <label
        >Rate <input
          type="range"
          min="2"
          max="10"
          step="0.1"
          value={params.vRate ?? 5.8}
          oninput={(e) => (params.vRate = parseFloat(e.currentTarget.value))}
        /></label
      >
      <label
        >Attack <input
          type="range"
          min="0"
          max="0.5"
          step="0.01"
          value={params.vAttack ?? 0.12}
          oninput={(e) => (params.vAttack = parseFloat(e.currentTarget.value))}
        /></label
      >
    </div>
  {/if}
</div>

<style>
  .voice-panel {
    padding: 12px;
    background: #1a1a2e;
    border-left: 1px solid #333;
    height: 100%;
    overflow-y: auto;
    color: #ddd;
    font-family: monospace;
    font-size: 12px;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 14px;
    color: #4fc3f7;
  }
  h3 {
    margin: 12px 0 6px;
    font-size: 12px;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .section {
    margin-bottom: 12px;
  }
  label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 11px;
  }
  input[type="range"] {
    flex: 1;
    height: 4px;
    accent-color: #4fc3f7;
  }
  .val {
    width: 36px;
    text-align: right;
    color: #aaa;
    font-size: 10px;
  }
  .toggle {
    width: 100%;
    padding: 6px;
    background: #16213e;
    border: 1px solid #333;
    color: #aaa;
    cursor: pointer;
    font-family: monospace;
    font-size: 11px;
    margin-bottom: 8px;
  }
  .toggle:hover {
    background: #1e2a4e;
    color: #fff;
  }
  .advanced {
    border-top: 1px solid #333;
    padding-top: 8px;
  }
</style>
