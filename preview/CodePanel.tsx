import { useCallback, useEffect, useRef, useState } from 'react'
import type { BundledLanguage } from 'shiki'
import { highlightCode } from './highlight'
import './CodePanel.css'

interface CodePanelProps {
  code: string
  lang: BundledLanguage
  title: string
  description?: string
}

export function CodePanel({ code, lang, title, description }: CodePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [copyLabel, setCopyLabel] = useState('コピー')

  useEffect(() => {
    let cancelled = false
    highlightCode(code, lang)
      .then((html) => {
        if (!cancelled) setHighlightedHtml(html)
      })
      .catch(() => { /* keep fallback visible */ })
    return () => { cancelled = true }
  }, [code, lang])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const openDialog = useCallback(() => {
    dialogRef.current?.showModal()
  }, [])

  const closeDialog = useCallback(() => {
    dialogRef.current?.close()
  }, [])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      dialogRef.current?.close()
    }
  }, [])

  const copyCode = useCallback(async () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    try {
      await navigator.clipboard.writeText(code)
      setCopyLabel('コピーしました!')
    } catch {
      setCopyLabel('コピー失敗')
    }
    copyTimerRef.current = setTimeout(() => setCopyLabel('コピー'), 2000)
  }, [code])

  return (
    <>
      <button
        className="code-panel__trigger"
        onClick={openDialog}
        type="button"
        aria-haspopup="dialog"
      >
        ソースコードを見る
      </button>

      <dialog
        ref={dialogRef}
        className="code-panel__dialog"
        onClick={handleBackdropClick}
      >
        <div className="code-panel__header">
          <span className="code-panel__title">{title}</span>
          <button
            className="code-panel__close"
            onClick={closeDialog}
            type="button"
            aria-label="閉じる"
          >
            &times;
          </button>
        </div>
        <div className="code-panel__body">
          {description && (
            <p className="code-panel__description">{description}</p>
          )}
          <div className="code-panel__code-wrapper">
            <button
              className="code-panel__copy"
              onClick={copyCode}
              type="button"
            >
              {copyLabel}
            </button>
            {highlightedHtml ? (
              <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
            ) : (
              <pre className="code-panel__code-fallback"><code>{code}</code></pre>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
