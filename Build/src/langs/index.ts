import type { LanguageModule } from "../core/types";
import { japanese } from "./japanese";
import { english } from "./english";
import { mandarin } from "./mandarin";
import { toCanonical, sequenceToCanonical } from "./alias";

const registry = new Map<string, LanguageModule>([
  ["jp", japanese],
  ["ja", japanese],
  ["en", english],
  ["eng", english],
  ["zh", mandarin],
  ["cmn", mandarin],
]);

export function getLanguage(id: string): LanguageModule | undefined {
  return registry.get(id.toLowerCase());
}

export function registerLanguage(lang: LanguageModule): void {
  registry.set(lang.id.toLowerCase(), lang);
}

export { japanese, english, mandarin, toCanonical, sequenceToCanonical };
