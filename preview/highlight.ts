import { createHighlighter, type BundledLanguage, type Highlighter } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null
const loadedLangs = new Set<string>()

/**
 * Get or create a shared Shiki highlighter instance.
 * Loads additional languages on demand if not already loaded.
 */
export async function getHighlighter(langs: BundledLanguage[]): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs,
    })
    for (const lang of langs) loadedLangs.add(lang)
    return highlighterPromise
  }

  const highlighter = await highlighterPromise
  const missing = langs.filter((l) => !loadedLangs.has(l))
  if (missing.length > 0) {
    await Promise.all(missing.map((l) => highlighter.loadLanguage(l)))
    for (const l of missing) loadedLangs.add(l)
  }
  return highlighter
}

/**
 * Highlight a code string and return HTML.
 * Safe to call from any page — the highlighter is shared and cached.
 */
export async function highlightCode(
  code: string,
  lang: BundledLanguage,
): Promise<string> {
  const highlighter = await getHighlighter([lang])
  return highlighter.codeToHtml(code, { lang, theme: 'github-dark' })
}
