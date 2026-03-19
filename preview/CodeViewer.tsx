import { useState, useCallback } from 'react'

interface CodeViewerProps {
  code: string
  fileName: string
}

/**
 * A lightweight code viewer panel with CSS-based syntax highlighting for TSX.
 * Shows/hides with a toggle button.
 */
export function CodeViewer({ code, fileName }: CodeViewerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return (
    <>
      <button
        type="button"
        className="code-viewer__toggle"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls="code-viewer-panel"
      >
        {isOpen ? 'Hide Source' : 'View Source'}
      </button>

      {isOpen && (
        <div
          id="code-viewer-panel"
          className="code-viewer__panel"
          role="region"
          aria-label="Source code viewer"
        >
          <div className="code-viewer__header">
            <span className="code-viewer__filename">{fileName}</span>
            <button
              type="button"
              className="code-viewer__close"
              onClick={toggle}
              aria-label="Close source code viewer"
            >
              &times;
            </button>
          </div>
          <pre className="code-viewer__pre">
            <code
              className="code-viewer__code"
              dangerouslySetInnerHTML={{ __html: highlightTsx(code) }}
            />
          </pre>
        </div>
      )}
    </>
  )
}

/** Escape HTML special characters. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const KEYWORDS = new Set([
  'import', 'export', 'from', 'const', 'let', 'var', 'function', 'return',
  'if', 'else', 'new', 'true', 'false', 'null', 'undefined', 'typeof',
  'void', 'class', 'extends', 'default', 'throw', 'try', 'catch', 'finally',
  'async', 'await', 'yield', 'interface', 'type', 'as', 'readonly', 'keyof',
  'infer', 'enum',
])

/**
 * Lightweight TSX syntax highlighter using a single-pass tokeniser.
 * Produces HTML with `<span class="hl-*">` wrappers for CSS-based colouring.
 *
 * This is intentionally simple -- it covers the common patterns found in
 * React demo code without pulling in a heavy highlighting library.
 */
function highlightTsx(source: string): string {
  // Combined regex that matches tokens in priority order.
  // The first matching group wins, so earlier alternatives take precedence.
  const tokenRe =
    /(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|(`(?:[^`\\]|\\.)*`)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(<\/?[A-Z][\w.]*)|\b(\d+(?:\.\d+)?)\b|\b([a-zA-Z_$][\w$]*)\b/g

  const parts: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(source)) !== null) {
    // Append any text between the previous match and this one
    if (match.index > lastIndex) {
      parts.push(escapeHtml(source.slice(lastIndex, match.index)))
    }

    const [
      fullMatch,
      lineComment,
      blockComment,
      templateLiteral,
      doubleString,
      singleString,
      jsxTag,
      number,
      identifier,
    ] = match

    if (lineComment !== undefined || blockComment !== undefined) {
      parts.push(`<span class="hl-comment">${escapeHtml(fullMatch)}</span>`)
    } else if (
      templateLiteral !== undefined ||
      doubleString !== undefined ||
      singleString !== undefined
    ) {
      parts.push(`<span class="hl-string">${escapeHtml(fullMatch)}</span>`)
    } else if (jsxTag !== undefined) {
      parts.push(`<span class="hl-tag">${escapeHtml(fullMatch)}</span>`)
    } else if (number !== undefined) {
      parts.push(`<span class="hl-number">${escapeHtml(fullMatch)}</span>`)
    } else if (identifier !== undefined) {
      if (KEYWORDS.has(identifier)) {
        parts.push(`<span class="hl-keyword">${escapeHtml(fullMatch)}</span>`)
      } else {
        parts.push(escapeHtml(fullMatch))
      }
    } else {
      parts.push(escapeHtml(fullMatch))
    }

    lastIndex = match.index + fullMatch.length
  }

  // Append remaining text
  if (lastIndex < source.length) {
    parts.push(escapeHtml(source.slice(lastIndex)))
  }

  return parts.join('')
}
