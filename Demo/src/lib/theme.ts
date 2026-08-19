import { writable } from "svelte/store";

export type AccentPreset = {
  id: string;
  name: string;
  color: string;
};

export const ACCENTS: AccentPreset[] = [
  { id: "teal", name: "Teal", color: "#2dd4bf" },
  { id: "ember", name: "Ember", color: "#ff6a3d" },
  { id: "amber", name: "Amber", color: "#f5a623" },
  { id: "lime", name: "Lime", color: "#b6f23c" },
  { id: "coral", name: "Coral", color: "#ff4d6d" },
  { id: "violet", name: "Violet", color: "#8b5cf6" },
  { id: "sky", name: "Sky", color: "#38bdf8" },
  { id: "bone", name: "Bone", color: "#e5e7eb" },
];

const STORAGE_KEY = "ichikara.accent";

function loadAccentId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ACCENTS.some((a) => a.id === stored)) return stored;
  } catch {}
  return "teal";
}

export const accentId = writable<string>(loadAccentId());

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Dark text on light accents, light text on dark accents.
function inkFor(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#10100f" : "#f6f7fb";
}

export function applyAccent(id: string): void {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0];
  const root = document.documentElement;
  const [r, g, b] = hexToRgb(a.color);
  root.style.setProperty("--accent", a.color);
  root.style.setProperty("--accent-ink", inkFor(a.color));
  root.style.setProperty("--accent-soft", `rgba(${r}, ${g}, ${b}, 0.16)`);
  root.style.setProperty("--accent-line", `rgba(${r}, ${g}, ${b}, 0.42)`);
}

accentId.subscribe((id) => {
  applyAccent(id);
  try { localStorage.setItem(STORAGE_KEY, id); } catch {}
});
