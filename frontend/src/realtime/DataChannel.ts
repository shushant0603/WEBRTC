import type { DrawingStroke } from './DrawingCanvas';

export type ChatMessage = {
  id: number;
  sender: 'You' | 'Peer';
  text: string;
  peerId?: string;
};

type DataChannelCallbacks = {
  onMessage: (message: ChatMessage) => void;
  onDrawing: (stroke: DrawingStroke) => void;
  onStatus: (status: string) => void;
};

export function createDataChannelManager(
  peerConnection: RTCPeerConnection,
  { onMessage, onDrawing, onStatus }: DataChannelCallbacks,
) {
  let channel: RTCDataChannel | null = null;
  let messageId = 0;

  const addMessage = (sender: ChatMessage['sender'], text: string) => {
    onMessage({ id: messageId++, sender, text });
  };

  const attachChannel = (nextChannel: RTCDataChannel) => {
    channel = nextChannel;

    channel.onopen = () => onStatus('Data channel connected');
    channel.onclose = () => onStatus('Data channel closed');
    channel.onerror = () => onStatus('Data channel error');
    channel.onmessage = (event) => {
      try {
        const payload: unknown = JSON.parse(String(event.data));
        if (typeof payload === 'object' && payload !== null && 'type' in payload) {
          if (payload.type === 'draw') onDrawing(payload as DrawingStroke);
          if (payload.type === 'text' && 'text' in payload && typeof payload.text === 'string') {
            addMessage('Peer', payload.text);
          }
          return;
        }
      } catch {
        addMessage('Peer', String(event.data));
      }
    };
  };

  return {
    create() {
      if (!channel) {
        attachChannel(peerConnection.createDataChannel('collaboration'));
      }
    },

    receive(nextChannel: RTCDataChannel) {
      attachChannel(nextChannel);
    },

    send(text: string) {
      if (channel?.readyState !== 'open') {
        onStatus('Data channel is not open');
        return false;
      }

      channel.send(JSON.stringify({ type: 'text', text }));
      addMessage('You', text);
      return true;
    },

    sendDrawing(stroke: DrawingStroke) {
      if (channel?.readyState !== 'open') return false;
      channel.send(JSON.stringify(stroke));
      return true;
    },

    close() {
      channel?.close();
      channel = null;
    },
  };
}
