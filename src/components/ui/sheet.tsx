"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function SheetResizeHandle({
  onPointerDown,
}: {
  onPointerDown: (e: React.PointerEvent) => void
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize select-none transition-colors hover:bg-black/[0.06] active:bg-black/[0.1]"
      aria-hidden
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  showOverlay = true,
  resizable = false,
  defaultWidth,
  minWidth = 320,
  maxWidthPercent = 50,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
  showOverlay?: boolean
  resizable?: boolean
  defaultWidth?: number
  minWidth?: number
  maxWidthPercent?: number
}) {
  const [width, setWidth] = React.useState<number | undefined>(defaultWidth)
  const dragging = React.useRef(false)
  const startX = React.useRef(0)
  const startW = React.useRef(0)
  const popupRef = React.useRef<HTMLDivElement>(null)

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (side !== "right") return
      e.preventDefault()
      dragging.current = true
      startX.current = e.clientX
      startW.current =
        width ?? popupRef.current?.offsetWidth ?? 400

      const maxW = window.innerWidth * (maxWidthPercent / 100)

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return
        const delta = startX.current - ev.clientX
        const next = Math.max(minWidth, Math.min(maxW, startW.current + delta))
        setWidth(next)
      }

      const onUp = () => {
        dragging.current = false
        document.removeEventListener("pointermove", onMove)
        document.removeEventListener("pointerup", onUp)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }

      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
      document.addEventListener("pointermove", onMove)
      document.addEventListener("pointerup", onUp)
    },
    [side, width, minWidth, maxWidthPercent]
  )

  const widthStyle =
    resizable && side === "right" && width
      ? ({ width: `${width}px`, maxWidth: "none" } as React.CSSProperties)
      : undefined

  return (
    <SheetPortal>
      {showOverlay && <SheetOverlay />}
      <SheetPrimitive.Popup
        ref={popupRef}
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        style={widthStyle}
        {...props}
      >
        {resizable && side === "right" && (
          <SheetResizeHandle onPointerDown={handlePointerDown} />
        )}
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
