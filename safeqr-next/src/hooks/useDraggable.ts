// ============================================
// SafeQR v2 — Draggable Floating Button Hook
// ============================================
import { useRef, useCallback, useEffect } from "react";
import { getItem, setItem } from "@/lib/storage";

interface UseDraggableOptions {
  storageKeyX: string;
  storageKeyY: string;
  defaultRight?: number;
  defaultBottom?: number;
  edgeMargin?: number;
  snapDuration?: number;
}

interface DragState {
  x: number;
  y: number;
  dragging: boolean;
}

export function useDraggable(options: UseDraggableOptions) {
  const {
    storageKeyX,
    storageKeyY,
    defaultRight = 20,
    defaultBottom = 100,
    edgeMargin = 12,
    snapDuration = 300,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const stateRef = useRef<DragState>({
    x: getItem<number>(storageKeyX, defaultRight),
    y: getItem<number>(storageKeyY, defaultBottom),
    dragging: false,
  });

  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startElX: 0,
    startElY: 0,
  });

  const applyPosition = useCallback(
    (x: number, y: number, animate: boolean = false) => {
      const el = ref.current;
      if (!el) return;

      el.style.right = `${x}px`;
      el.style.bottom = `${y}px`;

      if (animate) {
        el.style.transition = `right ${snapDuration}ms cubic-bezier(0.16,1,0.3,1), bottom ${snapDuration}ms cubic-bezier(0.16,1,0.3,1)`;
        setTimeout(() => {
          el.style.transition = "";
        }, snapDuration);
      } else {
        el.style.transition = "";
      }
    },
    [snapDuration]
  );

  const snapToEdge = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const winW = window.innerWidth;
    const elW = el.offsetWidth || 60;
    const currentRight = parseInt(el.style.right || String(defaultRight), 10);

    // Snap to nearest edge
    const centerX = winW - currentRight - elW / 2;
    const targetRight = centerX < winW / 2 ? edgeMargin : edgeMargin;

    stateRef.current.x = targetRight;
    applyPosition(targetRight, stateRef.current.y, true);
    setItem(storageKeyX, targetRight);
  }, [defaultRight, edgeMargin, storageKeyX, applyPosition]);

  // Pointer event handlers
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;

      el.setPointerCapture(e.pointerId);

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startElX: parseInt(el.style.right || String(defaultRight), 10),
        startElY: parseInt(el.style.bottom || String(defaultBottom), 10),
      };

      stateRef.current.dragging = false;
    },
    [defaultRight, defaultBottom]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el || !el.hasPointerCapture(e.pointerId)) return;

      const dx = dragRef.current.startX - e.clientX;
      const dy = dragRef.current.startY - e.clientY;
      const newX = dragRef.current.startElX + dx;
      const newY = Math.max(
        edgeMargin,
        Math.min(window.innerHeight - 120, dragRef.current.startElY + dy)
      );

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        stateRef.current.dragging = true;
      }

      stateRef.current.x = newX;
      stateRef.current.y = newY;
      applyPosition(newX, newY);
    },
    [edgeMargin, applyPosition]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;

      el.releasePointerCapture(e.pointerId);

      setItem(storageKeyX, stateRef.current.x);
      setItem(storageKeyY, stateRef.current.y);

      setTimeout(() => snapToEdge(), 0);
    },
    [storageKeyX, storageKeyY, snapToEdge]
  );

  // Initialize position
  useEffect(() => {
    applyPosition(stateRef.current.x, stateRef.current.y);
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-snap on resize
  useEffect(() => {
    const handleResize = () => snapToEdge();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [snapToEdge]);

  const isDragging = useCallback(() => stateRef.current.dragging, []);

  return {
    ref,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    isDragging,
    snapToEdge,
  };
}
