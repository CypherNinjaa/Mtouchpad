# server/platform/mac.py
import logging
from pynput.mouse import Controller, Button

logger = logging.getLogger(__name__)

# Initialize pynput mouse controller
try:
    mouse = Controller()
except Exception as e:
    logger.error(f"Failed to initialize pynput mouse controller on macOS: {e}")
    mouse = None

def move_mouse(dx: float, dy: float) -> None:
    """Move the mouse cursor relative to its current position."""
    if mouse is None:
        raise NotImplementedError("pynput mouse controller is not initialized.")
    mouse.move(int(dx), int(dy))

def click_mouse(button: str) -> None:
    """Perform a single click of the specified mouse button."""
    if mouse is None:
        raise NotImplementedError("pynput mouse controller is not initialized.")
    
    btn: Button = Button.left
    match button:
        case "left":
            btn = Button.left
        case "right":
            btn = Button.right
        case "middle":
            btn = Button.middle
        case _:
            logger.warning(f"Unsupported mouse button: {button}")
            return
    mouse.click(btn, 1)

def press_mouse(button: str) -> None:
    """Press and hold the specified mouse button down."""
    if mouse is None:
        raise NotImplementedError("pynput mouse controller is not initialized.")
    
    btn: Button = Button.left
    match button:
        case "left":
            btn = Button.left
        case "right":
            btn = Button.right
        case "middle":
            btn = Button.middle
        case _:
            logger.warning(f"Unsupported mouse press button: {button}")
            return
    mouse.press(btn)

def release_mouse(button: str) -> None:
    """Release the specified mouse button."""
    if mouse is None:
        raise NotImplementedError("pynput mouse controller is not initialized.")
    
    btn: Button = Button.left
    match button:
        case "left":
            btn = Button.left
        case "right":
            btn = Button.right
        case "middle":
            btn = Button.middle
        case _:
            logger.warning(f"Unsupported mouse release button: {button}")
            return
    mouse.release(btn)

def double_click_mouse(button: str) -> None:
    """Perform a double click of the specified mouse button."""
    if mouse is None:
        raise NotImplementedError("pynput mouse controller is not initialized.")
    
    btn: Button = Button.left
    match button:
        case "left":
            btn = Button.left
        case "right":
            btn = Button.right
        case "middle":
            btn = Button.middle
        case _:
            logger.warning(f"Unsupported mouse button: {button}")
            return
    mouse.click(btn, 2)

def scroll_mouse(dx: float, dy: float) -> None:
    """Scroll the mouse wheel. dy is vertical scroll; dx is horizontal."""
    if mouse is None:
        raise NotImplementedError("pynput mouse controller is not initialized.")
    mouse.scroll(int(dx), int(dy))

import time
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

