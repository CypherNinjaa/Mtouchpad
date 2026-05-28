# server/platform/windows.py
import ctypes
import logging
import time

logger = logging.getLogger(__name__)

# Win32 Mouse Event Flags
MOUSEEVENTF_MOVE: int = 0x0001
MOUSEEVENTF_LEFTDOWN: int = 0x0002
MOUSEEVENTF_LEFTUP: int = 0x0004
MOUSEEVENTF_RIGHTDOWN: int = 0x0008
MOUSEEVENTF_RIGHTUP: int = 0x0010
MOUSEEVENTF_MIDDLEDOWN: int = 0x0020
MOUSEEVENTF_MIDDLEUP: int = 0x0040

def move_mouse(dx: float, dy: float) -> None:
    """Move the mouse cursor relative to its current position."""
    ix = int(round(dx))
    iy = int(round(dy))
    if ix != 0 or iy != 0:
        ctypes.windll.user32.mouse_event(MOUSEEVENTF_MOVE, ix, iy, 0, 0)

def click_mouse(button: str) -> None:
    """Perform a single click of the specified mouse button."""
    match button:
        case "left":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
        case "right":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
        case "middle":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0)
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0)
        case _:
            logger.warning(f"Unsupported mouse button: {button}")

def press_mouse(button: str) -> None:
    """Press and hold the specified mouse button down."""
    match button:
        case "left":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
        case "right":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
        case "middle":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, 0)
        case _:
            logger.warning(f"Unsupported mouse press button: {button}")

def release_mouse(button: str) -> None:
    """Release the specified mouse button."""
    match button:
        case "left":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
        case "right":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
        case "middle":
            ctypes.windll.user32.mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, 0)
        case _:
            logger.warning(f"Unsupported mouse release button: {button}")

def double_click_mouse(button: str) -> None:
    """Perform a double click of the specified mouse button."""
    click_mouse(button)
    # Small delay between clicks to ensure OS registers them as a double-click
    time.sleep(0.05)
    click_mouse(button)

# Win32 Wheel Scroll Event Flags
MOUSEEVENTF_WHEEL: int = 0x0800
MOUSEEVENTF_HWHEEL: int = 0x1000

# Scroll accumulator — fractional scroll values are accumulated here
# and dispatched as integer wheel ticks once they cross a threshold.
# Win32 WHEEL_DELTA = 120. Each "notch" of a physical wheel = 120 units.
# We use finer granularity for smooth scrolling.
_scroll_acc_x: float = 0.0
_scroll_acc_y: float = 0.0

def scroll_mouse(dx: float, dy: float) -> None:
    """
    Scroll the mouse wheel.
    
    dx/dy arrive as fractional "line" counts (e.g. 0.3 lines).
    We accumulate and dispatch when ≥ 1 wheel tick (= 40 units for smooth scroll).
    Using 40 instead of 120 gives finer/smoother scrolling.
    """
    global _scroll_acc_x, _scroll_acc_y

    TICK = 40  # Sub-notch smooth scrolling (120 / 3)

    if dy != 0:
        _scroll_acc_y += dy * 120  # Convert lines → wheel delta units
        # Dispatch as many ticks as we've accumulated
        while abs(_scroll_acc_y) >= TICK:
            if _scroll_acc_y > 0:
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, TICK, 0)
                _scroll_acc_y -= TICK
            else:
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, -TICK, 0)
                _scroll_acc_y += TICK

    if dx != 0:
        _scroll_acc_x += dx * 120
        while abs(_scroll_acc_x) >= TICK:
            if _scroll_acc_x > 0:
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_HWHEEL, 0, 0, TICK, 0)
                _scroll_acc_x -= TICK
            else:
                ctypes.windll.user32.mouse_event(MOUSEEVENTF_HWHEEL, 0, 0, -TICK, 0)
                _scroll_acc_x += TICK


from pynput.keyboard import Controller as KeyboardCtrl, Key

keyboard = KeyboardCtrl()

KEY_MAP: dict = {
    "ctrl": Key.ctrl,
    "alt": Key.alt,
    "shift": Key.shift,
    "win": Key.cmd,
    "cmd": Key.cmd,
    "tab": Key.tab,
    "enter": Key.enter,
    "backspace": Key.backspace,
    "space": Key.space,
    "escape": Key.esc,
    "esc": Key.esc,
    "left": Key.left,
    "right": Key.right,
    "up": Key.up,
    "down": Key.down,
}

def parse_shortcut(shortcut: str) -> list[str]:
    """Parse shortcuts, handling tricky cases like 'ctrl++' cleanly."""
    shortcut = shortcut.lower()
    if shortcut == "+":
        return ["+"]
    if shortcut.endswith("++"):
        return [p for p in shortcut[:-2].split("+") if p] + ["+"]
    if shortcut.endswith("+") and len(shortcut) > 1:
        return [p for p in shortcut[:-1].split("+") if p] + ["+"]
    return [p for p in shortcut.split("+") if p]

def inject_keyboard_shortcut(shortcut: str) -> None:
    """Press and release a keyboard combination shortcut with clean OS timing."""
    parts = parse_shortcut(shortcut)
    pressed_keys = []
    
    try:
        # Press keys in order
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            key_to_press = KEY_MAP.get(part)
            if key_to_press is None:
                if len(part) == 1:
                    key_to_press = part
                else:
                    logger.warning(f"Unknown key in shortcut: {part}")
                    continue
            
            keyboard.press(key_to_press)
            pressed_keys.append(key_to_press)
            time.sleep(0.01)  # 10ms delay between key presses
            
        time.sleep(0.05)  # 50ms hold time
            
    except Exception as e:
        logger.error(f"Error pressing keys for shortcut '{shortcut}': {e}")
    finally:
        # Release in reverse order
        for key_to_release in reversed(pressed_keys):
            try:
                keyboard.release(key_to_release)
                time.sleep(0.01)  # 10ms delay between releases
            except Exception as e:
                logger.error(f"Error releasing key: {e}")

def type_text(text: str) -> None:
    """Type a string of characters."""
    try:
        keyboard.type(text)
    except Exception as e:
        logger.error(f"Error typing text '{text}': {e}")

def handle_media(action: str) -> None:
    """Trigger system media key actions."""
    MEDIA_KEY_MAP = {
        "play_pause": Key.media_play_pause,
        "next":       Key.media_next,
        "prev":       Key.media_previous,
        "vol_up":     Key.media_volume_up,
        "vol_down":   Key.media_volume_down,
        "mute":       Key.media_volume_mute,
    }
    k = MEDIA_KEY_MAP.get(action)
    if k:
        try:
            keyboard.press(k)
            keyboard.release(k)
        except Exception as e:
            logger.error(f"Error injecting media key '{action}': {e}")
