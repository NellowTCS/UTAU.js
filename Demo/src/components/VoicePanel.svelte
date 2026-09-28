<script lang="ts">
  import { Tabs } from "bits-ui";
  import { Sparkles } from "@lucide/svelte";
  import Field from "./ui/Field.svelte";
  import Button from "./ui/Button.svelte";
  import { chitoseChika, chitoseVoices, type VoiceConfig } from "ichikara";

  let {
    params = $bindable({}),
    advancedOpen = $bindable(false),
    baseVoice = $bindable(chitoseChika),
  }: {
    params?: Record<string, number>;
    advancedOpen?: boolean;
    baseVoice?: VoiceConfig;
  } = $props();

  let tab = $state("voice");

  const NEUTRAL: Record<string, number> = {
    gender: 0,
    breathiness: 0.5,
    tension: 0.5,
    brightness: 0.5,
    vibratoAmount: 0.5,
  };

  const PRESETS: { name: string; values: Record<string, number> }[] = [
    { name: "Neutral", values: NEUTRAL },
    { name: "Soft", values: { gender: -0.3, breathiness: 0.6, tension: 0.25, brightness: 0.4, vibratoAmount: 0.4 } },
    { name: "Bright", values: { gender: 0.2, breathiness: 0.15, tension: 0.75, brightness: 0.85, vibratoAmount: 0.5 } },
    { name: "Breathy", values: { gender: -0.1, breathiness: 0.9, tension: 0.35, brightness: 0.45, vibratoAmount: 0.4 } },
    { name: "Power", values: { gender: 0.3, breathiness: 0.1, tension: 0.85, brightness: 0.6, vibratoAmount: 0.7 } },
    { name: "Robotic", values: { gender: 0, breathiness: 0.2, tension: 0.6, brightness: 0.5, vibratoAmount: 0.0 } },
  ];

  const VOICE_ROLES: Record<string, string> = {
    "Chitose Chika": "female",
    "Chitose Sho": "male",
    "Chitose Ren": "androgynous",
  };

  function applyPreset(p: Record<string, number>) {
    for (const k of Object.keys(p)) params[k] = p[k];
  }

  function clearOverrides() {
    for (const k of Object.keys(params)) delete params[k];
  }

  function selectVoice(v: VoiceConfig) {
    baseVoice = v;
    clearOverrides();
  }
</script>

<Tabs.Root bind:value={tab} class="vp-tabs-root">
  <Tabs.List class="vp-tabs">
    <Tabs.Trigger value="voice" class="vp-tab">Voice</Tabs.Trigger>
    <Tabs.Trigger value="presets" class="vp-tab">Presets</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="voice" class="vp-tab-content">
    <div class="vp-section">
      <h3>Voice</h3>
      <div class="voice-row">
        {#each chitoseVoices as v (v.name)}
          <Button
            variant={baseVoice.name === v.name ? "primary" : "subtle"}
            size="sm"
            onclick={() => selectVoice(v)}
            title="Formant scale {v.formant.scale.toFixed(2)}"
          >
            {v.name}
            <span class="voice-role">{VOICE_ROLES[v.name] ?? ""}</span>
          </Button>
        {/each}
      </div>
      <p class="vp-voice-hint">
        {baseVoice.name} is the base voice. The sliders below shift the voice further!
      </p>
    </div>

    <div class="vp-section">
      <h3>Character</h3>
      <Field
        label="Gender"
        value={params.gender ?? 0}
        min={-1}
        max={1}
        step={0.01}
        format={(v) => v.toFixed(2)}
        hint="Negative = masculine, positive = feminine. Zero is the base voice's own register."
        onChange={(v) => (params.gender = v)}
      />
      <Field
        label="Breathiness"
        value={params.breathiness ?? 0.5}
        step={0.01}
        hint="Breath noise under the voice. Zero removes it entirely."
        onChange={(v) => (params.breathiness = v)}
      />
      <Field
        label="Tension"
        value={params.tension ?? 0.5}
        step={0.01}
        hint="Vocal-fold tension: higher = brighter, thinner, more harmonics."
        onChange={(v) => (params.tension = v)}
      />
      <Field
        label="Brightness"
        value={params.brightness ?? 0.5}
        step={0.01}
        hint="Shifts the vocal-tract formants upward for a brighter tone."
        onChange={(v) => (params.brightness = v)}
      />
      <Field
        label="Vibrato"
        value={params.vibratoAmount ?? 0.5}
        step={0.01}
        hint="Depth of the pitch-vibrato modulation."
        onChange={(v) => (params.vibratoAmount = v)}
      />
    </div>

    <button class="vp-adv-toggle" onclick={() => (advancedOpen = !advancedOpen)}>
      <span>{advancedOpen ? "Hide" : "Show"} advanced glottal controls</span>
      <span class="vp-adv-caret">{advancedOpen ? "▾" : "▸"}</span>
    </button>

    {#if advancedOpen}
      <div class="vp-section vp-advanced">
        <h3>Glottal Source</h3>
        <Field
          label="Open Quotient"
          value={params.oq ?? 0.5}
          min={0}
          max={1}
          step={0.01}
          hint="Fraction of the cycle the glottis is open. Higher = brighter, breathier."
          onChange={(v) => (params.oq = v)}
        />
        <Field
          label="Speed Quotient"
          value={params.sq ?? 2.4}
          min={1.3}
          max={5}
          step={0.1}
          hint="Asymmetry of the glottal pulse. Higher = more natural, rounded. Minimum 1.3: the LF model has no valid opening phase below that."
          onChange={(v) => (params.sq = v)}
        />
        <Field
          label="Shimmer"
          value={params.shimmer ?? 0.03}
          min={0}
          max={1}
          step={0.005}
          hint="Amplitude jitter (cycle-to-cycle variation)."
          onChange={(v) => (params.shimmer = v)}
        />
        <h3>Timbre</h3>
        <Field
          label="Formant Scale"
          value={params.fScale ?? 1}
          min={0}
          max={3}
          step={0.01}
          hint="Global scaling of the vocal-tract resonances."
          onChange={(v) => (params.fScale = v)}
        />
        <Field
          label="Formant Shift"
          value={params.fShift ?? 0}
          min={-24}
          max={24}
          step={1}
          hint="Semitone shift applied to all formants."
          onChange={(v) => (params.fShift = v)}
        />
        <Field label="Vibrato Rate" value={params.vRate ?? 5.5} min={0} max={20} step={0.1} onChange={(v) => (params.vRate = v)} />
        <Field label="Vibrato Attack" value={params.vAttack ?? 0.12} min={0} max={2} step={0.01} onChange={(v) => (params.vAttack = v)} />
      </div>
    {/if}
  </Tabs.Content>

  <Tabs.Content value="presets" class="vp-tab-content">
    <p class="vp-presets-hint">One-tap starting points. They set the character sliders; tweak from there.</p>
    <div class="preset-row">
      {#each PRESETS as p (p.name)}
        <Button variant="subtle" size="sm" onclick={() => applyPreset(p.values)}>
          <Sparkles size={13} />
          {p.name}
        </Button>
      {/each}
    </div>
  </Tabs.Content>
</Tabs.Root>

<style>
  .vp-adv-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: transparent;
    border: 1px dashed var(--border-strong);
    color: var(--text-dim);
    border-radius: var(--r-sm);
    padding: 8px 10px;
    font-size: 12px;
    cursor: pointer;
    margin: 4px 0 12px;
  }
  .vp-adv-toggle:hover {
    border-color: var(--accent-line);
    color: var(--text);
  }
  .vp-presets-hint {
    font-size: 12px;
    color: var(--text-faint);
    margin: 0 0 12px;
  }
  .voice-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .voice-role {
    margin-left: 5px;
    font-size: 10px;
    opacity: 0.65;
  }
  .vp-voice-hint {
    font-size: 12px;
    color: var(--text-faint);
    margin: 8px 0 0;
  }
</style>
