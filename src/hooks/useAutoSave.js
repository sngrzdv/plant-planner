import { useEffect, useRef, useState } from 'react'

/**
 * Debounced auto-save. Skips the first render (initial load).
 * @returns {'idle'|'saving'|'saved'|'error'}
 */
export function useAutoSave({ save, deps, enabled = true, delay = 700, resetKey }) {
  const [status, setStatus] = useState('idle')
  const isFirst = useRef(true)
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => {
    isFirst.current = true
  }, [resetKey])

  useEffect(() => {
    if (!enabled) return undefined

    if (isFirst.current) {
      isFirst.current = false
      return undefined
    }

    setStatus('saving')
    const timer = setTimeout(async () => {
      try {
        await saveRef.current()
        setStatus('saved')
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
      } catch {
        setStatus('error')
      }
    }, delay)

    return () => clearTimeout(timer)
  }, deps)

  return status
}
