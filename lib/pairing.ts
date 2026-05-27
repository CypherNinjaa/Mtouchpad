// client/lib/pairing.ts

export function parseQRPayload(data: string): { ip: string; port: number; code: string } | null {
  try {
    const cleaned = data.trim().replace(/^phonepad:\/\//i, "http://");
    const url = new URL(cleaned);
    
    const ip = url.hostname;
    const port = Number(url.port) || 8765;
    const code = url.searchParams.get("code") ?? "";
    
    if (!ip) return null;
    
    return { ip, port, code };
  } catch {
    return null;
  }
}

export function buildWsUrl(ip: string, port: number, code: string): string {
  return `ws://${ip}:${port}?code=${code}`;
}
