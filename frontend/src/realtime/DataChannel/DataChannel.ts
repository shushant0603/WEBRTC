import type { DrawingStroke } from '../DrawingCanvas';

export type ChatMessage = {
    id: number;
    sender: 'You' | 'Peer';
    text: string;
    peerId?: string;
};

export type DataChannelCallbacks = {
    onMessage: (message: ChatMessage) => void;
    onDrawing: (stroke: DrawingStroke) => void;
    onStatus: (status: string) => void;
};

export class DataChannel {
    private channel: RTCDataChannel;
    private callbacks: DataChannelCallbacks;
    private messageId = 0;

    constructor(channel: RTCDataChannel, callbacks: DataChannelCallbacks) {
        this.channel = channel;
        this.callbacks = callbacks;
        this.channel.onopen = () => this.callbacks.onStatus('Data channel connected');
        this.channel.onclose = () => this.callbacks.onStatus('Data channel closed');
        this.channel.onerror = () => this.callbacks.onStatus('Data channel error');
        this.channel.onmessage = (event) => this.receive(String(event.data));
    }

    send(data: string) {
        if (this.channel.readyState === 'open') {
            this.channel.send(data);
            return true;
        }
        return false;
    }

    sendMessage(text: string) {
        const sent = this.send(JSON.stringify({ type: 'text', text }));
        if (sent) this.addMessage('You', text);
        return sent;
    }

    sendDrawing(stroke: DrawingStroke) {
        return this.send(JSON.stringify(stroke));
    }

    private receive(data: string) {
        try {
            const payload: unknown = JSON.parse(data);
            if (typeof payload === 'object' && payload !== null && 'type' in payload) {
                if (payload.type === 'draw') this.callbacks.onDrawing(payload as DrawingStroke);
                if (payload.type === 'text' && 'text' in payload && typeof payload.text === 'string') {
                    this.addMessage('Peer', payload.text);
                }
                return;
            }
        } catch {
            this.addMessage('Peer', data);
        }
    }

    private addMessage(sender: ChatMessage['sender'], text: string) {
        this.callbacks.onMessage({ id: this.messageId++, sender, text });
    }

    close() {
        this.channel.close();
    }

    getState() {
        return this.channel.readyState;
    }
}