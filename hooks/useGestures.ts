// client/hooks/useGestures.ts
//
// Architecture: UNIFIED PAN + individual recognisers
// ──────────────────────────────────────────────────────────
//   • ONE Pan gesture (no minPointers/maxPointers) reads e.numberOfPointers
//     at runtime and dispatches to cursor-move / scroll / 3-finger-swipe /
//     4-finger-swipe channels.  This eliminates all multi-Pan conflicts.
//   • Tap gestures handle click / double-click (single-finger only).
//   • 2-finger tap → right click  (detected inside masterPan's onEnd)
//   • 3-finger tap → middle click (detected inside masterPan's onEnd)
//   • 4-finger tap → action center (detected inside masterPan's onEnd)
//   • LongPress → right-click (stationary hold ≥ 500 ms)
//   • Pinch → zoom in/out
// ──────────────────────────────────────────────────────────

import { useRef, useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { Events } from "../lib/events";

/* ───────── accumulating flush channel ───────── */
function createAccumulatingChannel(
  flushFn: (dx: number, dy: number) => void,
  interval: number
) {
  let accX = 0;
  let accY = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    if (accX !== 0 || accY !== 0) {
      flushFn(accX, accY);
      accX = 0;
      accY = 0;
    }
    timer = null;
  }

  return {
    push(dx: number, dy: number) {
      accX += dx;
      accY += dy;
      if (timer === null) {
        timer = setTimeout(flush, interval);
      }
    },
    forceFlush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      flush();
    },
    reset() {
      accX = 0;
      accY = 0;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

/* ───────── gesture mode enum ───────── */
type GestureMode = "idle" | "move" | "two_finger" | "scroll" | "zoom" | "swipe3" | "swipe4";

export function useGestures(send: (event: any) => void) {
  /* ── state refs ── */
  const lastXY = useRef({ x: 0, y: 0 });
  const mode = useRef<GestureMode>("idle");
  const maxPointers = useRef(0);
  const swipeTriggered = useRef(false);
  const gestureStartTime = useRef(0);
  const lastScale = useRef(1.0);
  const lastSingleTapTime = useRef(0);
  const isDragging = useRef(false);

  /* ── accumulating channels ── */
  const moveChannel = useMemo(
    () =>
      createAccumulatingChannel((dx, dy) => {
        send(Events.move(dx, dy));
      }, 8),
    [send]
  );

  const scrollChannel = useMemo(
    () =>
      createAccumulatingChannel((dx, dy) => {
        send(Events.scroll(dx, dy));
      }, 16),
    [send]
  );

  /* ─────────────────────────────────────────────────
   * MASTER PAN — single gesture, route by finger count
   * ───────────────────────────────────────────────── */
  const masterPan = Gesture.Pan()
    .minDistance(3)
    .onBegin((e) => {
      // onBegin fires on first touch BEFORE activation criteria (minDistance)
      maxPointers.current = e.numberOfPointers;
      gestureStartTime.current = Date.now();
    })
    .onStart((e) => {
      // onStart fires when minDistance(3) is crossed — this IS a drag
      maxPointers.current = Math.max(maxPointers.current, e.numberOfPointers);
      lastXY.current = { x: 0, y: 0 };
      swipeTriggered.current = false;
      moveChannel.reset();
      scrollChannel.reset();

      // Lock mode based on pointer count at activation
      const p = maxPointers.current;
      if (p === 1) {
        const now = Date.now();
        // Check if this drag was preceded by a quick single tap (tap-to-drag selection)
        if (now - lastSingleTapTime.current < 350) {
          isDragging.current = true;
          send(Events.mouseDown("left"));
        }
        mode.current = "move";
      }
      else if (p === 2) mode.current = "two_finger";
      else if (p === 3) mode.current = "swipe3";
      else mode.current = "swipe4";
    })
    .onUpdate((e) => {
      const currentP = e.numberOfPointers;
      maxPointers.current = Math.max(maxPointers.current, currentP);

      // ── Upgrade mode if more fingers appear (never downgrade) ──
      if (mode.current === "move" && maxPointers.current >= 2) {
        // Transition: flush pending cursor deltas, switch to scroll/swipe
        moveChannel.forceFlush();
        // If we were dragging/selecting, release it on upgrading fingers
        if (isDragging.current) {
          isDragging.current = false;
          send(Events.mouseUp("left"));
        }
        // Reset translation baseline to avoid a jump
        lastXY.current = { x: e.translationX, y: e.translationY };
        if (maxPointers.current === 2) mode.current = "two_finger";
        else if (maxPointers.current === 3) mode.current = "swipe3";
        else mode.current = "swipe4";
        return; // skip this frame
      }
      if (mode.current === "two_finger" && maxPointers.current >= 3) {
        lastXY.current = { x: e.translationX, y: e.translationY };
        if (maxPointers.current === 3) mode.current = "swipe3";
        else mode.current = "swipe4";
        return;
      }
      if (mode.current === "scroll" && maxPointers.current >= 3) {
        scrollChannel.forceFlush();
        lastXY.current = { x: e.translationX, y: e.translationY };
        if (maxPointers.current === 3) mode.current = "swipe3";
        else mode.current = "swipe4";
        return;
      }

      // ── Compute per-frame delta ──
      const dx = e.translationX - lastXY.current.x;
      const dy = e.translationY - lastXY.current.y;
      lastXY.current = { x: e.translationX, y: e.translationY };

      switch (mode.current) {
        case "move":
          moveChannel.push(dx, dy);
          break;

        case "two_finger": {
          // If we drag parallel fingers far enough, lock into scroll mode
          const distance = Math.sqrt(
            e.translationX * e.translationX + e.translationY * e.translationY
          );
          if (distance > 10) {
            mode.current = "scroll";
            // Adjust baseline to start scroll without jumping
            lastXY.current = { x: e.translationX, y: e.translationY };
          }
          break;
        }

        case "scroll": {
          // Natural scroll: drag up → content scrolls down → send negative dy
          // 0.05 converts touch-pixels → scroll "lines"
          const SCROLL_SCALE = 0.05;
          scrollChannel.push(-dx * SCROLL_SCALE, -dy * SCROLL_SCALE);
          break;
        }

        case "swipe3":
        case "swipe4": {
          if (swipeTriggered.current) break;
          const tx = e.translationX;
          const ty = e.translationY;
          const threshold = 50;

          if (Math.abs(tx) > threshold || Math.abs(ty) > threshold) {
            swipeTriggered.current = true;
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            ).catch(() => {});

            const prefix = mode.current === "swipe4" ? "swipe4_" : "swipe_";
            if (Math.abs(tx) > Math.abs(ty)) {
              send(
                Events.gesture(
                  (prefix + (tx > 0 ? "right" : "left")) as any
                )
              );
            } else {
              send(
                Events.gesture(
                  (prefix + (ty > 0 ? "down" : "up")) as any
                )
              );
            }
          }
          break;
        }
      }
    })
    .onEnd((e) => {
      moveChannel.forceFlush();
      scrollChannel.forceFlush();

      // ── Multi-finger TAP detection ──
      // If fingers touched and lifted with very little movement and short
      // duration, treat as a multi-finger tap.
      const elapsed = Date.now() - gestureStartTime.current;
      const distance = Math.sqrt(
        e.translationX * e.translationX + e.translationY * e.translationY
      );

      if (elapsed < 250 && distance < 15) {
        const p = maxPointers.current;
        if (p === 2) {
          // 2-finger tap → Right Click
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => {}
          );
          send(Events.click("right"));
        } else if (p === 3) {
          // 3-finger tap → Middle Click
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
            () => {}
          );
          send(Events.click("middle"));
        } else if (p >= 4) {
          // 4-finger tap → Action Center (Win+A)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(
            () => {}
          );
          send(Events.gesture("tap4" as any));
        }
      }

      mode.current = "idle";
    })
    .onFinalize((e) => {
      moveChannel.forceFlush();
      scrollChannel.forceFlush();

      // Clean up drag/selection press state
      if (isDragging.current) {
        isDragging.current = false;
        send(Events.mouseUp("left"));
      }

      // Record last tap time for double-tap-to-drag detection
      const elapsed = Date.now() - gestureStartTime.current;
      const distance = Math.sqrt(
        e.translationX * e.translationX + e.translationY * e.translationY
      );
      if (maxPointers.current === 1 && elapsed < 250 && distance < 15) {
        lastSingleTapTime.current = Date.now();
      }

      mode.current = "idle";
    });

  /* ─────────────────────────────────────────────────
   * 1-FINGER TAP  → Left Click
   * ───────────────────────────────────────────────── */
  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDistance(10)
    .maxDuration(200)
    .onEnd((_e, success) => {
      if (!success) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      send(Events.click("left"));
      lastSingleTapTime.current = Date.now();
    });

  /* ─────────────────────────────────────────────────
   * 1-FINGER DOUBLE TAP  → Double Click
   * ───────────────────────────────────────────────── */
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(300)
    .maxDistance(20)
    .maxDuration(250)
    .onEnd((_e, success) => {
      if (!success) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      send(Events.dblclick("left"));
    });

  /* ─────────────────────────────────────────────────
   * 1-FINGER LONG PRESS  → Right Click
   *   maxDist(10) cancels if finger moves (prevents
   *   accidental right-click during cursor drag)
   * ───────────────────────────────────────────────── */
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .maxDistance(10)
    .onStart(() => {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      send(Events.click("right"));
    });

  /* ─────────────────────────────────────────────────
   * 2-FINGER PINCH  → Zoom In/Out  (Ctrl + Scroll)
   * ───────────────────────────────────────────────── */
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      lastScale.current = 1.0;
    })
    .onUpdate((e) => {
      // Allow pinch zoom only if we are idle, in undecided two-finger state, or already zooming
      if (mode.current !== "idle" && mode.current !== "two_finger" && mode.current !== "zoom") {
        return;
      }

      // If in two-finger mode and scale diverges enough, lock to zoom and block scroll
      if (mode.current === "two_finger") {
        const totalPinchScale = Math.abs(e.scale - 1.0);
        if (totalPinchScale > 0.05) {
          mode.current = "zoom";
        } else {
          return;
        }
      }

      const diff = e.scale / lastScale.current;
      if (mode.current === "zoom") {
        if (diff > 1.05) {
          send(Events.gesture("pinch_out"));
          lastScale.current = e.scale;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {}
          );
        } else if (diff < 0.95) {
          send(Events.gesture("pinch_in"));
          lastScale.current = e.scale;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {}
          );
        }
      }
    });

  /* ─────────────────────────────────────────────────
   * COMPOSITION
   *
   * Simultaneous allows ALL gestures to independently track touches:
   *   – masterPan handles move/scroll/swipe (continuous)
   *   – tapGroup handles 1-finger tap / double-tap (discrete)
   *   – longPress handles 1-finger hold (discrete)
   *   – pinch handles 2-finger zoom (continuous)
   *
   * They don't conflict because:
   *   – Tap fires on lift with <200ms + <10px → masterPan never activated
   *   – Pan fires after 3px movement → Tap fails (exceeds maxDistance)
   *   – LongPress fires after 500ms hold → Pan never activated + Tap timed out
   *   – Pinch tracks scale; Pan tracks translation — independent axes
   * ───────────────────────────────────────────────── */
  const tapGroup = Gesture.Exclusive(doubleTapGesture, tapGesture);

  return Gesture.Simultaneous(tapGroup, masterPan, longPressGesture, pinchGesture);
}
