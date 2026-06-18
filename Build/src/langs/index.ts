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

/** Look up a language module by its identifier (case-insensitive).
 *  Supports shorthand and full ISO codes: "jp", "ja" -> Japanese;
 *  "en", "eng" -> English; "zh", "cmn" -> Mandarin. */
export function getLanguage(id: string): LanguageModule | undefined {
  return registry.get(id.toLowerCase());
}

/** Register a custom language module. The module's `id` is used as the
 *  lookup key (lowercased). Overwrites any existing entry with the same id. */
export function registerLanguage(lang: LanguageModule): void {
  registry.set(lang.id.toLowerCase(), lang);
}

export { japanese, english, mandarin, toCanonical, sequenceToCanonical };
