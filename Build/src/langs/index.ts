import type { LanguageModule } from "../core/types"
import { japanese } from "./japanese"
import { english } from "./english"

const registry = new Map<string, LanguageModule>([
  ["jp", japanese], ["ja", japanese], ["en", english], ["eng", english],
])

export function getLanguage(id: string): LanguageModule | undefined {
  return registry.get(id.toLowerCase())
}

export function registerLanguage(lang: LanguageModule): void {
  registry.set(lang.id.toLowerCase(), lang)
}

export { japanese, english }
