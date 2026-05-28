# server/main.py
import asyncio
import logging
import threading
from config import APP_NAME, APP_VERSION, HOST, PORT_WS
from core.pairing import get_lan_ip, generate_access_code, generate_qr
from core.websocket_server import start_server, set_access_code
from ui.status_window import show_window

# Configure Logger
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def run_server_thread() -> None:
    """Target for background thread running the asyncio event loop."""
    try:
        asyncio.run(start_server(host=HOST, port=PORT_WS))
    except Exception as e:
        logger.error(f"Fatal server execution error in background thread: {e}")

def main() -> None:
    logger.info(f"=== Starting {APP_NAME} v{APP_VERSION} ===")
    
    # 1. Detect network environment
    ip: str = get_lan_ip()
    code: str = generate_access_code()
    
    logger.info(f"Detected LAN IP: {ip}")
    logger.info(f"Generated Session Access Code: {code}")
    
    # 2. Pre-generate pairing QR code
    qr_path: str = generate_qr(ip, PORT_WS, code)
    logger.info(f"Pairing QR code generated at: {qr_path}")
    
    # 3. Configure WebSocket server access code
    set_access_code(code)
    
    logger.info(f"Server is listening at ws://{ip}:{PORT_WS}")
    logger.info("Ready for phone connection! Scan the QR or enter the access code manually.")
    
    # 4. Spin up server on a background daemon thread
    t = threading.Thread(target=run_server_thread, daemon=True)
    t.start()
    
    # 5. Open GUI window on main thread (main loop blocks here)
    show_window(ip, PORT_WS, code, qr_path)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("Server terminated by user keyboard interrupt.")
