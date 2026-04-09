"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getVoices } from "@/lib/api"
import type { Voice } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertTriangle,
  ChevronDown,
  Pause,
  Play,
  Plus,
  Search,
} from "lucide-react"
import { useAudioPreview } from "@/hooks/use-audio-preview"
import { AddVoiceModal } from "@/components/add-voice-modal"

function voiceSub(v: Voice): string {
  return [v.gender, v.accent].filter((l): l is string => !!l?.trim()).join(" · ")
}

/**
 * Dropdown voice picker. Displays voice name (or raw ID fallback) in the trigger,
 * opens a searchable list from the voice library.
 */
export function VoicePicker({
  value,
  onChange,
  className,
  initialVoices,
}: {
  value: string
  onChange: (voiceId: string) => void
  className?: string
  initialVoices?: Voice[]
}) {
  const [open, setOpen] = useState(false)
  const [voices, setVoices] = useState<Voice[]>(initialVoices ?? [])
  const [loaded, setLoaded] = useState(!!initialVoices)
  const [query, setQuery] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const { playingId, toggle, stop } = useAudioPreview()
  const searchRef = useRef<HTMLInputElement>(null)

  const fetchVoices = useCallback(async () => {
    try {
      const list = await getVoices()
      setVoices(list)
    } catch { /* toast handled elsewhere */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    fetchVoices()
  }, [fetchVoices])

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setQuery("")
      stop()
    }
  }, [open, stop])

  const selected = useMemo(
    () => voices.find((v) => v.voice_id === value),
    [voices, value]
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return voices
    const q = query.toLowerCase()
    return voices.filter(
      (v) =>
        (v.custom_name || v.name || "").toLowerCase().includes(q) ||
        v.voice_id.toLowerCase().includes(q)
    )
  }, [voices, query])

  const triggerLabel = selected
    ? selected.custom_name || selected.name
    : value
      ? loaded ? value : "\u00A0"
      : "Select voice"

  const isUnknown = !!value && !selected && loaded

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "inline-flex h-9 w-full items-center gap-1.5 overflow-hidden rounded-lg border border-input bg-white px-3 text-left text-xs transition-colors hover:bg-muted/40",
                isUnknown && "border-amber-300 bg-amber-50/50",
                className
              )}
            />
          }
        >
          {isUnknown && <AlertTriangle size={13} className="shrink-0 text-amber-500" />}
          <span className={cn("min-w-0 truncate", isUnknown ? "font-mono text-amber-700" : "text-foreground")}>
            {triggerLabel}
          </span>
          <ChevronDown size={14} className="ml-auto shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-80 overflow-hidden rounded-xl border border-solid border-black/[0.12] p-0 shadow-md"
        >
          <div className="border-b border-black/[0.06] px-3 py-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search voices…"
                className="h-8 border-0 bg-transparent pl-8 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[280px]">
            <div className="p-1.5">
              {!loaded ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  {query ? "No matches" : "No voices in library"}
                </div>
              ) : (
                filtered.map((v) => {
                  const isActive = v.voice_id === value
                  const isPlaying = playingId === v.voice_id
                  const sub = voiceSub(v)
                  return (
                    <div
                      key={v.voice_id}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                        isActive
                          ? "bg-[var(--color-brand-light)]"
                          : "hover:bg-black/[0.04]"
                      )}
                    >
                      {v.preview_url ? (
                        <button
                          type="button"
                          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white transition-colors hover:bg-[var(--color-brand-dark)]"
                          onClick={(e) => { e.stopPropagation(); toggle(v.voice_id, v.preview_url) }}
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {isPlaying ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" className="ml-px" />}
                        </button>
                      ) : (
                        <div className="size-7 shrink-0" />
                      )}
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => { onChange(v.voice_id); setOpen(false) }}
                      >
                        <p className="truncate text-sm font-medium text-foreground">
                          {v.custom_name || v.name}
                        </p>
                        {sub && (
                          <p className="truncate text-[11px] text-muted-foreground">{sub}</p>
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-black/[0.06] px-3 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand-light)]"
              onClick={() => { setOpen(false); setAddOpen(true) }}
            >
              <Plus size={14} />
              Add new voice…
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <AddVoiceModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(v) => {
          setVoices((prev) => [...prev, v])
          onChange(v.voice_id)
        }}
      />
    </>
  )
}

/**
 * Resolves a voice_id to a Voice object from a pre-fetched list.
 * Used in config sections that show read-only voice info.
 */
export function useResolvedVoice(voiceId: string) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getVoices()
      .then(setVoices)
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const voice = useMemo(
    () => voices.find((v) => v.voice_id === voiceId) ?? null,
    [voices, voiceId]
  )

  return { voice, voices, loaded }
}
