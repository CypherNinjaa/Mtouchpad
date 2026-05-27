# AGENTS.md — PhonePad AI Coding Agent Guide

> This file tells any AI coding agent (Cursor, Windsurf, Copilot, Claude Code, etc.)
> everything it needs to know to work on this codebase correctly.
> Read this entire file before touching any code.

---

## 1. Project Identity

**Name**: PhonePad
**Purpose**: Turn any smartphone into a wireless touchpad for a laptop over local WiFi.
**Architecture**: Two-part app — Python server (laptop) + React Native client (phone).
**Target users**: Students. Non-technical. Must be zero-setup to run.

---

## 2. Repo Structure (Understand This First)

```
phonepad/
├── server/          ← Python 3.11+ — runs on the laptop
│   ├── main.py      ← ENTRY POINT. Start here to understand server flow.
│   ├── config.py    ← All tunable constants live here. Change values here, not inline.
│   ├── core/        ← Business logic: WS server, input injection, pairing, network
│   ├── platform/    ← OS-specific input code: windows.py, mac.py, linux.py
│   ├── ui/          ← Tkinter status window + system tray
│   ├── assets/      ← icon.ico only
│   ├── requirements.txt
│   └── build.spec   ← PyInstaller config → produces .exe / .app
│
├── client/          ← React Native (Expo) — runs on the phone
│   ├── app/         ← Expo Router screens (_layout, index, touchpad, settings)
│   ├── components/  ← UI components. components/ui/ = design system primitives
│   ├── hooks/       ← Custom hooks (useWebSocket, useGestures, useHaptics, useSettings)
│   ├── lib/         ← Pure utility functions (no React, no side effects)
│   ├── store/       ← Zustand stores
│   ├── theme/       ← Design tokens (colors, shadows, typography)
│   ├── assets/      ← fonts/, images/
│   └── app.json     ← Expo config
│
├── shared/          ← Protocol spec + version. Read-only for both sides.
│   ├── protocol.md  ← Source of truth for all WebSocket message formats
│   └── version.txt
│
└── docs/            ← Human docs. Don't auto-edit these.
```

---

## 3. Coding Rules — Non-Negotiable

### 3.1 General

- **Never hardcode IP addresses, ports, or access codes** anywhere except `server/config.py`.
- **Never use `print()` for errors** — use `logging` module on the server side.
- **Never use `time.sleep()` in async context** — use `await asyncio.sleep()`.
- **Never call `pyautogui` functions directly from `websocket_server.py`** — all input goes through `input_handler.py`.
- **Never store secrets** (access codes, keys) in files — keep them in memory only.
- All magic numbers (ports, timeouts, sensitivity) must be constants in `config.py` or `constants.ts`.

### 3.2 Server (Python)

- Python version: **3.11+**. Use `match` statements, `tomllib`, type hints everywhere.
- Async-first: the WebSocket server and HTTP server share one `asyncio` event loop.
- All input injection is wrapped in `try/except` — a bad event must NEVER crash the server.
- Platform detection pattern: import from `platform/` based on `sys.platform` at startup. Do NOT scatter `if sys.platform == "win32"` checks throughout the code.
- Logging config:
  ```python
  import logging
  logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
  logger = logging.getLogger(__name__)
  ```
- Type hints are required on all function signatures.

### 3.3 Client (React Native / TypeScript)

- **TypeScript strict mode is on.** No `any` types. If you don't know the type, ask.
- File naming: `PascalCase` for components (`TouchSurface.tsx`), `camelCase` for hooks (`useWebSocket.ts`), `camelCase` for lib files (`events.ts`).
- **No inline styles** for design tokens — use NativeWind classes or the `theme/` constants. Exception: animated styles via `Animated.Value` must be inline.
- All touch targets must be **minimum 48px height** for accessibility.
- Every `useEffect` must have a cleanup function if it opens a resource (WebSocket, listener, timer).
- Never use `useState` for derived data — compute it.
- The `send()` function from `useWebSocket` must be called with objects from `lib/events.ts` builders only. Never construct raw event objects in component files.

### 3.4 Design System Rules

- Colors come from `theme/colors.ts` only. Never use hex codes directly in components.
- Hard shadows come from `theme/shadows.ts` only.
- Font families come from `theme/typography.ts` only.
- The "Candy Button" press animation (translate + shadow shrink) must be applied to ALL primary buttons — not just some.
- Geometric background shapes (`GeometricBg`) go on every full-page screen.
- All screens use `bg-background` (`#FFFDF5`) as the root background.

---

## 4. WebSocket Protocol — Source of Truth

> Always check `shared/protocol.md` before adding a new event type.
> If you add a new event, update `shared/protocol.md` first, then implement both sides.

### Event structure

Every message is a JSON object with a `type` field:

```typescript
interface BaseEvent {
  type: string;
  ts?: number; // Unix ms timestamp, optional, used for latency measurement
}
```

### Canonical event types

| type | Direction | Fields | Notes |
|---|---|---|---|
| `move` | phone→laptop | `dx: number, dy: number` | Float deltas. Apply acceleration on server. |
| `click` | phone→laptop | `button: "left"\|"right"\|"middle"` | Single click |
| `dblclick` | phone→laptop | `button: "left"` | Double click |
| `scroll` | phone→laptop | `dx: number, dy: number` | Negative dy = scroll down |
| `key` | phone→laptop | `key: string` | e.g. `"ctrl+c"`, `"backspace"`, `"alt+tab"` |
| `text` | phone→laptop | `value: string` | Direct text input |
| `media` | phone→laptop | `action: MediaAction` | See MediaAction enum below |
| `gesture` | phone→laptop | `name: GestureName` | Named system gestures |
| `ping` | phone→laptop | — | Heartbeat |
| `pong` | laptop→phone | `latency: number` | Server replies to ping with ms |
| `ack` | laptop→phone | `status: "ok"\|"error", message?: string` | Optional confirmation |

```typescript
// lib/constants.ts
export type MediaAction = "play_pause" | "next" | "prev" | "vol_up" | "vol_down" | "mute";
export type GestureName = "swipe_left" | "swipe_right" | "swipe_up" | "swipe_down" | "pinch_in" | "pinch_out";
```

### Event builders — use these, never raw objects

```typescript
// lib/events.ts — these are the ONLY way to create events in component code
export const Events = {
  move:    (dx: number, dy: number)      => ({ type: "move", dx, dy, ts: Date.now() }),
  click:   (button = "left")             => ({ type: "click", button }),
  dblclick:()                            => ({ type: "dblclick", button: "left" }),
  scroll:  (dx: number, dy: number)      => ({ type: "scroll", dx, dy }),
  key:     (key: string)                 => ({ type: "key", key }),
  text:    (value: string)               => ({ type: "text", value }),
  media:   (action: MediaAction)         => ({ type: "media", action }),
  gesture: (name: GestureName)           => ({ type: "gesture", name }),
  ping:    ()                            => ({ type: "ping", ts: Date.now() }),
};
```

---

## 5. Gesture Mapping Reference

| Fingers | Motion / Duration | Event sent | OS action |
|---|---|---|---|
| 1 | Move | `move` | Cursor movement |
| 1 | Tap < 200ms, < 5px | `click left` | Left click |
| 1 | Long press > 500ms | `click right` | Right click |
| 1 | Double tap < 300ms gap | `dblclick` | Double click |
| 2 | Vertical swipe | `scroll dy` | Vertical scroll |
| 2 | Horizontal swipe | `scroll dx` | Horizontal scroll |
| 2 | Pinch in | `gesture pinch_in` | Zoom out (Ctrl+-) |
| 2 | Pinch out | `gesture pinch_out` | Zoom in (Ctrl++) |
| 3 | Swipe left | `gesture swipe_left` | Alt+Left / Back |
| 3 | Swipe right | `gesture swipe_right` | Alt+Right / Forward |
| 3 | Swipe up | `gesture swipe_up` | Mission Control / Task View |
| 3 | Swipe down | `gesture swipe_down` | Show desktop |

---

## 6. Platform Input Layer

The server detects the OS once at startup and loads the correct platform module:

```python
# server/core/input_handler.py — platform dispatch
import sys

if sys.platform == "win32":
    from platform.windows import move_mouse, click_mouse, inject_key
elif sys.platform == "darwin":
    from platform.mac import move_mouse, click_mouse, inject_key
else:
    from platform.linux import move_mouse, click_mouse, inject_key
```

**When adding a new input action:**
1. Define the function signature in `core/input_handler.py` (the dispatcher)
2. Implement it in all three platform files: `platform/windows.py`, `platform/mac.py`, `platform/linux.py`
3. Never leave a platform file missing a function — use `NotImplementedError` as fallback

---

## 7. State Management (Client)

### Zustand store shape

```typescript
// store/connection.ts
interface ConnectionStore {
  // State
  status: "idle" | "connecting" | "connected" | "disconnected" | "error" | "auth_failed";
  serverUrl: string | null;
  latency: number | null;
  retryCount: number;

  // Actions
  setStatus: (status: ConnectionStore["status"]) => void;
  setServerUrl: (url: string) => void;
  setLatency: (ms: number) => void;
  incrementRetry: () => void;
  resetRetry: () => void;
}
```

### Settings (persisted via AsyncStorage)

```typescript
// hooks/useSettings.ts — persisted shape
interface Settings {
  sensitivity: number;      // 0.5 – 3.0, default 1.5
  scrollSpeed: number;      // 0.5 – 2.0, default 1.0
  hapticsEnabled: boolean;  // default true
  leftHandMode: boolean;    // default false
  reducedMotion: boolean;   // default false (auto-detect from OS)
}
```

---

## 8. Error Handling Patterns

### Server — always wrap input injection

```python
async def handle_event(event: dict) -> None:
    """Never raises. All errors are caught and logged."""
    try:
        t = event.get("type")
        if t == "move":
            dx, dy = apply_acceleration(event["dx"], event["dy"])
            move_mouse(dx, dy)
        elif t == "click":
            click_mouse(event.get("button", "left"))
        # ... etc
    except KeyError as e:
        logger.warning(f"Malformed event missing field: {e}")
    except PermissionError:
        logger.error("Input injection denied. Run as administrator.")
    except Exception as e:
        logger.error(f"Unexpected input error: {e}")
```

### Client — WebSocket reconnect with backoff

```typescript
// hooks/useWebSocket.ts — reconnect pattern
const BASE_DELAY = 1000;
const MAX_DELAY  = 15000;
const MAX_RETRIES = 10;

function getDelay(retryCount: number): number {
  return Math.min(BASE_DELAY * Math.pow(1.5, retryCount), MAX_DELAY);
}
```

**Do not retry on:**
- Close code `4001` (auth failure — wrong code)
- Close code `4002` (server full — max clients reached)

**Always retry on:**
- Close code `1006` (abnormal closure — network drop)
- Any other code

### Client — user-facing error messages

```typescript
// lib/errors.ts
export const ERROR_MESSAGES: Record<string, string> = {
  auth_failed:    "Wrong access code. Check the 6-digit code on your laptop.",
  timeout:        "Can't reach laptop. Make sure you're on the same WiFi network.",
  server_full:    "Laptop already has a connected phone.",
  network_error:  "WiFi connection lost. Reconnecting...",
};
```

---

## 9. Performance Constraints

| Metric | Hard Limit | Why |
|---|---|---|
| Move event rate | Max 60/sec | Matches display refresh; more is waste |
| Event payload size | Max 128 bytes | JSON, no compression needed |
| WS ping interval | Every 5 seconds | Detect stale connections |
| Reconnect max delay | 15 seconds | Don't annoy students |
| Server startup time | < 2 seconds | First impression |
| Input injection latency | < 5ms on same machine | pyautogui is fast enough |

### Throttle move events on client

```typescript
// hooks/useGestures.ts — throttle pattern
import { throttle } from "lodash";

const sendMove = throttle((dx: number, dy: number) => {
  send(Events.move(dx, dy));
}, 16); // ~60fps cap
```

---

## 10. Security Model

PhonePad is LAN-only with a session-scoped access code. The threat model is:

- ✅ **Mitigated**: Random person on internet controlling laptop (no port forwarding, LAN only)
- ✅ **Mitigated**: Neighbor on same network guessing code (6 digits, 3 wrong attempts → new code)
- ⚠️ **Accepted**: Determined attacker on same LAN with brute force time (acceptable for student use case)
- ❌ **Out of scope**: Encryption (ws:// not wss://) — adding TLS is Phase 2 enhancement

### Access code rate limiting

```python
# server/core/websocket_server.py
FAILED_ATTEMPTS: dict[str, int] = {}  # IP → fail count
MAX_ATTEMPTS = 3

async def handler(websocket, path):
    ip = websocket.remote_address[0]
    if FAILED_ATTEMPTS.get(ip, 0) >= MAX_ATTEMPTS:
        await websocket.close(4003, "Too many failed attempts")
        return

    if not verify_code(path):
        FAILED_ATTEMPTS[ip] = FAILED_ATTEMPTS.get(ip, 0) + 1
        await websocket.close(4001, "Invalid access code")
        return

    FAILED_ATTEMPTS.pop(ip, None)  # reset on success
    # ... proceed
```

---

## 11. Adding New Features — Checklist

Before implementing any new feature:

- [ ] Does it need a new event type? → Update `shared/protocol.md` first
- [ ] Does it need new server input? → Implement in all 3 platform files
- [ ] Does it need a new setting? → Add to `Settings` interface in `useSettings.ts`
- [ ] Does it need a new UI component? → Put it in `components/ui/` if it's reusable
- [ ] Does it affect packaging? → Test `.exe` and `.apk` builds after

---

## 12. Do Not Touch

These files/sections should NOT be auto-edited by an agent without explicit instruction:

| Path | Reason |
|---|---|
| `shared/protocol.md` | Manual consensus document. Human edits only. |
| `server/build.spec` | PyInstaller config. Fragile. Test any change on clean VM. |
| `client/eas.json` | EAS build config. Changes affect distribution pipeline. |
| `server/platform/windows.py` — `SendInput` struct | Low-level Win32. Don't "simplify" it. |
| `client/app/_layout.tsx` — font loading block | Font order matters. Don't reorder or add fonts without testing. |

---

## 13. Running Locally

### Server

```bash
cd server
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py
# → Tkinter window opens with QR code
# → Server listens on ws://0.0.0.0:8765
```

### Client

```bash
cd client
npm install
npx expo start
# → Scan the Expo QR with Expo Go app on your phone
# → OR run npx expo start --android for emulator
```

### Test the connection manually (no phone needed)

```bash
# Install wscat: npm install -g wscat
wscat -c "ws://localhost:8765?code=YOUR_CODE"
# Then type: {"type":"move","dx":50,"dy":0}
# → Cursor should move right on your screen
```

---

## 14. Commit Message Convention

```
feat(server): add media key support via pynput
fix(client): prevent double-fire on rapid tap gestures
refactor(server): extract platform dispatch to input_handler
docs: update protocol.md with media event schema
chore: bump websockets to 12.0
test(server): add unit tests for access code rate limiting
```

Format: `type(scope): description`
Scopes: `server`, `client`, `shared`, `docs`, `build`

---

*Last updated: see git log*
*Owner: see README.md*