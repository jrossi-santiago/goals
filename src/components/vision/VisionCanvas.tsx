"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VisionItem } from "@/types/database";

export type VisionItemWithUrl = VisionItem & { imageUrl: string | null };

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const BOARD_WIDTH = 1440;
const BOARD_HEIGHT = 960;

export function VisionCanvas({
  initialItems,
  userId,
}: {
  initialItems: VisionItemWithUrl[];
  userId: string;
}) {
  const [items, setItems] = useState<VisionItemWithUrl[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [uploading, setUploading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panState = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(
    null
  );
  const pinchState = useRef<{
    startDist: number;
    startZoom: number;
    startMidX: number;
    startMidY: number;
    startViewX: number;
    startViewY: number;
  } | null>(null);
  const isPinchingRef = useRef(false);

  const maxZ = items.reduce((m, i) => Math.max(m, i.z_index), 0);

  // Center the fixed-size board in whatever viewport we're given (phone or desktop) on first render.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setView((v) => ({
      ...v,
      x: (rect.width - BOARD_WIDTH * v.zoom) / 2,
      y: (rect.height - BOARD_HEIGHT * v.zoom) / 2,
    }));
  }, []);

  const persist = useCallback(
    (id: string, patch: Partial<VisionItem>) => {
      if (id.startsWith("temp-")) return;
      supabase.from("vision_items").update(patch).eq("id", id).then();
    },
    [supabase]
  );

  function updateItem(id: string, patch: Partial<VisionItemWithUrl>, opts?: { persist?: boolean }) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    if (opts?.persist !== false) persist(id, patch);
  }

  function bringToFront(id: string) {
    const next = maxZ + 1;
    updateItem(id, { z_index: next });
  }

  async function deleteItem(id: string) {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
    if (id.startsWith("temp-")) return;
    await supabase.from("vision_items").delete().eq("id", id);
    if (item?.type === "image" && item.image_path) {
      await supabase.storage.from("vision-images").remove([item.image_path]);
    }
  }

  function nextPlacement() {
    const count = items.length;
    return { x: 80 + (count % 6) * 40, y: 80 + (count % 6) * 30 };
  }

  async function addText(kind: "text" | "note") {
    const { x, y } = nextPlacement();
    const tempId = `temp-${Date.now()}`;
    const optimistic: VisionItemWithUrl = {
      id: tempId,
      user_id: userId,
      type: kind,
      content: kind === "text" ? "New quote" : "New note",
      image_path: null,
      x,
      y,
      width: kind === "text" ? 260 : 220,
      height: kind === "text" ? 160 : 140,
      z_index: maxZ + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      imageUrl: null,
    };
    setItems((prev) => [...prev, optimistic]);
    setSelectedId(tempId);

    const { data, error } = await supabase
      .from("vision_items")
      .insert({
        type: kind,
        content: optimistic.content,
        x,
        y,
        width: optimistic.width,
        height: optimistic.height,
        z_index: optimistic.z_index,
      })
      .select()
      .single();

    if (error || !data) {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === tempId ? { ...(data as VisionItem), imageUrl: null } : i))
    );
    setSelectedId(data.id);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    setUploading(true);

    const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("vision-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("vision-images").getPublicUrl(path);
    const { x, y } = nextPlacement();

    const { data, error } = await supabase
      .from("vision_items")
      .insert({
        type: "image",
        image_path: path,
        x,
        y,
        width: 280,
        height: 220,
        z_index: maxZ + 1,
      })
      .select()
      .single();

    setUploading(false);
    if (error || !data) return;
    setItems((prev) => [...prev, { ...(data as VisionItem), imageUrl: urlData.publicUrl }]);
    setSelectedId(data.id);
  }

  // ---- Pan & zoom ----

  // Keep the board point under (clientX, clientY) fixed on screen while zooming to nextZoomRaw.
  function zoomAtPoint(nextZoomRaw: number, clientX: number, clientY: number) {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoomRaw));
    setView((v) => {
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const boardX = (localX - v.x) / v.zoom;
      const boardY = (localY - v.y) / v.zoom;
      return { zoom: nextZoom, x: localX - boardX * nextZoom, y: localY - boardY * nextZoom };
    });
  }

  function onViewportPointerDown(e: React.PointerEvent) {
    if (pinchState.current) return;
    // Cards stopPropagation() on their own pointerdown, so anything reaching
    // here is a click on empty board (or off-board) space.
    setSelectedId(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    panState.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y };
  }

  function onViewportPointerMove(e: React.PointerEvent) {
    if (!panState.current || pinchState.current) return;
    const dx = e.clientX - panState.current.startX;
    const dy = e.clientY - panState.current.startY;
    setView((v) => ({ ...v, x: panState.current!.viewX + dx, y: panState.current!.viewY + dy }));
  }

  function endPan() {
    panState.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomAtPoint(view.zoom - e.deltaY * 0.001, e.clientX, e.clientY);
  }

  function zoomBy(delta: number) {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAtPoint(view.zoom + delta, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function fitToScreen() {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const zoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min(rect.width / BOARD_WIDTH, rect.height / BOARD_HEIGHT) * 0.94)
    );
    setView({ zoom, x: (rect.width - BOARD_WIDTH * zoom) / 2, y: (rect.height - BOARD_HEIGHT * zoom) / 2 });
  }

  // ---- Pinch to zoom (touch) ----

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      panState.current = null;
      isPinchingRef.current = true;
      const [t1, t2] = [e.touches[0], e.touches[1]];
      pinchState.current = {
        startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        startZoom: view.zoom,
        startMidX: (t1.clientX + t2.clientX) / 2,
        startMidY: (t1.clientY + t2.clientY) / 2,
        startViewX: view.x,
        startViewY: view.y,
      };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    const p = pinchState.current;
    const el = viewportRef.current;
    if (!p || !el || e.touches.length < 2) return;
    const [t1, t2] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, p.startZoom * (dist / p.startDist)));

    const rect = el.getBoundingClientRect();
    const startLocalX = p.startMidX - rect.left;
    const startLocalY = p.startMidY - rect.top;
    const boardX = (startLocalX - p.startViewX) / p.startZoom;
    const boardY = (startLocalY - p.startViewY) / p.startZoom;

    const nowLocalX = midX - rect.left;
    const nowLocalY = midY - rect.top;

    setView({ zoom: nextZoom, x: nowLocalX - boardX * nextZoom, y: nowLocalY - boardY * nextZoom });
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchState.current = null;
    if (e.touches.length === 0) isPinchingRef.current = false;
  }

  return (
    <div className="relative flex h-[calc(100vh-56px)] flex-col sm:h-[calc(100vh-57px)]">
      <div className="flex items-center justify-end border-b border-line px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => addText("note")}
            className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-black/5"
          >
            + Note
          </button>
          <button
            onClick={() => addText("text")}
            className="rounded-full border border-line px-3 py-1.5 text-sm hover:bg-black/5"
          >
            + Text
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "+ Image"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>
      </div>

      <div
        ref={viewportRef}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onWheel={onWheel}
        className="relative flex-1 touch-none overflow-hidden bg-black/[0.03]"
      >
        <div
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            transformOrigin: "0 0",
          }}
          className="card absolute left-0 top-0 overflow-hidden bg-[radial-gradient(var(--line)_1px,transparent_1px)] [background-size:22px_22px]"
        >
          {items.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="font-hand text-2xl text-ink-soft">
                An empty board. Add a photo, a quote, or a note.
              </p>
            </div>
          )}

          {items.map((item) => (
            <VisionCard
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              zoom={view.zoom}
              isPinchingRef={isPinchingRef}
              onSelect={() => {
                setSelectedId(item.id);
                bringToFront(item.id);
              }}
              onUpdate={(patch, opts) => updateItem(item.id, patch, opts)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full border border-line bg-paper-raised px-1.5 py-1 shadow-sm">
        <button
          onClick={fitToScreen}
          className="rounded-full px-2 h-7 text-xs hover:bg-black/5"
          aria-label="Fit board to screen"
        >
          Fit
        </button>
        <div className="mx-0.5 h-4 w-px bg-line" />
        <button onClick={() => zoomBy(-0.15)} className="h-7 w-7 rounded-full text-sm hover:bg-black/5">
          −
        </button>
        <span className="w-10 text-center text-xs text-ink-soft">{Math.round(view.zoom * 100)}%</span>
        <button onClick={() => zoomBy(0.15)} className="h-7 w-7 rounded-full text-sm hover:bg-black/5">
          +
        </button>
      </div>
    </div>
  );
}

function VisionCard({
  item,
  selected,
  zoom,
  isPinchingRef,
  onSelect,
  onUpdate,
  onDelete,
}: {
  item: VisionItemWithUrl;
  selected: boolean;
  zoom: number;
  isPinchingRef: React.RefObject<boolean>;
  onSelect: () => void;
  onUpdate: (patch: Partial<VisionItemWithUrl>, opts?: { persist?: boolean }) => void;
  onDelete: () => void;
}) {
  const dragState = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null);
  const [editing, setEditing] = useState(false);

  function onDragPointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    onSelect();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, x: item.x, y: item.y };
  }

  function onDragPointerMove(e: React.PointerEvent) {
    if (!dragState.current || isPinchingRef.current) return;
    const dx = (e.clientX - dragState.current.startX) / zoom;
    const dy = (e.clientY - dragState.current.startY) / zoom;
    onUpdate({ x: dragState.current.x + dx, y: dragState.current.y + dy }, { persist: false });
  }

  function endDrag() {
    if (!dragState.current) return;
    dragState.current = null;
    onUpdate({ x: item.x, y: item.y });
  }

  function onResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    resizeState.current = { startX: e.clientX, startY: e.clientY, w: item.width, h: item.height };
  }

  function onResizePointerMove(e: React.PointerEvent) {
    if (!resizeState.current || isPinchingRef.current) return;
    const dx = (e.clientX - resizeState.current.startX) / zoom;
    const dy = (e.clientY - resizeState.current.startY) / zoom;
    onUpdate(
      {
        width: Math.max(120, resizeState.current.w + dx),
        height: Math.max(80, resizeState.current.h + dy),
      },
      { persist: false }
    );
  }

  function endResize() {
    if (!resizeState.current) return;
    resizeState.current = null;
    onUpdate({ width: item.width, height: item.height });
  }

  return (
    <div
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.z_index,
      }}
      className={`absolute select-none ${selected ? "ring-2 ring-ink" : ""}`}
    >
      <div
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="card h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      >
        {item.type === "image" && item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}

        {item.type !== "image" &&
          (editing ? (
            <textarea
              autoFocus
              defaultValue={item.content ?? ""}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => {
                setEditing(false);
                onUpdate({ content: e.target.value });
              }}
              className={`h-full w-full resize-none border-none bg-transparent p-3 text-sm outline-none ${
                item.type === "text" ? "font-hand text-lg leading-snug" : ""
              }`}
            />
          ) : (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className={`h-full w-full whitespace-pre-wrap p-3 text-sm ${
                item.type === "text"
                  ? "font-hand text-lg leading-snug text-ink"
                  : "bg-[#f2f2ef] text-ink"
              }`}
            >
              {item.content || <span className="text-ink-soft">Double-tap to edit…</span>}
            </div>
          ))}
      </div>

      {selected && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper-raised text-xs shadow-sm hover:bg-red-50"
            aria-label="Delete"
          >
            ×
          </button>
          <div
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize rounded-full border border-line bg-paper-raised shadow-sm"
          />
        </>
      )}
    </div>
  );
}
