import { useEffect, useRef, useState } from 'react';
import { createSignaling, type ChatMessage } from './WebRTC/Signaling';
import './App.css';

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('Connecting...');
  const signaling = useRef<ReturnType<typeof createSignaling> | null>(null);

  useEffect(() => {
    signaling.current = createSignaling('room1', {
      onMessage: (nextMessage) => setMessages((current) => [...current, nextMessage]),
      onStatus: setStatus,
    });

    return () => signaling.current?.cleanup();
  }, []);

  const sendMessage = () => {
    const value = message.trim();

    if (!value) return;

    if (signaling.current?.sendMessage(value)) setMessage('');
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

        <button className="offer-button" type="button" onClick={() => signaling.current?.createOffer()}>
          Create Offer
        </button>

        <div className="messages" aria-live="polite">
          {messages.length === 0 ? (
            <p className="empty-state">No messages yet. Connect to a peer to begin.</p>
          ) : (
            messages.map((item) => (
              <p className={`message ${item.sender === 'You' ? 'message-you' : ''}`} key={item.id}>
                <strong>{item.sender}</strong> {item.text}
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