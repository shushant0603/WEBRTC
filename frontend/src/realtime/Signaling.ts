import { createDataChannelManager, type ChatMessage } from './DataChannel';
import type { DrawingStroke } from './DrawingCanvas';
import { SignalingClient } from './signaling/signalclient';
import { signalingEvents } from './signaling/signalingEvents';
import type {
  AnswerEvent,
  IceCandidateEvent,
  OfferEvent,
  UserJoinedEvent,
} from './signaling/signalingTypes';

type SignalingCallbacks = {
  onMessage: (message: ChatMessage) => void;
  onDrawing: (stroke: DrawingStroke) => void;
  onStatus: (status: string) => void;
  onConnectionRequest: (peerId: string) => void;
};

const socketUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function createSignaling(
  roomId: string,
  { onMessage, onDrawing, onStatus, onConnectionRequest }: SignalingCallbacks,
) {
  const signalingClient = new SignalingClient(socketUrl);

  const peerConnection = new RTCPeerConnection();
  let otherPeerId: string | null = null;
  let pendingOffer: OfferEvent | null = null;
  const pendingCandidates: RTCIceCandidateInit[] = [];
  const dataChannel = createDataChannelManager(peerConnection, { onMessage, onDrawing, onStatus });

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

    dataChannel.create();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    if (peerConnection.localDescription) {
      signalingClient.sendOffer(otherPeerId, peerConnection.localDescription);
    }
    onStatus('Offer sent');
  };

  const handleUserJoined = ({ userId }: UserJoinedEvent) => {
    otherPeerId = userId;
    onStatus('Peer found. Create an offer.');
  };

  const acceptOffer = async () => {
    if (!pendingOffer) return;

    const { offer, from } = pendingOffer;
    otherPeerId = from;
    await peerConnection.setRemoteDescription(offer);
    await flushCandidates();
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    if (peerConnection.localDescription) {
      signalingClient.sendAnswer(from, peerConnection.localDescription);
    }
    pendingOffer = null;
    onStatus('Answer sent');
  };

  const handleOffer = (offerEvent: OfferEvent) => {
    pendingOffer = offerEvent;
    onConnectionRequest(offerEvent.from);
    onStatus('Incoming connection request');
  };

  const handleAnswer = async ({ answer }: AnswerEvent) => {
    await peerConnection.setRemoteDescription(answer);
    await flushCandidates();
    onStatus('Connected');
  };

  const handleIceCandidate = async ({ candidate, from }: IceCandidateEvent) => {
    otherPeerId = from;
    if (peerConnection.remoteDescription) {
      await peerConnection.addIceCandidate(candidate);
    } else {
      pendingCandidates.push(candidate);
    }
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate && otherPeerId) {
      signalingClient.sendIceCandidate(otherPeerId, event.candidate);
    }
  };

  peerConnection.ondatachannel = (event) => dataChannel.receive(event.channel);
  peerConnection.onconnectionstatechange = () => {
    onStatus(`Connection: ${peerConnection.connectionState}`);
  };

  const handleConnect = () => {
    signalingClient.joinRoom(roomId);
    onStatus('Joined room. Waiting for a peer.');
  };
  const handlePeerLeft = () => onStatus('Peer disconnected');
  const handleDisconnect = () => onStatus('Signaling server disconnected');

  signalingClient.on('connect', handleConnect);
  signalingClient.on(signalingEvents.userJoined, handleUserJoined);
  signalingClient.on(signalingEvents.offer, handleOffer);
  signalingClient.on(signalingEvents.answer, handleAnswer);
  signalingClient.on(signalingEvents.iceCandidate, handleIceCandidate);
  signalingClient.on(signalingEvents.peerLeft, handlePeerLeft);
  signalingClient.on('disconnect', handleDisconnect);

  signalingClient.connect();

  return {
    createOffer,
    acceptOffer,
    sendMessage: dataChannel.send,
    sendDrawing: dataChannel.sendDrawing,
    cleanup() {
      signalingClient.off('connect', handleConnect);
      signalingClient.off(signalingEvents.userJoined, handleUserJoined);
      signalingClient.off(signalingEvents.offer, handleOffer);
      signalingClient.off(signalingEvents.answer, handleAnswer);
      signalingClient.off(signalingEvents.iceCandidate, handleIceCandidate);
      signalingClient.off(signalingEvents.peerLeft, handlePeerLeft);
      signalingClient.off('disconnect', handleDisconnect);
      signalingClient.disconnect();
      dataChannel.close();
      peerConnection.close();
    },
  };
}
