"use client"

import { useEffect, useState } from "react"
import { Volume2, AlertCircle } from "lucide-react"
import { getRecordingUrl } from "@/lib/api"

interface AudioPlayerProps {
  callId: string
  hasRecording?: boolean
}

export function AudioPlayer({ callId, hasRecording }: AudioPlayerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!hasRecording) return

    async function getUrl() {
      setLoading(true)
      setError(null)
      try {
        const url = await getRecordingUrl(callId)
        if (url) {
          setSignedUrl(url)
        } else {
          setError("Could not load recording")
        }
      } catch {
        setError("Could not load recording")
      }
      setLoading(false)
    }

    getUrl()
  }, [callId, hasRecording])

  if (!hasRecording) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4">
        <Volume2 size={18} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No recording available</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-4">
        <Volume2 size={18} className="text-muted-foreground animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading recording…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
        <AlertCircle size={18} className="text-red-600" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <Volume2 size={18} className="text-[var(--color-brand)]" />
        <span className="text-sm font-medium">Call Recording</span>
      </div>
      {signedUrl && (
        <audio controls className="w-full" preload="metadata">
          <source src={signedUrl} type="audio/wav" />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  )
}
