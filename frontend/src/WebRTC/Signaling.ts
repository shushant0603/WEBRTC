import { io, type Socket } from 'socket.io-client';

export type ChatMessage = {
  id: number;
  sender: 'You' | 'Peer';
  text: string;
};

type SignalingCallbacks = {
  onMessage: (message: ChatMessage) => void;
  onStatus: (status: string) => void;
};

const socketUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function createSignaling(
  roomId: string,
  { onMessage, onStatus }: SignalingCallbacks,
) {
  const socket: Socket = io(socketUrl, { autoConnect: false });
  const peerConnection = new RTCPeerConnection();
  let otherPeerId: string | null = null;
  let dataChannel: RTCDataChannel | null = null;
  let messageId = 0;
  const pendingCandidates: RTCIceCandidateInit[] = [];

  const addMessage = (sender: ChatMessage['sender'], text: string) => {
    onMessage({ id: messageId++, sender, text });
  };

  const configureDataChannel = (channel: RTCDataChannel) => {
    dataChannel = channel;
    dataChannel.onopen = () => onStatus('Data channel connected');
    dataChannel.onclose = () => onStatus('Data channel closed');
    dataChannel.onerror = () => onStatus('Data channel error');
    dataChannel.onmessage = (event) => addMessage('Peer', String(event.data));
  };

  const flushCandidates = async () => {
    while (pendingCandidates.length > 0) {
      const candidate = pendingCandidates.shift();
      if (candidate) await peerConnection.addIceCandidate(candidate);
    }
  };

  const createOffer = async () => {
    if (!otherPeerId) {
      onStatus('Waiting for another peer');
      return;
    }

    if (!dataChannel) {
      configureDataChannel(peerConnection.createDataChannel('collaboration'));
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', {
      offer: peerConnection.localDescription,
      target: otherPeerId,
    });
    onStatus('Offer sent');
  };

  const handleUserJoined = ({ userId }: { userId: string }) => {
    otherPeerId = userId;
    onStatus('Peer found. Create an offer.');
  };

  const handleOffer = async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
    otherPeerId = from;
    await peerConnection.setRemoteDescription(offer);
    await flushCandidates();
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer: peerConnection.localDescription, target: from });
    onStatus('Answer sent');
  };

  const handleAnswer = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
    await peerConnection.setRemoteDescription(answer);
    await flushCandidates();
    onStatus('Connected');
  };

  const handleIceCandidate = async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
    otherPeerId = from;
    if (peerConnection.remoteDescription) {
      await peerConnection.addIceCandidate(candidate);
    } else {
      pendingCandidates.push(candidate);
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && otherPeerId) {
      socket.emit('ice-candidate', {
        candidate: event.candidate,
        target: otherPeerId,
      });
    }
  };

  peerConnection.ondatachannel = (event) => configureDataChannel(event.channel);
  peerConnection.onconnectionstatechange = () => {
    onStatus(`Connection: ${peerConnection.connectionState}`);
  };

  socket.on('connect', () => {
    socket.emit('join-room', roomId);
    onStatus('Joined room. Waiting for a peer.');
  });
  socket.on('user-joined', handleUserJoined);
  socket.on('offer', handleOffer);
  socket.on('answer', handleAnswer);
  socket.on('ice-candidate', handleIceCandidate);
  socket.on('peer-left', () => onStatus('Peer disconnected'));
  socket.on('disconnect', () => onStatus('Signaling server disconnected'));

  socket.connect();

  return {
    createOffer,
    sendMessage(text: string) {
      if (dataChannel?.readyState !== 'open') {
        onStatus('Data channel is not open');
        return false;
      }
      dataChannel.send(text);
      addMessage('You', text);
      return true;
    },
    cleanup() {
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('peer-left');
      socket.disconnect();
      peerConnection.close();
    },
  };
}
