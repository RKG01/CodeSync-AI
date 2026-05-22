/**
 * WebSocket service for general app communication (chat, presence, events).
 * NOT the Yjs WebSocket — that's handled separately in useYjs.
 */

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimer = null;
    this.token = null;
    this.isIntentionalClose = false;
  }

  connect(token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.token = token;
    this.isIntentionalClose = false;
    const url = `${WS_BASE}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
      this._emit('connected', { connected: true });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.type || data.event || 'message';
        this._emit(eventType, data);
        this._emit('message', data);
      } catch {
        this._emit('message', { raw: event.data });
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      this._emit('error', { error });
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      this._emit('disconnected', { code: event.code, reason: event.reason });
      if (!this.isIntentionalClose) {
        this._scheduleReconnect();
      }
    };
  }

  disconnect() {
    this.isIntentionalClose = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  send(event, data) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send — not connected');
      return false;
    }
    try {
      this.ws.send(JSON.stringify({ type: event, ...data }));
      return true;
    } catch (err) {
      console.error('[WS] Send error:', err);
      return false;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  _emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[WS] Handler error for "${event}":`, err);
        }
      });
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnect attempts reached');
      this._emit('reconnect_failed', {});
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }
}

// Singleton instance
const wsService = new WebSocketService();
export default wsService;
