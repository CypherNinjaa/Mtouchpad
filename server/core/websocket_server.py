# server/core/websocket_server.py
import json
import time
import logging
import urllib.parse
import asyncio
from typing import Optional, Set
import websockets
from config import HOST, PORT_WS, MAX_ATTEMPTS
from core.input_handler import handle_event

logger = logging.getLogger(__name__)

# Active controller tracking (enforce max 1 client)
active_client = None
active_client_lock = asyncio.Lock()
server_loop = None

# Security: IP rate-limiting for failed attempts (maps IP -> (fail_count, last_attempt_time))
failed_attempts: dict[str, tuple[int, float]] = {}

# Access code value to verify (set at startup)
_expected_access_code: Optional[str] = None

def set_access_code(code: str) -> None:
    """Set the active session access code."""
    global _expected_access_code, failed_attempts
    _expected_access_code = code
    failed_attempts.clear()
    logger.info("Access code updated; rate-limiting block list cleared.")

def close_active_connection() -> None:
    """Drop the active client connection if any, safely from another thread."""
    global active_client, server_loop
    if active_client is not None and server_loop is not None:
        logger.info("Dropping active client connection programmatically.")
        asyncio.run_coroutine_threadsafe(active_client.close(), server_loop)

async def handler(websocket) -> None:
    """Handles incoming WebSocket connections."""
    global active_client
    
    ip: str = websocket.remote_address[0]
    path: str = websocket.request.path
    
    # 1. Rate-limit check with a 30-second window
    now = time.time()
    if ip in failed_attempts:
        count, last_time = failed_attempts[ip]
        if now - last_time > 30.0:
            failed_attempts.pop(ip, None)
        elif count >= MAX_ATTEMPTS:
            logger.warning(f"Connection rejected from {ip}: too many failed auth attempts (rate-limited).")
            await websocket.close(4003, "Too many failed attempts")
            return

    # 2. Extract and verify access code
    parsed_url = urllib.parse.urlparse(path)
    params = urllib.parse.parse_qs(parsed_url.query)
    client_code = params.get("code", [None])[0]

    if _expected_access_code is None or client_code != _expected_access_code:
        now = time.time()
        count = 1
        if ip in failed_attempts:
            prev_count, last_time = failed_attempts[ip]
            if now - last_time <= 30.0:
                count = prev_count + 1
        failed_attempts[ip] = (count, now)
        logger.warning(f"Failed authentication attempt {count}/{MAX_ATTEMPTS} from {ip}")
        await websocket.close(4001, "Invalid access code")
        return

    # Reset failure count on successful authentication
    failed_attempts.pop(ip, None)

    # 3. Single-client enforcement
    async with active_client_lock:
        if active_client is not None:
            logger.warning(f"Rejecting client {ip}: server is currently full.")
            await websocket.close(4002, "Server full")
            return
        active_client = websocket

    logger.info(f"Client connected and authenticated: {ip}")
    try:
        from ui.status_window import set_device_connected
        set_device_connected(ip)
    except Exception as e:
        logger.error(f"Failed to update UI on device connection: {e}")

    # 4. Message loop — hot path optimized for minimal latency on move events
    try:
        async for message in websocket:
            try:
                event = json.loads(message)
                event_type = event.get("type")
                
                if event_type == "ping":
                    # Handle ping immediately for latency calculation
                    client_ts = event.get("ts", 0)
                    server_ts = int(time.time() * 1000)
                    latency = max(0, server_ts - client_ts) if client_ts else 0
                    
                    pong_response = {
                        "type": "pong",
                        "latency": latency,
                        "ts": client_ts
                    }
                    await websocket.send(json.dumps(pong_response))
                else:
                    # Dispatch to input handler — runs synchronously for minimum latency.
                    # move/scroll events are the hottest path (~60-120 msgs/sec).
                    handle_event(event)
            except json.JSONDecodeError:
                logger.warning(f"Received malformed JSON message from {ip}")
            except Exception as e:
                logger.error(f"Error handling message from {ip}: {e}")
    except websockets.ConnectionClosedOK:
        logger.info(f"Client disconnected normally: {ip}")
    except websockets.ConnectionClosedError as e:
        logger.warning(f"Client connection closed abnormally: {ip} (code: {e.code}, reason: {e.reason})")
    except Exception as e:
        logger.error(f"Unexpected error in client session loop: {e}")
    finally:
        did_disconnect = False
        async with active_client_lock:
            if active_client == websocket:
                active_client = None
                did_disconnect = True
                logger.info(f"Session released. Server is ready for next connection.")
        if did_disconnect:
            try:
                from ui.status_window import set_device_disconnected
                set_device_disconnected()
            except Exception as e:
                logger.error(f"Failed to update UI on device disconnection: {e}")

async def start_server(host: str = HOST, port: int = PORT_WS) -> None:
    """Start the WebSocket server on the given host and port."""
    global server_loop
    server_loop = asyncio.get_running_loop()
    logger.info(f"Starting WebSocket server on ws://{host}:{port}")
    async with websockets.serve(handler, host, port):
        await asyncio.Future()  # Keep server running forever
