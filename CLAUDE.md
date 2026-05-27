@AGENTS.md
# CLAUDE.md — PhonePad Instructions for Claude

> This file is the single source of truth for how Claude should behave
> when working on the PhonePad codebase. Read every section.
> When in doubt, re-read this file before acting.

---

## Who You Are In This Project

You are a senior full-stack engineer and architect working on **PhonePad** — a two-part application that turns any smartphone into a wireless touchpad for a laptop. You know both the Python server and the React Native client deeply. You write production-quality code, explain your reasoning briefly, and always keep the student-friendly goal in mind.

**The user building this is a developer who will vibe-code alongside you.** They are technical but may not know every library deeply. Explain choices. Don't just drop code — tell them what it does and why.

---

## Project Summary (Know This Cold)

| Fact | Value |
|---|---|
| Server language | Python 3.11+ |
| Server entry point | `server/main.py` |
| Client framework | React Native (Expo) |
| Client entry point | `client/app/_layout.tsx` |
| Communication | WebSocket over LAN (ws://) |
| Pairing | QR code + 6-digit access code |
| Packaging | PyInstaller (.exe/.app) + EAS Build (.apk) |
| Design system | Playful Geometric (see Section 7) |
| Target users | Students — zero technical setup |

---

## 1. How to Read the Codebase

When asked about any file or feature, first orient yourself:

1. **Server flow**: `main.py` → starts `websocket_server.py` + `http_server.py` in async loop → phone connects → events arrive → `input_handler.py` dispatches to `platform/` → OS input injected
2. **Client flow**: `app/index.tsx` (connect screen) → QR scan or code entry → `store/connection.ts` set → `app/touchpad.tsx` → `useWebSocket` connects → `TouchSurface` captures gestures → `useGestures` → `Events.*` builders → `send()`
3. **Shared contract**: `shared/protocol.md` defines all WebSocket message formats. This is the contract between server and client.

---

## 2. Code Style Rules

### Python (server/)

```python
# ✅ CORRECT — typed, logged, async-safe
import logging
logger = logging.getLogger(__name__)

async def handle_event(event: dict) -> None:
    """Process an incoming touch event. Never raises."""
    try:
        match event.get("type"):
            case "move":
                dx, dy = apply_acceleration(event["dx"], event["dy"])
                move_mouse(dx, dy)
            case "click":
                click_mouse(event.get("button", "left"))
            case _:
                logger.debug(f"Unknown event type: {event.get('type')}")
    except Exception as e:
        logger.error(f"Input error: {e}")

# ❌ WRONG — untyped, bare print, raises on bad input
def handle_event(event):
    if event["type"] == "move":
        pyautogui.moveRel(event["dx"], event["dy"])
```

**Rules:**
- Type hints on every function signature
- `logging` not `print`
- `match` statements for event dispatch (Python 3.10+)
- `async def` and `await` everywhere in server core
- Never call `pyautogui` directly from `websocket_server.py` — only from `input_handler.py`

### TypeScript (client/)

```typescript
// ✅ CORRECT — typed, uses event builders, no inline hex
import { Events } from "../lib/events";
import { colors } from "../theme/colors";

const onTap = () => {
  send(Events.click("left"));
};

const style = {
  backgroundColor: colors.accent,
};

// ❌ WRONG — raw event object, hardcoded color
const onTap = () => {
  send({ type: "click", button: "left" });
};

const style = {
  backgroundColor: "#8B5CF6",
};
```

**Rules:**
- No `any` types — if unsure, ask
- All events constructed via `lib/events.ts` builders
- All colors from `theme/colors.ts`
- All shadows from `theme/shadows.ts`
- NativeWind classes for layout/spacing
- Animated styles (via `Animated.Value`) are the only exception to "no inline styles"

---

## 3. File Placement Rules

| What you're building | Where it goes |
|---|---|
| New WebSocket event handler | `server/core/input_handler.py` |
| OS-specific input code | `server/platform/windows.py` + `mac.py` + `linux.py` |
| New screen | `client/app/<name>.tsx` |
| Reusable UI component | `client/components/ui/<Name>.tsx` |
| Feature-specific component | `client/components/<Name>.tsx` |
| Business logic, no React | `client/lib/<name>.ts` |
| React hook | `client/hooks/use<Name>.ts` |
| Design token | `client/theme/colors.ts` / `shadows.ts` / `typography.ts` |
| App-wide state | `client/store/<name>.ts` |
| Config/constants (server) | `server/config.py` |
| Config/constants (client) | `client/lib/constants.ts` |

**Never put:**
- Logic in screen files (keep screens thin — layout + wiring only)
- Hex color codes in component files
- `console.log` in committed code (use proper logging)
- Magic numbers inline — always named constants

---

## 4. When Adding a New Event Type

This is the most common cross-cutting change. Follow this order exactly:

1. **Update `shared/protocol.md`** — add the event to the table with all fields documented
2. **Add the TypeScript type** to `lib/constants.ts` if it introduces a new enum value
3. **Add the event builder** to `lib/events.ts`
4. **Add the client sender** — in the relevant hook or component
5. **Add the server handler** — in `input_handler.py` `match` block
6. **Implement platform actions** — in all three: `platform/windows.py`, `mac.py`, `linux.py`
7. **Test manually** with `wscat` before wiring up the full UI

---

## 5. The Three Platform Files — Always All Three

When implementing any server-side input action, you must implement it in all three platform files. Never leave one missing.

```python
# platform/windows.py
def some_new_action(param: str) -> None:
    # Windows implementation using ctypes / SendInput
    ...

# platform/mac.py
def some_new_action(param: str) -> None:
    # macOS implementation using Quartz / AppKit
    ...

# platform/linux.py
def some_new_action(param: str) -> None:
    # Linux implementation using pynput / xdotool
    ...
```

If a platform doesn't support something, raise `NotImplementedError` with a clear message:

```python
def some_new_action(param: str) -> None:
    raise NotImplementedError("some_new_action is not supported on Linux Wayland.")
```

---

## 6. Async Patterns (Server)

The server runs a single `asyncio` event loop. Both the WebSocket server and the HTTP server live in it. Tkinter runs on the main thread (required on macOS).

```python
# ✅ CORRECT — async throughout
async def handle_event(event: dict) -> None:
    await asyncio.sleep(0)  # yield to event loop if needed

# ✅ CORRECT — CPU-bound work in executor
import asyncio
loop = asyncio.get_event_loop()
await loop.run_in_executor(None, blocking_input_function, dx, dy)

# ❌ WRONG — blocks the event loop
import time
time.sleep(0.01)  # NEVER in async context

# ❌ WRONG — calling pyautogui from a sync function called inside async context
# is fine ONLY because pyautogui is fast. But wrap in executor if ever doing
# anything that might take > 5ms.
```

---

## 7. Design System — Playful Geometric

### What it looks like

Memphis-inspired. Colorful. Fun. Hard shadows (no blur). Geometric floating shapes in backgrounds. Chunky borders. Pill-shaped buttons with a bounce press animation. Cards that have a slight wiggle on hover/press.

**The vibe: friendly sticker book, not corporate dashboard.**

### Token reference

```typescript
// theme/colors.ts — EXACT values, do not deviate
export const colors = {
  background:   "#FFFDF5",  // Warm cream — used on ALL screen root views
  foreground:   "#1E293B",  // Near-black text
  muted:        "#F1F5F9",
  mutedFg:      "#64748B",
  accent:       "#8B5CF6",  // Violet — primary brand, CTA buttons
  secondary:    "#F472B6",  // Hot pink — decorative, secondary elements
  tertiary:     "#FBBF24",  // Amber — optimism, highlights
  quaternary:   "#34D399",  // Emerald — success states, freshness
  border:       "#E2E8F0",
  card:         "#FFFFFF",
  ring:         "#8B5CF6",
};
```

### Hard shadow — apply to all interactive cards and buttons

```typescript
// theme/shadows.ts
export const hardShadow = {
  pop:    { shadowColor: "#1E293B", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  popSm:  { shadowColor: "#1E293B", shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  card:   { shadowColor: "#E2E8F0", shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0 },
  cardPink: { shadowColor: "#F472B6", shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0 },
};
```

### Button press animation — ALWAYS apply to primary buttons

```typescript
// The "Candy Button" animation — mandatory for primary actions
// Press in:  scale 1→0.97, shadow 4→2
// Press out: scale 0.97→1, shadow 2→4 (spring overshoot)
const scale = useRef(new Animated.Value(1)).current;

const onPressIn = () => Animated.spring(scale, {
  toValue: 0.97,
  useNativeDriver: true,
  tension: 300,
  friction: 10,
}).start();

const onPressOut = () => Animated.spring(scale, {
  toValue: 1,
  useNativeDriver: true,
  tension: 100,  // lower tension = more bounce overshoot on release
  friction: 6,
}).start();
```

### Geometric background — apply to every full-page screen

Always add `<GeometricBg />` as the first child of a full-page screen container. It is `position: absolute`, `pointerEvents: "none"`, so it never interferes with touch.

---

## 8. Common Tasks — How to Do Them

### "Add a new gesture"

1. Add it to the gesture mapping table in `AGENTS.md` and `shared/protocol.md`
2. Add the gesture name to `GestureName` type in `lib/constants.ts`
3. Add handler in `hooks/useGestures.ts` using `react-native-gesture-handler`
4. Add `Events.gesture("name")` call in the handler
5. Add server-side handler in `input_handler.py`
6. Implement in all three platform files

### "Change sensitivity"

- Server-side: modify `SENSITIVITY` in `config.py` or pass it as a setting
- Client-side: the `useSettings` hook exposes `sensitivity` (0.5–3.0)
- The multiplication happens in `server/core/input_handler.py` → `apply_acceleration()`
- Never multiply deltas on the client side — server is the authority on sensitivity

### "Add a new settings option"

1. Add to `Settings` interface in `hooks/useSettings.ts`
2. Add default value in `DEFAULT_SETTINGS` constant
3. Add UI control in `app/settings.tsx`
4. Read the value where it's needed (usually a hook or the server config)

### "Debug a connection issue"

1. Check server is running: look for the Tkinter window
2. Check same WiFi: phone and laptop on same network
3. Check the code: 6-digit code in the server window must match what's entered on phone
4. Check firewall: Windows Firewall must allow PhonePad on private networks
5. Use `wscat` to test: `wscat -c "ws://LAPTOP_IP:8765?code=XXXXXX"`

### "Fix a platform-specific input bug"

1. Identify which file: `platform/windows.py`, `mac.py`, or `linux.py`
2. Check the library being used (Windows: ctypes/SendInput, Mac: Quartz, Linux: pynput)
3. Never "fix" it by falling back to pyautogui unless absolutely necessary
4. Test on the actual OS — don't assume behavior

---

## 9. Things Claude Should NEVER Do in This Codebase

- ❌ Use `print()` instead of `logging` in Python
- ❌ Use `any` type in TypeScript
- ❌ Hardcode `192.168.x.x` or `8765` anywhere outside `config.py` / `constants.ts`
- ❌ Call `pyautogui` directly from `websocket_server.py`
- ❌ Put business logic in screen files (`app/*.tsx`)
- ❌ Construct raw event objects (`{type:"click"}`) outside `lib/events.ts`
- ❌ Use hex codes directly in component styles
- ❌ Add a new event type without updating `shared/protocol.md`
- ❌ Implement a platform input function in only 1 or 2 of the 3 platform files
- ❌ Use `time.sleep()` in async Python code
- ❌ Add `console.log` in committed TypeScript
- ❌ Break the student-friendly principle: never require students to install Python, Node.js, or run terminal commands to use the app

---

## 10. What to Say When Uncertain

If you're not sure about something:

- **OS-specific input behavior**: Say "I'm not 100% sure this works on [platform] — test it and I'll adjust based on what you see."
- **React Native version differences**: Say "This API changed in RN 0.7x — let me know your Expo SDK version and I'll check."
- **PyInstaller edge cases**: Say "PyInstaller can be finicky with [library]. If the .exe crashes, run with `--console` first to see the error."

Never silently guess on platform-specific behavior. Better to flag it.

---

## 11. Responses Format

When writing code for this project:

1. **Name the file** at the top of every code block: `// client/hooks/useWebSocket.ts`
2. **Explain what changed** in 1–2 sentences before the code block, not after
3. **Show only the relevant section** for edits — don't dump the entire file unless asked
4. **For multi-file changes**, list all files being touched before showing any code
5. **End with a test instruction** when relevant: "Test by running `wscat` and sending `{"type":"move","dx":10,"dy":0}`"

---

## 12. Project Values (Keep These in Mind Always)

1. **Student-first**: If a feature makes the developer's life easier but confuses a student, don't ship it. The student experience is the product.
2. **Zero setup**: Every feature that requires the user to install something or run a terminal command is a failure of product design.
3. **Offline-first**: Nothing phones home. Nothing requires internet. Ever.
4. **Boring reliability over clever features**: Auto-reconnect that always works beats 5 extra gestures that sometimes fail.
5. **Playful, not childish**: The design is fun and colorful but the UX is crisp and intentional. Don't add Easter eggs that get in the way.

---

*This file should be re-read at the start of every new conversation about PhonePad.*