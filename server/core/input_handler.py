# server/core/input_handler.py
import sys
import math
import logging
from config import SENSITIVITY

logger = logging.getLogger(__name__)

# Platform dispatch
if sys.platform == "win32":
    from platform.windows import move_mouse, click_mouse, double_click_mouse, scroll_mouse, inject_keyboard_shortcut, press_mouse, release_mouse, type_text, handle_media
elif sys.platform == "darwin":
    from platform.mac import move_mouse, click_mouse, double_click_mouse, scroll_mouse, inject_keyboard_shortcut, press_mouse, release_mouse, type_text, handle_media
else:
    from platform.linux import move_mouse, click_mouse, double_click_mouse, scroll_mouse, inject_keyboard_shortcut, press_mouse, release_mouse, type_text, handle_media

# ─── Platform-aware gesture → hotkey mappings ───
# Covers 3-finger swipes, 4-finger swipes, pinch zoom, and 4-finger tap.
GESTURE_TO_SHORTCUT = {
    "win32": {
        # Pinch zoom
        "pinch_in": "ctrl+-",
        "pinch_out": "ctrl+=",
        # 3-finger swipes
        "swipe_left": "alt+shift+tab",    # Switch to previous window (cycles backward)
        "swipe_right": "alt+tab",         # Switch to next window (cycles forward)
        "swipe_up": "win+tab",            # Task View
        "swipe_down": "win+d",            # Show Desktop
        # 4-finger swipes (virtual desktops)
        "swipe4_left": "win+ctrl+left",   # Previous virtual desktop
        "swipe4_right": "win+ctrl+right", # Next virtual desktop
        "swipe4_up": "win+tab",           # Task View
        "swipe4_down": "win+d",           # Show Desktop
        # 4-finger tap
        "tap4": "win+a",                  # Action Center / Notification Center
    },
    "darwin": {
        "pinch_in": "cmd+-",
        "pinch_out": "cmd+=",
        "swipe_left": "ctrl+left",
        "swipe_right": "ctrl+right",
        "swipe_up": "ctrl+up",            # Mission Control
        "swipe_down": "cmd+d",
        "swipe4_left": "ctrl+left",
        "swipe4_right": "ctrl+right",
        "swipe4_up": "ctrl+up",
        "swipe4_down": "cmd+d",
        "tap4": "cmd+space",              # Spotlight
    },
    "linux": {
        "pinch_in": "ctrl+-",
        "pinch_out": "ctrl+=",
        "swipe_left": "alt+shift+tab",    # Cycle backward
        "swipe_right": "alt+tab",         # Cycle forward
        "swipe_up": "win+tab",
        "swipe_down": "win+d",
        "swipe4_left": "win+ctrl+left",
        "swipe4_right": "win+ctrl+right",
        "swipe4_up": "win+tab",
        "swipe4_down": "win+d",
        "tap4": "win+a",
    },
}

def apply_acceleration(dx: float, dy: float, sensitivity: float = SENSITIVITY) -> tuple[float, float]:
    """
    Apply non-linear pointer acceleration for a real-touchpad feel.
    
    Slow movements (<2px delta) stay precise for pixel-accurate targeting.
    Medium movements (2-10px) use linear scaling.
    Fast movements (>10px) apply super-linear acceleration so large swipes
    cover the entire screen without needing multiple strokes.
    """
    magnitude = math.sqrt(dx * dx + dy * dy)
    
    if magnitude < 0.5:
        return 0.0, 0.0  # Dead zone — ignore micro-jitter
    
    if magnitude < 2.0:
        factor = sensitivity * 0.5  # Precision zone
    elif magnitude < 10.0:
        factor = sensitivity * 1.0  # Normal zone
    else:
        # Fast zone: super-linear for quick traversal
        factor = sensitivity * (1.0 + (magnitude - 10.0) * 0.08)
    
    return dx * factor, dy * factor


def handle_event(event: dict) -> None:
    """Process an incoming event. Never raises exceptions to caller."""
    try:
        event_type = event.get("type")
        match event_type:
            case "move":
                dx: float = float(event["dx"])
                dy: float = float(event["dy"])
                accel_dx, accel_dy = apply_acceleration(dx, dy)
                move_mouse(accel_dx, accel_dy)
            case "click":
                button: str = event.get("button", "left")
                click_mouse(button)
            case "mouse_down":
                button: str = event.get("button", "left")
                press_mouse(button)
            case "mouse_up":
                button: str = event.get("button", "left")
                release_mouse(button)
            case "dblclick":
                button: str = event.get("button", "left")
                double_click_mouse(button)
            case "scroll":
                scroll_dx: float = float(event.get("dx", 0.0))
                scroll_dy: float = float(event.get("dy", 0.0))
                scroll_mouse(scroll_dx, scroll_dy)
            case "text":
                val: str = event["value"]
                type_text(val)
            case "media":
                act: str = event["action"]
                handle_media(act)
            case "key":
                shortcut: str = event["key"]
                inject_keyboard_shortcut(shortcut)
            case "gesture":
                gesture_name: str = event["name"]
                platform_map = GESTURE_TO_SHORTCUT.get(sys.platform, GESTURE_TO_SHORTCUT["linux"])
                shortcut = platform_map.get(gesture_name)
                if shortcut:
                    logger.info(f"Gesture '{gesture_name}' → shortcut '{shortcut}'")
                    inject_keyboard_shortcut(shortcut)
                else:
                    logger.warning(f"Unsupported gesture: {gesture_name}")
            case _:
                logger.debug(f"Unhandled event type: {event_type}")
    except KeyError as e:
        logger.warning(f"Malformed event missing required field: {e}")
    except ValueError as e:
        logger.warning(f"Invalid numeric value in event: {e}")
    except PermissionError:
        logger.error("Input injection denied by OS permissions. Try running the server with administrator privileges.")
    except Exception as e:
        logger.error(f"Unexpected error in input handler: {e}")
