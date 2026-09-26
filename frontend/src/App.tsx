import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from './realtime/DataChannel';
import { DrawingCanvas, type DrawingCanvasHandle, type DrawingStroke } from './realtime/DrawingCanvas';
import { SignalingManager } from './realtime/signaling/signalingManager';
import { WebRTCManager } from './realtime/webRTCmanager/webRTCmanager';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('Connecting...');
  const [peers, setPeers] = useState<string[]>([]);
  const [peerStatuses, setPeerStatuses] = useState<Record<string, string>>({});
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [connectionRequests, setConnectionRequests] = useState<string[]>([]);
  const webRTC = useRef<WebRTCManager | null>(null);
  const canvasRef = useRef<DrawingCanvasHandle>(null);

  useEffect(() => {
    const manager = new WebRTCManager(
      new SignalingManager(import.meta.env.VITE_API_URL ?? 'http://localhost:3000'),
      {
        dataChannel: {
          onMessage: (nextMessage) => setMessages((current) => [...current, nextMessage]),
          onDrawing: (stroke) => canvasRef.current?.drawRemoteStroke(stroke),
          onStatus: setStatus,
        },
        onStatus: setStatus,
        onConnectionRequest: (peerId) => {
          setConnectionRequests((current) => current.includes(peerId) ? current : [...current, peerId]);
        },
        onPeers: (peerIds) => {
          setPeers(peerIds);
          setSelectedPeer((current) => current && peerIds.includes(current) ? current : peerIds[0] ?? null);
        },
        onPeerStatus: (peerId, nextStatus) => {
          setPeerStatuses((current) => ({ ...current, [peerId]: nextStatus }));
        },
      },
    );
    webRTC.current = manager;
    manager.connect('room1');

    return () => manager.close();
  }, []);

  const sendDrawing = (stroke: DrawingStroke) => {
    if (selectedPeer) webRTC.current?.sendDrawing(selectedPeer, stroke);
  };

  const sendMessage = () => {
    const value = message.trim();

    if (!value) return;

    if (selectedPeer && webRTC.current?.sendMessage(selectedPeer, value)) setMessage('');
  };

  return (
    <main className="chat-shell">
      <section className="chat-card">
        <header className="chat-header">
          <div>
            <p className="eyebrow">WebRTC room</p>
            <h1>Peer chat</h1>
          </div>
          <span className="status">{status}</span>
        </header>

        <div className="peers">
          <h2>People in room</h2>
          {peers.length === 0 ? (
            <p className="empty-state">Waiting for people to join.</p>
          ) : (
            peers.map((peerId) => (
              <button
                className={`peer-row ${selectedPeer === peerId ? 'peer-row-selected' : ''}`}
                key={peerId}
                type="button"
                onClick={() => setSelectedPeer(peerId)}
              >
                <span>{peerId}</span>
                <small>{peerStatuses[peerId] ?? 'Available'}</small>
              </button>
            ))
          )}
        </div>

        <button
          className="offer-button"
          type="button"
          disabled={!selectedPeer}
          onClick={() => selectedPeer && void webRTC.current?.startConnection(selectedPeer)}
        >
          Create Offer
        </button>

        {connectionRequests.map((peerId) => (
          <div className="connection-request" key={peerId} role="alert">
            <div>
              <strong>Incoming connection request</strong>
              <span>Peer {peerId} wants to connect.</span>
            </div>
            <button
              className="accept-button"
              type="button"
              onClick={() => {
                void webRTC.current?.acceptOffer(peerId);
                setConnectionRequests((current) => current.filter((id) => id !== peerId));
                setSelectedPeer(peerId);
              }}
            >
              Accept
            </button>
          </div>
        ))}

        <div className="canvas-heading">
          <h2>Shared canvas</h2>
          <button className="clear-button" type="button" onClick={() => canvasRef.current?.clear()}>
            Clear
          </button>
        </div>
        <DrawingCanvas ref={canvasRef} onStroke={sendDrawing} />

        <div className="messages" aria-live="polite">
          {messages.length === 0 ? (
            <p className="empty-state">No messages yet. Connect to a peer to begin.</p>
          ) : (
            messages.map((item) => (
              <p className={`message ${item.sender === 'You' ? 'message-you' : ''}`} key={`${item.peerId ?? 'local'}-${item.id}`}>
                <strong>{item.sender}</strong>{item.peerId ? ` (${item.peerId})` : ''} {item.text}
              </p>
            ))
          )}
        </div>

        <div className="composer">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') sendMessage();
            }}
          />

          <button type="button" onClick={sendMessage}>Send</button>
        </div>
      </section>
    </main>
  );
}

export default App;