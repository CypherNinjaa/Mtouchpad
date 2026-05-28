# PhonePad WebSocket Communication Protocol

This document defines the WebSocket message formats used for communication between the Phone client and the Laptop server.

## Event Envelope
Every message sent over the WebSocket connection must be a JSON object containing a `type` field, and optionally a `ts` field (Unix timestamp in milliseconds) for latency tracking:

```typescript
interface BaseEvent {
  type: string;
  ts?: number; // Unix ms timestamp
}
```

---

## Canonical Event Types

### 1. Mouse Move (`move`)
Sent when a finger drags across the touch surface.
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "move", "dx": 5.2, "dy": -3.1, "ts": 1718000000000 }
  ```
- **Fields**:
  - `dx`: Float, relative horizontal delta.
  - `dy`: Float, relative vertical delta.

### 2. Mouse Click (`click`)
Sent for a single tap/click gesture.
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "click", "button": "left" }
  ```
- **Fields**:
  - `button`: String, `"left" | "right" | "middle"`.

### 3. Mouse Double Click (`dblclick`)
Sent for a double tap gesture.
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "dblclick", "button": "left" }
  ```
- **Fields**:
  - `button`: String, `"left"`.

### 4. Mouse Scroll (`scroll`)
Sent for scrolling (two-finger drag).
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "scroll", "dx": 0, "dy": -3 }
  ```
- **Fields**:
  - `dx`: Float, horizontal scroll delta.
  - `dy`: Float, vertical scroll delta (negative is scroll down).

### 5. Key Press (`key`)
Sent for a specific keyboard shortcut or hotkey.
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "key", "key": "ctrl+c" }
  ```
- **Fields**:
  - `key`: String, name of the key or modifier combination.

### 6. Text Input (`text`)
Sent when characters are typed.
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "text", "value": "hello world" }
  ```
- **Fields**:
  - `value`: String, the typed text.

### 7. Media Key (`media`)
Sent when media control buttons are pressed.
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "media", "action": "play_pause" }
  ```
- **Fields**:
  - `action`: String, `"play_pause" | "next" | "prev" | "vol_up" | "vol_down" | "mute"`.

### 8. Gestures (`gesture`)
Sent for named system gestures (e.g. 3-finger swipes).
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "gesture", "name": "swipe_left" }
  ```
- **Fields**:
  - `name`: String, `"swipe_left" | "swipe_right" | "swipe_up" | "swipe_down" | "pinch_in" | "pinch_out"`.

### 9. Ping (`ping`)
Sent regularly by the client to verify connection liveliness and measure latency.
- **Direction**: client → server
- **Payload**:
  ```json
  { "type": "ping", "ts": 1718000000000 }
  ```

### 10. Pong (`pong`)
Sent by the server immediately in response to a `ping`.
- **Direction**: server → client
- **Payload**:
  ```json
  { "type": "pong", "latency": 12 }
  ```
- **Fields**:
  - `latency`: Number, round-trip latency in milliseconds.

### 11. Acknowledgment (`ack`)
Sent by the server to confirm receipt of important actions (optional).
- **Direction**: server → client
- **Payload**:
  ```json
  { "type": "ack", "status": "ok", "message": "" }
  ```
- **Fields**:
  - `status`: String, `"ok" | "error"`.
  - `message`: String, error description if status is `"error"`.
