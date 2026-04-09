"use client"

import { useCallback, useRef, useState } from "react"

/**
 * Manages a single HTML5 Audio element so only one preview plays at a time.
 * Returns the currently-playing voice_id (or null) and a toggle function.
 */
export function useAudioPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const toggle = useCallback((voiceId: string, previewUrl: string | null | undefined) => {
    if (!previewUrl) return

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute("src")
      audioRef.current.load()
    }

    if (playingId === voiceId) {
      setPlayingId(null)
      return
    }

    const audio = new Audio(previewUrl)
    audioRef.current = audio
    setPlayingId(voiceId)

    audio.play().catch(() => setPlayingId(null))
    audio.addEventListener("ended", () => setPlayingId(null), { once: true })
    audio.addEventListener("error", () => setPlayingId(null), { once: true })
  }, [playingId])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute("src")
      audioRef.current.load()
    }
    setPlayingId(null)
  }, [])

  return { playingId, toggle, stop }
}
