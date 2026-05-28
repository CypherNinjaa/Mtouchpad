# server/core/pairing.py
import os
import random
import socket
import string
import logging
import qrcode
from config import ACCESS_CODE_LENGTH, APP_NAME

logger = logging.getLogger(__name__)

def get_lan_ip() -> str:
    """Detect the laptop's LAN IP address by establishing a dummy connection."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not send actual packet; resolves outgoing interface
        s.connect(("8.8.8.8", 80))
        ip: str = s.getsockname()[0]
        return ip
    except Exception as e:
        logger.warning(f"Could not automatically detect LAN IP, falling back to localhost: {e}")
        return "127.0.0.1"
    finally:
        s.close()

def generate_access_code(length: int = ACCESS_CODE_LENGTH) -> str:
    """Generate a random numeric string of specified length."""
    return "".join(random.choices(string.digits, k=length))

def generate_qr(ip: str, port: int, code: str) -> str:
    """Generate a QR code containing pairing info and save it locally in the project workspace."""
    payload: str = f"phonepad://{ip}:{port}?code={code}"
    
    # Establish a temp directory inside the server package
    server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    temp_dir = os.path.join(server_dir, "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    qr_path = os.path.join(temp_dir, "phonepad_qr.png")
    
    try:
        img = qrcode.make(payload)
        img.save(qr_path)
        logger.info(f"QR code generated and saved to {qr_path}")
    except Exception as e:
        logger.error(f"Failed to generate QR code: {e}")
        
    return qr_path
