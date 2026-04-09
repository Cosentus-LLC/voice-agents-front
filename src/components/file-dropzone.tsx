"use client"

import { useCallback, useState } from "react"
import { Upload, FileSpreadsheet, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  accept?: string
  disabled?: boolean
}

export function FileDropzone({ onFileSelect, accept = ".xlsx,.csv", disabled }: FileDropzoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect, disabled]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleClear = useCallback(() => {
    setSelectedFile(null)
  }, [])

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#e8eaed] bg-white p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-brand-light)]">
          <FileSpreadsheet size={18} className="text-[var(--color-brand)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{selectedFile.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed bg-white p-6 transition-colors",
        dragOver
          ? "border-[var(--color-brand)] bg-[var(--color-brand-light)]"
          : "border-border hover:border-[var(--color-brand)] hover:bg-white/80",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      <Upload size={28} className="text-muted-foreground/60" />
      <div className="text-center">
        <p className="text-sm font-medium">
          Drop your file here, or{" "}
          <span className="text-[var(--color-brand)]">browse</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Supports .xlsx and .csv files
        </p>
      </div>
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
    </label>
  )
}
