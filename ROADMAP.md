# 📱➡️💻 PhonePad — Complete Project Roadmap

> **Mission**: Turn any smartphone into a fully-featured wireless touchpad for a laptop, with student-friendly one-click install, working 100% offline over local WiFi.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack Decision](#2-tech-stack-decision)
3. [Full Folder Structure](#3-full-folder-structure)
4. [Design System Integration](#4-design-system-integration)
5. [Development Plan (Phase-by-Phase)](#5-development-plan-phase-by-phase)
6. [Server Implementation Guide](#6-server-implementation-guide)
7. [Phone Client Implementation Guide](#7-phone-client-implementation-guide)
8. [Error Handling Strategy](#8-error-handling-strategy)
9. [Distribution & Packaging](#9-distribution--packaging)
10. [UI Component Specs](#10-ui-component-specs)
11. [Testing Plan](#11-testing-plan)
12. [Vibe-Coding Checklist](#12-vibe-coding-checklist)

---

## 1. Project Overview

### What we are building

**PhonePad** — a two-part application:

| Part | Runs on | Role |
|---|---|---|
| **Server** | Windows / Mac / Linux laptop | Hosts a WebSocket server, serves the phone UI, injects mouse/keyboard input into the OS |
| **Client** | Android / iOS phone | Touch surface that captures gestures and streams events to the server |

### Core requirements

- ✅ Works 100% offline — same WiFi network only
- ✅ Student-friendly install — double-click `.exe` or `.apk`, nothing else
- ✅ Cross-platform server (Windows, Mac, Linux)
- ✅ Cross-platform client (Android .apk, iOS .ipa)
- ✅ Pairing via QR code + 6-digit access code
- ✅ All core touchpad gestures (move, click, scroll, swipe, pinch)
- ✅ Virtual keyboard
- ✅ Haptic feedback on phone

---

## 2. Tech Stack Decision

### Server (Laptop)

| Concern | Choice | Why |
|---|---|---|
| Language | **Python 3.11+** | Cross-platform input injection, rich ecosystem, PyInstaller packaging |
| WebSocket | **`websockets` library** | Async, lightweight, zero config |
| HTTP (serve phone UI) | **`aiohttp`** | Async, works alongside WebSocket in same event loop |
| Mouse/keyboard control | **`pyautogui` + `pynput`** | Works on Windows, Mac, Linux. pyautogui for movement/click, pynput for media keys |
| QR code generation | **`qrcode[pil]`** | Simple, outputs PNG |
| Packaging to `.exe` | **PyInstaller** | Bundles Python + all deps into single file. No runtime needed |
| UI (server status window) | **`tkinter`** (built-in) or **web browser** | Tkinter = truly zero-dep. Browser = nicer look |

### Client (Phone)

| Concern | Choice | Why |
|---|---|---|
| Framework | **React Native (Expo)** | Single codebase → `.apk` + `.ipa`, large ecosystem, easy gesture handling |
| Gestures | **`react-native-gesture-handler`** | Best-in-class, supports 1/2/3 finger gestures |
| WebSocket | **`react-native-websocket` / built-in `WebSocket` API** | Native WebSocket exists in React Native, no extra dep needed |
| QR scanner | **`expo-camera` + `expo-barcode-scanner`** | Built into Expo, works on both platforms |
| Haptics | **`expo-haptics`** | Simple, cross-platform |
| Navigation | **`expo-router`** | File-based routing, easy to reason about |
| Styling | **NativeWind (Tailwind for RN)** | Implement Playful Geometric design system tokens |

### Communication Protocol

```
Phone  ──── WebSocket (ws://192.168.x.x:8765) ────  Laptop
       ──── HTTP GET /                          ────  (serves phone web fallback)
```

**Event message format (JSON over WebSocket):**

```json
// Mouse move
{ "type": "move", "dx": 5.2, "dy": -3.1, "ts": 1718000000000 }

// Click
{ "type": "click", "button": "left" | "right" | "middle" }

// Double click
{ "type": "dblclick", "button": "left" }

// Scroll
{ "type": "scroll", "dx": 0, "dy": -3 }

// Keyboard
{ "type": "key", "key": "ctrl+c" }

// Text input
{ "type": "text", "value": "hello world" }

// Media key
{ "type": "media", "action": "play_pause" | "next" | "prev" | "vol_up" | "vol_down" | "mute" }

// Gesture (3-finger swipe)
{ "type": "gesture", "name": "swipe_left" | "swipe_right" | "swipe_up" | "swipe_down" }

// Ping/heartbeat
{ "type": "ping" }
```

---

## 3. Full Folder Structure

```
phonepad/
│
├── 📁 server/                          # Python laptop server
│   ├── main.py                         # Entry point — starts all services
│   ├── config.py                       # App config (port, version, etc.)
│   ├── 📁 core/
│   │   ├── __init__.py
│   │   ├── websocket_server.py         # WebSocket event loop + handler
│   │   ├── http_server.py              # Serves static phone web client
│   │   ├── input_handler.py            # Translates events → OS mouse/keyboard
│   │   ├── gesture_handler.py          # Interprets gesture events
│   │   ├── pairing.py                  # QR code + access code generation
│   │   └── network.py                  # LAN IP detection, mDNS
│   ├── 📁 platform/
│   │   ├── __init__.py
│   │   ├── windows.py                  # Windows-specific input (SendInput API)
│   │   ├── mac.py                      # macOS-specific input (Quartz)
│   │   └── linux.py                    # Linux-specific input (xdotool / uinput)
│   ├── 📁 ui/
│   │   ├── tray.py                     # System tray icon (pystray)
│   │   └── status_window.py            # Tkinter status + QR display window
│   ├── 📁 assets/
│   │   └── icon.ico                    # App icon for .exe
│   ├── requirements.txt                # All Python dependencies
│   ├── build.spec                      # PyInstaller spec file
│   └── build.sh / build.bat            # One-command build scripts
│
├── 📁 client/                          # React Native (Expo) phone app
│   ├── app.json                        # Expo config
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js              # NativeWind / design tokens
│   ├── babel.config.js
│   │
│   ├── 📁 app/                         # Expo Router screens
│   │   ├── _layout.tsx                 # Root layout, fonts, providers
│   │   ├── index.tsx                   # Connect screen (QR scan / code entry)
│   │   ├── touchpad.tsx                # Main touchpad surface screen
│   │   └── settings.tsx                # Sensitivity, haptics, theme
│   │
│   ├── 📁 components/
│   │   ├── 📁 ui/                      # Design system primitives
│   │   │   ├── Button.tsx              # Candy button variant
│   │   │   ├── Card.tsx                # Sticker card variant
│   │   │   ├── Input.tsx               # Styled text input
│   │   │   ├── Badge.tsx               # Colored badge
│   │   │   └── GeometricBg.tsx         # Floating shape decorations
│   │   ├── TouchSurface.tsx            # Core gesture capture area
│   │   ├── GestureBar.tsx              # Bottom bar (click, scroll, keyboard)
│   │   ├── KeyboardPanel.tsx           # Virtual keyboard overlay
│   │   ├── MediaControls.tsx           # Play/pause/volume buttons
│   │   ├── ConnectionStatus.tsx        # Dot indicator + latency
│   │   ├── QRScanner.tsx               # Camera QR scanner
│   │   └── AccessCodeEntry.tsx         # 6-digit manual code input
│   │
│   ├── 📁 hooks/
│   │   ├── useWebSocket.ts             # WS connection lifecycle
│   │   ├── useGestures.ts              # Gesture state machine
│   │   ├── useHaptics.ts               # Haptic feedback wrapper
│   │   └── useSettings.ts              # Persisted settings (AsyncStorage)
│   │
│   ├── 📁 lib/
│   │   ├── events.ts                   # Event message builders
│   │   ├── gestures.ts                 # Gesture math (delta, velocity)
│   │   ├── pairing.ts                  # QR parse + access code validation
│   │   └── constants.ts                # Ports, timeouts, limits
│   │
│   ├── 📁 store/
│   │   └── connection.ts               # Zustand store — server URL, status
│   │
│   ├── 📁 theme/
│   │   ├── colors.ts                   # Design token colors
│   │   ├── typography.ts               # Font families + scale
│   │   └── shadows.ts                  # Hard shadow definitions
│   │
│   └── 📁 assets/
│       ├── fonts/                      # Outfit + Plus Jakarta Sans
│       └── images/
│           └── logo.png
│
├── 📁 shared/                          # Shared specs used by both sides
│   ├── protocol.md                     # Event message format spec
│   └── version.txt                     # Shared version string
│
├── 📁 docs/
│   ├── SETUP.md                        # Dev environment setup
│   ├── BUILDING.md                     # How to build .exe and .apk
│   └── ARCHITECTURE.md                 # Deep-dive system diagram
│
├── ROADMAP.md                          # This file
├── README.md
└── .gitignore
```

---

## 4. Design System Integration

### Design tokens → NativeWind config

```js
// client/tailwind.config.js
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background:  "#FFFDF5",
        foreground:  "#1E293B",
        muted:       "#F1F5F9",
        "muted-fg":  "#64748B",
        accent:      "#8B5CF6",
        secondary:   "#F472B6",
        tertiary:    "#FBBF24",
        quaternary:  "#34D399",
        border:      "#E2E8F0",
        card:        "#FFFFFF",
        ring:        "#8B5CF6",
      },
      fontFamily: {
        heading: ["Outfit_700Bold"],
        body:    ["PlusJakartaSans_400Regular"],
        "body-medium": ["PlusJakartaSans_500Medium"],
      },
      borderRadius: {
        sm:   "8px",
        md:   "16px",
        lg:   "24px",
        full: "9999px",
      },
      borderWidth: {
        DEFAULT: "2px",
      },
    },
  },
};
```

### Hard shadow utility (React Native)

```ts
// client/theme/shadows.ts
export const hardShadow = {
  pop: {
    shadowColor: "#1E293B",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0, // Android uses elevation; override with a border trick
  },
  popHover: {
    shadowColor: "#1E293B",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  card: {
    shadowColor: "#E2E8F0",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
};
```

### Fonts — load in root layout

```tsx
// client/app/_layout.tsx
import {
  useFonts,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
} from "@expo-google-fonts/plus-jakarta-sans";
```

---

## 5. Development Plan (Phase-by-Phase)

### Phase 0 — Environment Setup (Day 1)

**Server side:**
```bash
python -m venv venv
source venv/bin/activate        # or venv\Scripts\activate on Windows
pip install websockets aiohttp pyautogui pynput qrcode[pil] pystray pillow pyinstaller
```

**Client side:**
```bash
npx create-expo-app client --template blank-typescript
cd client
npx expo install nativewind react-native-gesture-handler expo-camera expo-haptics expo-router zustand @react-native-async-storage/async-storage
```

---

### Phase 1 — Core Connection (Days 2–4)

**Goal:** Phone connects to laptop, cursor moves.

#### 1.1 Server: WebSocket + input

```python
# server/core/websocket_server.py — skeleton
import asyncio, websockets, json
from .input_handler import handle_event

CLIENTS = set()

async def handler(websocket, path):
    CLIENTS.add(websocket)
    try:
        async for message in websocket:
            event = json.loads(message)
            await handle_event(event)
    except websockets.ConnectionClosed:
        pass
    finally:
        CLIENTS.remove(websocket)

async def start(host="0.0.0.0", port=8765):
    async with websockets.serve(handler, host, port):
        await asyncio.Future()  # run forever
```

```python
# server/core/input_handler.py — skeleton
import pyautogui

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0

SENSITIVITY = 1.5  # multiply delta by this

def handle_event(event: dict):
    t = event.get("type")

    if t == "move":
        dx = event["dx"] * SENSITIVITY
        dy = event["dy"] * SENSITIVITY
        pyautogui.moveRel(dx, dy, duration=0)

    elif t == "click":
        btn = event.get("button", "left")
        pyautogui.click(button=btn)

    elif t == "dblclick":
        pyautogui.doubleClick()

    elif t == "scroll":
        pyautogui.scroll(event.get("dy", 0))

    elif t == "text":
        pyautogui.typewrite(event.get("value", ""), interval=0.01)

    elif t == "key":
        pyautogui.hotkey(*event.get("key", "").split("+"))
```

#### 1.2 Server: QR + network discovery

```python
# server/core/pairing.py
import qrcode, socket, random, string

def get_lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()

def generate_access_code(length=6) -> str:
    return "".join(random.choices(string.digits, k=length))

def generate_qr(ip: str, port: int, code: str) -> str:
    """Returns path to saved QR PNG."""
    payload = f"phonepad://{ip}:{port}?code={code}"
    img = qrcode.make(payload)
    path = "/tmp/phonepad_qr.png"
    img.save(path)
    return path
```

#### 1.3 Client: WebSocket hook

```ts
// client/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { useConnectionStore } from "../store/connection";

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const { setStatus, serverUrl } = useConnectionStore();

  const connect = useCallback((url: string) => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setStatus("connected");
    ws.current.onclose = () => {
      setStatus("disconnected");
      // auto-reconnect after 2s
      setTimeout(() => connect(url), 2000);
    };
    ws.current.onerror = () => setStatus("error");
  }, []);

  const send = useCallback((event: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(event));
    }
  }, []);

  return { connect, send };
}
```

#### 1.4 Client: Touch surface (Phase 1 basic version)

```tsx
// client/components/TouchSurface.tsx (simplified Phase 1)
import { View, PanResponder } from "react-native";
import { useWebSocket } from "../hooks/useWebSocket";

export function TouchSurface() {
  const { send } = useWebSocket();
  let lastX = 0, lastY = 0;

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, g) => {
      lastX = g.x0; lastY = g.y0;
    },
    onPanResponderMove: (_, g) => {
      const dx = g.moveX - lastX;
      const dy = g.moveY - lastY;
      lastX = g.moveX; lastY = g.moveY;
      send({ type: "move", dx, dy, ts: Date.now() });
    },
    onPanResponderRelease: () => {
      send({ type: "click", button: "left" });
    },
  });

  return <View style={{ flex: 1 }} {...pan.panHandlers} />;
}
```

**Phase 1 done when:** Cursor moves on laptop when you drag your finger on phone. ✅

---

### Phase 2 — Full Gesture Support (Days 5–8)

**Goal:** All gestures work — scroll, right-click, multi-finger.

#### 2.1 Gesture state machine

Track number of simultaneous fingers using `react-native-gesture-handler`.

| Fingers | Motion | Action |
|---|---|---|
| 1 | Move | Cursor move |
| 1 | Short tap (< 200ms, < 5px moved) | Left click |
| 1 | Long press (> 500ms) | Right click |
| 1 | Double tap (< 300ms between) | Double click |
| 2 | Vertical move | Scroll |
| 2 | Horizontal move | Horizontal scroll |
| 2 | Pinch | Zoom (Ctrl + scroll) |
| 3 | Swipe left/right | Switch window (Alt+Tab / Cmd+Tab) |
| 3 | Swipe up | Mission Control / Task View |
| 3 | Swipe down | Show desktop |

```ts
// client/hooks/useGestures.ts
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

export function useGestures(send: (e: object) => void) {
  const pan1 = Gesture.Pan()
    .minPointers(1).maxPointers(1)
    .onUpdate((e) => {
      send({ type: "move", dx: e.velocityX / 20, dy: e.velocityY / 20 });
    });

  const scroll = Gesture.Pan()
    .minPointers(2).maxPointers(2)
    .onUpdate((e) => {
      send({ type: "scroll", dy: -(e.velocityY / 40) });
    });

  const tap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      send({ type: "click", button: "left" });
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => send({ type: "dblclick", button: "left" }));

  const longPress = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      send({ type: "click", button: "right" });
    });

  return Gesture.Exclusive(doubleTap, Gesture.Race(pan1, tap, longPress), scroll);
}
```

#### 2.2 Platform-specific input on server

**Windows** — use `SendInput` via `ctypes` for smoother than pyautogui:

```python
# server/platform/windows.py
import ctypes

MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004

def move_mouse_relative(dx: int, dy: int):
    ctypes.windll.user32.mouse_event(MOUSEEVENTF_MOVE, int(dx), int(dy), 0, 0)
```

**macOS** — use `Quartz` (pre-installed):

```python
# server/platform/mac.py
from Quartz.CoreGraphics import (
    CGEventCreateMouseEvent, CGEventPost,
    kCGEventMouseMoved, kCGMouseButtonLeft,
    kCGHIDEventTap
)
```

**Linux** — use `python-xlib` or `pynput` (works on both X11 and Wayland via pynput):

```python
# server/platform/linux.py
from pynput.mouse import Controller as MouseCtrl
mouse = MouseCtrl()

def move_mouse_relative(dx: int, dy: int):
    mouse.move(dx, dy)
```

---

### Phase 3 — Pairing UX (Days 9–11)

**Goal:** Student opens phone, scans QR or types code, connected in < 10 seconds.

#### Connect screen flow:

```
[App opens]
     │
     ▼
[Connect Screen]
  ┌─────────────────────────┐
  │  📷 Scan QR Code        │  ← Camera view
  │                         │
  │  ─── or enter code ───  │
  │  [ _ _ _ _ _ _ ]        │  ← 6-digit input
  │                         │
  │  [  CONNECT  →  ]       │
  └─────────────────────────┘
     │
     ▼ (on success)
[Touchpad Screen]
```

```ts
// client/lib/pairing.ts
export function parseQRPayload(data: string): { ip: string; port: number; code: string } | null {
  try {
    const url = new URL(data.replace("phonepad://", "http://"));
    return {
      ip: url.hostname,
      port: Number(url.port) || 8765,
      code: url.searchParams.get("code") ?? "",
    };
  } catch {
    return null;
  }
}

export function buildWsUrl(ip: string, port: number, code: string): string {
  return `ws://${ip}:${port}?code=${code}`;
}
```

#### Server: verify access code on connection

```python
# server/core/websocket_server.py — with auth
import urllib.parse

ACCESS_CODE = generate_access_code()  # generated at startup

async def handler(websocket, path):
    params = urllib.parse.parse_qs(urllib.parse.urlparse(path).query)
    code = params.get("code", [None])[0]

    if code != ACCESS_CODE:
        await websocket.close(4001, "Invalid access code")
        return

    # proceed normally
```

---

### Phase 4 — Virtual Keyboard & Media Keys (Days 12–14)

**Goal:** Students can type and control media without switching apps.

#### Keyboard panel (slides up from bottom):

```tsx
// client/components/KeyboardPanel.tsx
import { TextInput, View } from "react-native";
import { useWebSocket } from "../hooks/useWebSocket";

export function KeyboardPanel({ visible }: { visible: boolean }) {
  const { send } = useWebSocket();

  return visible ? (
    <View style={{ position: "absolute", bottom: 0, width: "100%" }}>
      <TextInput
        autoFocus
        style={{ opacity: 0, height: 0 }} // hidden input triggers system keyboard
        onChangeText={(text) => send({ type: "text", value: text })}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === "Backspace") {
            send({ type: "key", key: "backspace" });
          }
        }}
      />
    </View>
  ) : null;
}
```

#### Media keys:

```python
# server/core/input_handler.py — media section
from pynput.keyboard import Controller as KeyboardCtrl, Key

keyboard = KeyboardCtrl()

MEDIA_KEY_MAP = {
    "play_pause": Key.media_play_pause,
    "next":       Key.media_next,
    "prev":       Key.media_previous,
    "vol_up":     Key.media_volume_up,
    "vol_down":   Key.media_volume_down,
    "mute":       Key.media_volume_mute,
}

def handle_media(action: str):
    k = MEDIA_KEY_MAP.get(action)
    if k:
        keyboard.press(k)
        keyboard.release(k)
```

---

### Phase 5 — Server Status UI (Days 15–16)

**Goal:** When student runs `.exe`, they see a friendly window with QR code.

#### Tkinter status window:

```python
# server/ui/status_window.py
import tkinter as tk
from PIL import Image, ImageTk

def show_window(ip: str, port: int, code: str, qr_path: str):
    root = tk.Tk()
    root.title("PhonePad — Running")
    root.configure(bg="#FFFDF5")  # Design system background

    tk.Label(root, text="PhonePad", font=("Arial", 24, "bold"),
             bg="#FFFDF5", fg="#1E293B").pack(pady=(20, 4))

    tk.Label(root, text=f"Scan QR or enter code: {code}",
             font=("Arial", 14), bg="#FFFDF5", fg="#64748B").pack()

    qr_img = ImageTk.PhotoImage(Image.open(qr_path).resize((240, 240)))
    tk.Label(root, image=qr_img, bg="#FFFDF5").pack(pady=16)

    tk.Label(root, text=f"Server: {ip}:{port}",
             font=("Arial", 11), bg="#FFFDF5", fg="#64748B").pack()

    tk.Label(root, text="Keep this window open.",
             font=("Arial", 10), bg="#FFFDF5", fg="#94A3B8").pack(pady=(4, 20))

    root.mainloop()
```

---

### Phase 6 — Polish & Performance (Days 17–20)

- [ ] Sensitivity slider in settings screen
- [ ] Scroll speed control
- [ ] Left/right hand mode (mirror layout)
- [ ] Reconnect banner when connection drops
- [ ] Latency display (ping/pong WebSocket timing)
- [ ] Connection history — remember last 3 servers
- [ ] Dark mode support
- [ ] Reduce motion accessibility flag

---

## 6. Server Implementation Guide

### Entry point

```python
# server/main.py
import asyncio, threading
from core.websocket_server import start as start_ws
from core.http_server import start as start_http
from core.pairing import get_lan_ip, generate_access_code, generate_qr
from ui.status_window import show_window

PORT_WS   = 8765
PORT_HTTP = 8766

def main():
    ip   = get_lan_ip()
    code = generate_access_code()
    qr   = generate_qr(ip, PORT_WS, code)

    # Run async servers in background thread
    def run_async():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(asyncio.gather(
            start_ws(host="0.0.0.0", port=PORT_WS, code=code),
            start_http(host="0.0.0.0", port=PORT_HTTP),
        ))

    thread = threading.Thread(target=run_async, daemon=True)
    thread.start()

    # Tkinter runs on main thread (required on macOS)
    show_window(ip, PORT_WS, code, qr)

if __name__ == "__main__":
    main()
```

### Sensitivity & acceleration

```python
# server/core/input_handler.py — smart acceleration
import math

def apply_acceleration(dx: float, dy: float, sensitivity: float = 1.5) -> tuple[float, float]:
    """Apply non-linear acceleration: slow movements stay precise, fast ones cover more ground."""
    magnitude = math.sqrt(dx**2 + dy**2)
    if magnitude < 2:
        factor = sensitivity * 0.6  # precision zone
    elif magnitude < 8:
        factor = sensitivity * 1.0  # normal zone
    else:
        factor = sensitivity * 1.8  # fast zone (like a real trackpad)

    return dx * factor, dy * factor
```

---

## 7. Phone Client Implementation Guide

### Screen: Connect

```tsx
// client/app/index.tsx
import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { QRScanner } from "../components/QRScanner";
import { AccessCodeEntry } from "../components/AccessCodeEntry";
import { GeometricBg } from "../components/ui/GeometricBg";
import { useConnectionStore } from "../store/connection";
import { parseQRPayload, buildWsUrl } from "../lib/pairing";

export default function ConnectScreen() {
  const [mode, setMode] = useState<"qr" | "code">("qr");
  const { setServerUrl } = useConnectionStore();

  function onQRScanned(data: string) {
    const parsed = parseQRPayload(data);
    if (!parsed) return;
    const url = buildWsUrl(parsed.ip, parsed.port, parsed.code);
    setServerUrl(url);
    router.push("/touchpad");
  }

  return (
    <View className="flex-1 bg-background">
      <GeometricBg />
      <Text className="font-heading text-3xl text-foreground text-center mt-16 mb-2">
        PhonePad
      </Text>
      <Text className="font-body text-muted-fg text-center mb-8">
        Connect to your laptop
      </Text>

      {mode === "qr" ? (
        <QRScanner onScanned={onQRScanned} />
      ) : (
        <AccessCodeEntry onSubmit={onQRScanned} />
      )}

      <Pressable onPress={() => setMode(mode === "qr" ? "code" : "qr")}
        className="mx-auto mt-6">
        <Text className="text-accent font-body-medium">
          {mode === "qr" ? "Enter code manually" : "Scan QR instead"}
        </Text>
      </Pressable>
    </View>
  );
}
```

### Screen: Touchpad

```tsx
// client/app/touchpad.tsx
import { View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { TouchSurface } from "../components/TouchSurface";
import { GestureBar } from "../components/GestureBar";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { useWebSocket } from "../hooks/useWebSocket";
import { useConnectionStore } from "../store/connection";
import { useEffect } from "react";

export default function TouchpadScreen() {
  const { connect, send } = useWebSocket();
  const { serverUrl } = useConnectionStore();

  useEffect(() => {
    if (serverUrl) connect(serverUrl);
  }, [serverUrl]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View className="flex-1 bg-background">
        <ConnectionStatus />

        {/* Main touch area */}
        <TouchSurface send={send} style={{ flex: 1 }} />

        {/* Bottom gesture bar */}
        <GestureBar send={send} />
      </View>
    </GestureHandlerRootView>
  );
}
```

---

## 8. Error Handling Strategy

### Server-side errors

| Error | Cause | Handling |
|---|---|---|
| Port in use | Another app on 8765 | Auto-try next 3 ports (8765, 8766, 8767). Show final port in UI |
| Invalid access code | Wrong code from phone | Close connection with code 4001, log attempt, UI shows "wrong code" |
| Input injection fails | UAC / permission on Windows | Catch `PermissionError`, show "Run as administrator" dialog |
| Client disconnects | WiFi drop / screen off | Log disconnect, keep server running, client auto-reconnects |
| Multiple clients | Two phones connecting | Support up to 1 active controller. Queue or reject second |
| pyautogui FAILSAFE | Mouse hits corner | Disable with `pyautogui.FAILSAFE = False` |

```python
# server/core/websocket_server.py — full error handling
async def handler(websocket, path):
    try:
        # auth check
        if not verify_code(path):
            await websocket.close(4001, "Invalid code")
            return

        async for raw in websocket:
            try:
                event = json.loads(raw)
                await handle_event(event)
            except json.JSONDecodeError:
                pass  # silently ignore malformed messages
            except Exception as e:
                print(f"[input error] {e}")  # don't crash the connection

    except websockets.ConnectionClosedOK:
        pass
    except websockets.ConnectionClosedError as e:
        print(f"[connection dropped] {e}")
    except Exception as e:
        print(f"[fatal handler error] {e}")
    finally:
        CLIENTS.discard(websocket)
```

### Client-side errors

| Error | Cause | Handling |
|---|---|---|
| Camera permission denied | User rejected | Show permission rationale screen, link to settings |
| Invalid QR | Non-PhonePad QR scanned | Toast: "Not a PhonePad QR code" |
| Wrong code | Typo in 6-digit code | Server returns 4001 → show "Wrong code, try again" |
| WebSocket fails to connect | Wrong IP / firewall | Timeout after 5s, show "Can't reach laptop. Same WiFi?" |
| WiFi drops mid-session | Network blip | Show reconnect banner, retry every 2s (exponential backoff) |
| Server not running | Opened app without server | After 3 failed retries, show "Make sure PhonePad is running on your laptop" |

```ts
// client/hooks/useWebSocket.ts — full error handling
const MAX_RETRIES = 10;
let retryCount = 0;

ws.current.onclose = (e) => {
  if (e.code === 4001) {
    setStatus("auth_failed");
    return; // don't retry on auth failure
  }

  setStatus("disconnected");
  const delay = Math.min(1000 * Math.pow(1.5, retryCount), 15000);
  retryCount++;
  setTimeout(() => connect(serverUrl), delay);
};

ws.current.onopen = () => {
  setStatus("connected");
  retryCount = 0; // reset on success
};
```

### Firewall note (Windows)

PyInstaller `.exe` will trigger Windows Firewall on first run asking to allow network access. This is expected behavior — document it clearly:

```
📌 IMPORTANT FOR WINDOWS USERS:
When you first open PhonePad.exe, Windows Firewall will ask
"Do you want to allow PhonePad to communicate on private networks?"
Click YES — this lets your phone connect over WiFi.
```

---

## 9. Distribution & Packaging

### Server: Build `.exe` (Windows)

```ini
# server/build.spec
a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=[('assets/icon.ico', 'assets')],
    hiddenimports=['pynput.keyboard._win32', 'pynput.mouse._win32'],
    noarchive=False,
)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='PhonePad',
    icon='assets/icon.ico',
    console=False,  # no terminal window
    onefile=True,   # single .exe
)
```

```bash
# server/build.bat (Windows)
pyinstaller build.spec --clean --noconfirm
# Output: dist/PhonePad.exe
```

### Server: Build `.app` (macOS)

```bash
# server/build.sh (macOS)
pyinstaller build.spec --clean --noconfirm --target-arch universal2
# Output: dist/PhonePad.app
# Then: zip -r PhonePad-mac.zip dist/PhonePad.app
```

### Client: Build `.apk` (Android)

```bash
cd client

# Development APK (sideload)
npx expo build:android -t apk

# Or with EAS Build (recommended)
npx eas build --platform android --profile preview
# Output: PhonePad.apk (downloadable from EAS dashboard)
```

```json
// client/eas.json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  }
}
```

### Client: Build for iOS (`.ipa`)

```bash
npx eas build --platform ios --profile preview
# Requires Apple Developer account ($99/year) for distribution
# For classroom use: TestFlight is the easiest path
```

### Release checklist

- [ ] Server: test `.exe` on fresh Windows machine (no Python installed)
- [ ] Server: test `.app` on macOS (check Gatekeeper — may need to right-click → Open)
- [ ] Client: test `.apk` on Android 10, 11, 12, 13
- [ ] Test on 2.4GHz and 5GHz WiFi
- [ ] Test with phone screen off → reconnect
- [ ] Test firewall prompt on Windows

---

## 10. UI Component Specs

### `<Button>` — The Candy Button

```tsx
// client/components/ui/Button.tsx
import { Pressable, Text, View, Animated } from "react-native";
import { hardShadow } from "../../theme/shadows";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ label, onPress, variant = "primary" }: ButtonProps) {
  const scale = new Animated.Value(1);
  const shadowOffset = new Animated.Value(4);

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }),
      Animated.timing(shadowOffset, { toValue: 2, duration: 100, useNativeDriver: false }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(shadowOffset, { toValue: 4, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          {
            backgroundColor: variant === "primary" ? "#8B5CF6" : "transparent",
            borderWidth: 2,
            borderColor: "#1E293B",
            borderRadius: 9999,
            paddingHorizontal: 24,
            paddingVertical: 14,
            minHeight: 48, // touch target
            alignItems: "center",
            ...hardShadow.pop,
          },
        ]}
      >
        <Text style={{
          color: variant === "primary" ? "#FFFFFF" : "#1E293B",
          fontFamily: "Outfit_700Bold",
          fontSize: 16,
        }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
```

### `<ConnectionStatus>` — Live indicator

```tsx
// client/components/ConnectionStatus.tsx
import { View, Text } from "react-native";
import { useConnectionStore } from "../store/connection";

const STATUS_CONFIG = {
  connected:    { color: "#34D399", label: "Connected" },
  disconnected: { color: "#F472B6", label: "Reconnecting..." },
  error:        { color: "#EF4444", label: "Error" },
  auth_failed:  { color: "#FBBF24", label: "Wrong code" },
};

export function ConnectionStatus() {
  const { status, latency } = useConnectionStore();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.disconnected;

  return (
    <View style={{ flexDirection: "row", alignItems: "center",
                   padding: 12, gap: 8 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4,
                     backgroundColor: cfg.color }} />
      <Text style={{ fontFamily: "PlusJakartaSans_400Regular",
                     fontSize: 12, color: "#64748B" }}>
        {cfg.label}{status === "connected" && latency ? `  ${latency}ms` : ""}
      </Text>
    </View>
  );
}
```

### `<GeometricBg>` — Floating decorative shapes

```tsx
// client/components/ui/GeometricBg.tsx
import { View } from "react-native";
import Svg, { Circle, Rect, Polygon } from "react-native-svg";

export function GeometricBg() {
  return (
    <View style={{ position: "absolute", width: "100%", height: "100%",
                   pointerEvents: "none", overflow: "hidden" }}>
      <Svg style={{ position: "absolute", top: -20, right: -20 }}>
        <Circle cx="80" cy="80" r="80" fill="#FBBF24" opacity="0.25" />
      </Svg>
      <Svg style={{ position: "absolute", bottom: 80, left: -30 }}>
        <Rect width="100" height="100" rx="16" fill="#8B5CF6" opacity="0.12"
              transform="rotate(20)" />
      </Svg>
      <Svg style={{ position: "absolute", top: 200, right: 20 }}>
        <Polygon points="0,40 40,0 80,40" fill="#34D399" opacity="0.2" />
      </Svg>
    </View>
  );
}
```

---

## 11. Testing Plan

### Unit tests (server)

```python
# server/tests/test_input_handler.py
import pytest
from unittest.mock import patch, MagicMock
from core.input_handler import handle_event

def test_move_event():
    with patch("core.input_handler.pyautogui.moveRel") as mock_move:
        handle_event({"type": "move", "dx": 5.0, "dy": -3.0})
        mock_move.assert_called_once()

def test_click_event():
    with patch("core.input_handler.pyautogui.click") as mock_click:
        handle_event({"type": "click", "button": "left"})
        mock_click.assert_called_with(button="left")

def test_unknown_event_does_not_crash():
    handle_event({"type": "unknown_gibberish"})  # Should not raise
```

### Integration tests

- [ ] Phone → laptop cursor movement (manual test, latency < 30ms on local WiFi)
- [ ] QR scan flow end-to-end on Android 12
- [ ] Wrong access code → rejected (code 4001)
- [ ] Disconnect phone → server stays running
- [ ] Reconnect phone → works without restarting server
- [ ] `.exe` on fresh Windows 11 VM (no Python)

### Performance targets

| Metric | Target |
|---|---|
| Move event latency (LAN) | < 20ms |
| Event rate (moves/sec) | 60 fps capable |
| Server CPU at idle | < 1% |
| Server memory | < 50MB |
| APK size | < 30MB |
| EXE size | < 25MB |

---

## 12. Vibe-Coding Checklist

Use this as your day-by-day task list. Check off as you go.

### Week 1 — Server foundation
- [ ] Set up Python venv, install dependencies
- [ ] `network.py` — LAN IP detection working
- [ ] `pairing.py` — QR generation + access code working
- [ ] `websocket_server.py` — connects, auth check working
- [ ] `input_handler.py` — cursor moves on your screen from WebSocket message
- [ ] `status_window.py` — Tkinter window shows QR
- [ ] Test manually: `wscat -c ws://localhost:8765?code=123456` then send `{"type":"move","dx":10,"dy":0}`

### Week 2 — Phone client
- [ ] Expo project created, fonts loaded, NativeWind configured
- [ ] Design tokens in `tailwind.config.js`
- [ ] `GeometricBg` component renders correctly
- [ ] `Button` component with press animation
- [ ] Connect screen layout complete
- [ ] QR scanner working (test by scanning any QR)
- [ ] `useWebSocket` hook connects to server
- [ ] Basic `TouchSurface` — cursor moves!

### Week 3 — Gestures + polish
- [ ] `react-native-gesture-handler` integrated
- [ ] 2-finger scroll working
- [ ] Right-click (long press) working
- [ ] Double-tap working
- [ ] Haptic feedback on clicks
- [ ] `ConnectionStatus` component
- [ ] Keyboard panel opens/closes
- [ ] Media keys working
- [ ] Settings screen (sensitivity slider)

### Week 4 — Packaging
- [ ] PyInstaller `.exe` builds and runs on clean Windows
- [ ] PyInstaller `.app` builds and runs on macOS
- [ ] EAS Build `.apk` downloads and installs
- [ ] Write `README.md` for students (no tech jargon)
- [ ] Record 60-second demo video

---

## Appendix: Quick Reference

### Useful commands

```bash
# Run server in dev
cd server && python main.py

# Run client in dev (Expo Go)
cd client && npx expo start

# Build .exe
cd server && pyinstaller build.spec --clean

# Build .apk
cd client && npx eas build --platform android --profile preview

# Install dependencies (server)
pip install -r server/requirements.txt

# Install dependencies (client)
cd client && npm install
```

### Key ports

| Service | Port | Protocol |
|---|---|---|
| WebSocket server | 8765 | ws:// |
| HTTP (phone fallback UI) | 8766 | http:// |

### Access code format

6 numeric digits. Generated fresh every time the server starts. Displayed in UI and encoded in QR. Valid for the server session only.

### QR payload format

```
phonepad://192.168.1.42:8765?code=847291
```

---

*Built with ❤️ for students who just need their touchpad to work.*
