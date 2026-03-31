import { createHighlighter, type BundledLanguage, type Highlighter } from 'shiki'

let highlighterPromise: Promise<Highlighter> | null = null

/**
 * Get or create a shared Shiki highlighter instance.
 * Caches the instance across calls so the WASM is only loaded once.
 */
export function getHighlighter(langs: BundledLanguage[]): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs,
    })
  }
  return highlighterPromise
}

/**
 * Highlight a code string and return HTML.
 */
export async function highlightCode(
  code: string,
  lang: BundledLanguage,
): Promise<string> {
  const highlighter = await getHighlighter([lang])
  return highlighter.codeToHtml(code, { lang, theme: 'github-dark' })
}
