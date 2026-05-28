# server/ui/status_window.py
import os
import sys
import queue
import logging
import threading
import tkinter as tk
from PIL import Image, ImageDraw, ImageTk
import pystray
from pystray import MenuItem as Item, Menu

# Windows-specific import for startup registry key
if sys.platform == "win32":
    import winreg
else:
    winreg = None

logger = logging.getLogger(__name__)

# Registry details for Windows startup
REG_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
APP_NAME = "PhonePad"

# Global references for status coordination
root = None
code_lbl = None
qr_lbl = None
status_badge_lbl = None
_tray_icon = None
_first_minimize_notified = False
_current_ip = "No devices connected"

# Thread-safe queue for UI tasks
ui_queue = queue.Queue()

def process_ui_queue() -> None:
    """Poll and execute tasks from the UI queue on the main thread."""
    global root
    if root:
        try:
            while True:
                task = ui_queue.get_nowait()
                try:
                    task()
                except Exception as e:
                    logger.error(f"Error executing UI task: {e}")
                ui_queue.task_done()
        except queue.Empty:
            pass
        # Schedule the next check on the main thread
        try:
            root.after(50, process_ui_queue)
        except Exception:
            pass

def is_autostart_enabled() -> bool:
    """Check if the app is currently set to launch at Windows startup."""
    if not winreg:
        return False
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_READ)
        winreg.QueryValueEx(key, APP_NAME)
        winreg.CloseKey(key)
        return True
    except FileNotFoundError:
        return False
    except Exception:
        return False

def toggle_autostart(icon=None, item=None) -> None:
    """Toggles Windows startup registry key status."""
    if not winreg:
        logger.warning("Startup toggle is only supported on Windows.")
        return
        
    enabled = is_autostart_enabled()
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_WRITE)
        if enabled:
            # Disable autostart
            winreg.DeleteValue(key, APP_NAME)
            logger.info("Auto-start disabled.")
        else:
            # Enable autostart
            exe_path = os.path.abspath(sys.argv[0])
            if exe_path.endswith(".py"):
                cmd = f'"{sys.executable}" "{exe_path}"'
            else:
                cmd = f'"{exe_path}"'
            winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, cmd)
            logger.info(f"Auto-start enabled for command: {cmd}")
        winreg.CloseKey(key)
    except Exception as e:
        logger.error(f"Failed to toggle auto-start: {e}")

def create_tray_icon_image() -> Image.Image:
    """Dynamically draw a Playful Geometric styled 64x64 PNG tray icon."""
    width = 64
    height = 64
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Outer circle: Violet accent (#8B5CF6) with a Slate border (#1E293B)
    draw.ellipse([4, 4, 60, 60], fill=(139, 92, 246, 255), outline=(30, 41, 59, 255), width=4)
    
    # Inner dot: Amber tertiary (#FBBF24)
    draw.ellipse([24, 24, 40, 40], fill=(251, 191, 36, 255))
    
    return image

def set_device_connected(ip: str) -> None:
    """Notify system tray and thread-safely update Tkinter window of phone connection."""
    global _tray_icon, _current_ip
    _current_ip = ip
    
    if _tray_icon:
        _tray_icon.title = f"PhonePad - Connected ({ip})"
        _tray_icon.notify(f"Phone connected from {ip}", "PhonePad")
        
    def update_ui():
        if status_badge_lbl:
            status_badge_lbl.config(text=f"CONNECTED to {ip}", fg="#10B981") # fresh green
            
    ui_queue.put(update_ui)

def set_device_disconnected() -> None:
    """Notify system tray and thread-safely update Tkinter window of disconnection."""
    global _tray_icon, _current_ip
    _current_ip = "No devices connected"
    
    if _tray_icon:
        _tray_icon.title = "PhonePad - Waiting for device"
        _tray_icon.notify("Phone disconnected", "PhonePad")
        
    def update_ui():
        if status_badge_lbl:
            status_badge_lbl.config(text="Waiting for device...", fg="#64748B") # slate muted
            
    ui_queue.put(update_ui)

def restart_server_action(icon=None, item=None) -> None:
    """Restart server: drops active sockets, rotates keys, regenerates QR, and updates UI."""
    try:
        from core.websocket_server import close_active_connection, set_access_code
        # Drop active connection
        close_active_connection()
        
        # Generate new credentials
        from core.pairing import generate_access_code, generate_qr, get_lan_ip
        from config import PORT_WS
        new_code = generate_access_code()
        set_access_code(new_code)
        
        # Regenerate QR Code
        ip = get_lan_ip()
        qr_path = generate_qr(ip, PORT_WS, new_code)
        
        # Thread-safe UI update callback
        def update_ui():
            global code_lbl, qr_lbl, root
            if code_lbl:
                spaced_code = "  ".join(new_code)
                code_lbl.config(text=spaced_code)
            if qr_lbl and root:
                try:
                    pil_img = Image.open(qr_path).resize((200, 200), Image.Resampling.LANCZOS)
                    qr_img = ImageTk.PhotoImage(pil_img)
                    root.qr_image_ref = qr_img
                    qr_lbl.config(image=qr_img)
                except Exception as e:
                    logger.error(f"Failed to update QR image during server restart: {e}")
                    
        ui_queue.put(update_ui)
            
        if _tray_icon:
            _tray_icon.notify("Server restarted. New access code generated.", "PhonePad")
            
    except Exception as e:
        logger.error(f"Error restarting server from tray action: {e}")

def hide_window() -> None:
    """Hide/withdraw Tkinter window and display a system tray notice."""
    global root, _first_minimize_notified, _tray_icon
    if root:
        root.withdraw()
        
    if not _first_minimize_notified and _tray_icon:
        _tray_icon.notify("PhonePad is still running in the background.", "PhonePad")
        _first_minimize_notified = True

def reopen_window(icon=None, item=None) -> None:
    """Restore the Tkinter window to the foreground."""
    ui_queue.put(lambda: (root.deiconify(), root.focus_force()) if root else None)

def exit_application(icon=None, item=None) -> None:
    """Cleanly close status UI, stop tray daemon, and exit server process."""
    global root, _tray_icon
    logger.info("Exiting PhonePad server.")
    
    # 1. Stop tray icon loop
    if _tray_icon:
        _tray_icon.stop()
        
    # 2. Destroy Tkinter window
    if root:
        try:
            root.destroy()
        except Exception:
            pass
            
    # 3. Clean exit process
    os._exit(0)

def create_tray_menu() -> Menu:
    """Helper to compile pystray menu dynamically on right click."""
    return Menu(
        Item("Open App", reopen_window, default=True),
        Item(lambda item: f"Devices: {_current_ip}", action=None, enabled=False),
        Item("Restart Server", restart_server_action),
        Menu.SEPARATOR,
        Item("Settings", Menu(
            Item("Start with Windows", toggle_autostart, checked=lambda item: is_autostart_enabled())
        )),
        Menu.SEPARATOR,
        Item("Exit Application", exit_application)
    )

def show_window(ip: str, port: int, code: str, qr_path: str) -> None:
    """Launches the Tkinter status window and starts the system tray icon."""
    global root, code_lbl, qr_lbl, status_badge_lbl, _tray_icon
    
    root = tk.Tk()
    root.title("PhonePad Server")
    root.geometry("380x550")
    root.resizable(False, False)
    root.configure(bg="#FFFDF5")  # Clean Cream background

    # Design palette colors
    bg_color = "#FFFDF5"
    fg_color = "#1E293B"
    accent_color = "#8B5CF6"
    muted_color = "#64748B"
    card_bg = "#FFFFFF"

    # Set application close button to intercept minimize-to-tray
    root.protocol("WM_DELETE_WINDOW", hide_window)

    # 1. Header Label
    header_frame = tk.Frame(root, bg=bg_color)
    header_frame.pack(pady=(20, 4))

    title_lbl = tk.Label(
        header_frame, 
        text="PhonePad", 
        font=("Arial", 28, "bold"), 
        bg=bg_color, 
        fg=fg_color
    )
    title_lbl.pack()

    subtitle_lbl = tk.Label(
        header_frame, 
        text="P A I R I N G   S E R V E R", 
        font=("Arial", 10, "bold"), 
        bg=bg_color, 
        fg=accent_color
    )
    subtitle_lbl.pack(pady=(2, 0))

    # 2. Connection Status Badge
    status_badge_lbl = tk.Label(
        root,
        text="Waiting for device...",
        font=("Arial", 11, "bold"),
        bg=bg_color,
        fg=muted_color
    )
    status_badge_lbl.pack(pady=(4, 8))

    # 3. Access Code Section
    card_frame = tk.Frame(
        root, 
        bg=card_bg, 
        highlightthickness=2, 
        highlightbackground=fg_color, 
        bd=0
    )
    card_frame.pack(pady=8, padx=40, fill="x")

    code_title = tk.Label(
        card_frame, 
        text="ACCESS CODE", 
        font=("Arial", 9, "bold"), 
        bg=card_bg, 
        fg=muted_color
    )
    code_title.pack(pady=(8, 2))

    spaced_code = "  ".join(code)
    code_lbl = tk.Label(
        card_frame, 
        text=spaced_code, 
        font=("Arial", 24, "bold"), 
        bg=card_bg, 
        fg=fg_color
    )
    code_lbl.pack(pady=(0, 8))

    # 4. QR Code display
    qr_frame = tk.Frame(
        root, 
        bg=card_bg, 
        highlightthickness=2, 
        highlightbackground=fg_color, 
        bd=0
    )
    qr_frame.pack(pady=8)

    try:
        pil_img = Image.open(qr_path).resize((200, 200), Image.Resampling.LANCZOS)
        qr_img = ImageTk.PhotoImage(pil_img)
        root.qr_image_ref = qr_img
        
        qr_lbl = tk.Label(qr_frame, image=qr_img, bg=card_bg, bd=0)
        qr_lbl.pack(padx=4, pady=4)
    except Exception as e:
        logger.error(f"Failed to render QR Image in Tkinter: {e}")
        error_lbl = tk.Label(
            qr_frame, 
            text="[QR Code Error]", 
            font=("Arial", 12), 
            bg=card_bg, 
            fg=fg_color,
            width=20,
            height=10
        )
        error_lbl.pack(pady=20)

    # 5. Info Footer
    footer_frame = tk.Frame(root, bg=bg_color)
    footer_frame.pack(pady=(8, 16), fill="x")

    ip_lbl = tk.Label(
        footer_frame, 
        text=f"Server URL: ws://{ip}:{port}", 
        font=("Arial", 11, "bold"), 
        bg=bg_color, 
        fg=fg_color
    )
    ip_lbl.pack()

    hint_lbl = tk.Label(
        footer_frame, 
        text="Closing this window minimizes it to system tray.", 
        font=("Arial", 9), 
        bg=bg_color, 
        fg=muted_color
    )
    hint_lbl.pack(pady=(4, 0))

    # Center window on screen
    root.update_idletasks()
    w = root.winfo_width()
    h = root.winfo_height()
    x = (root.winfo_screenwidth() // 2) - (w // 2)
    y = (root.winfo_screenheight() // 2) - (h // 2)
    root.geometry(f"{w}x{h}+{x}+{y}")

    # Start polling the UI queue
    root.after(50, process_ui_queue)

    # 6. Initialize & Launch System Tray Icon
    _tray_icon = pystray.Icon(
        "PhonePad",
        icon=create_tray_icon_image(),
        title="PhonePad - Waiting for device",
        menu=create_tray_menu()
    )
    
    # Set double click to reopen window
    # In pystray, passing action=reopen_window is executed on double click
    # (Note: pystray's double-click action defaults to the default item, but setting it explicitly is robust)
    
    # Run pystray in a detached background thread
    _tray_icon.run_detached()

    root.mainloop()
