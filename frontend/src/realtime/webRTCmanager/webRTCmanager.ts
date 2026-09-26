import { SignalingManager } from '../signaling/signalingManager';
import { PeerConnectionManager } from '../peerConnection/peerConnectionManager';
import { ICEManager } from '../ICEmanager/ICEmanager';
import { DataChannel, type DataChannelCallbacks } from '../DataChannel/DataChannel';
import type { DrawingStroke } from '../DrawingCanvas';
import { signalingEvents } from '../signaling/signalingEvents';
import type { OfferEvent } from '../signaling/signalingTypes';

type WebRTCManagerCallbacks = {
    dataChannel: DataChannelCallbacks;
    onStatus: (status: string) => void;
    onConnectionRequest: (peerId: string) => void;
    onPeers: (peerIds: string[]) => void;
    onPeerStatus: (peerId: string, status: string) => void;
};

type PeerState = {
    connection: PeerConnectionManager;
    ice: ICEManager;
    dataChannel: DataChannel | null;
};

export class WebRTCManager {
    private signaling: SignalingManager;
    private peers = new Map<string, PeerState>();
    private callbacks: WebRTCManagerCallbacks;
    private peerIds = new Set<string>();
    private pendingOffers = new Map<string, OfferEvent>();

    constructor(signaling: SignalingManager, callbacks: WebRTCManagerCallbacks) {
        this.signaling = signaling;
        this.callbacks = callbacks;
    }

    connect(roomId: string) {
        this.signaling.onConnect(() => {
            this.joinRoom(roomId);
            this.callbacks.onStatus('Joined room');
        });
        this.signaling.on(signalingEvents.roomPeers, (payload) => {
            if (!payload?.peerIds) return;
            payload.peerIds.forEach((peerId) => this.addPeer(peerId));
        });
        this.signaling.on(signalingEvents.userJoined, (payload) => {
            const userId = payload?.userId;
            if (!userId) return;
            this.addPeer(userId);
            this.callbacks.onPeerStatus(userId, 'Available');
        });
        this.signaling.on(signalingEvents.offer, (offer) => this.receiveOffer(offer));
        this.signaling.on(signalingEvents.answer, (payload) => {
            if (!payload?.answer || !payload.from) return;
            const { answer, from } = payload;
            void this.handleAnswer(from, answer);
        });
        this.signaling.on(signalingEvents.iceCandidate, (payload) => {
            if (!payload?.candidate || !payload.from) return;
            const { candidate, from } = payload;
            void this.handleIceCandidate(from, candidate);
        });
        this.signaling.on(signalingEvents.peerLeft, (payload) => {
            if (payload?.userId) this.removePeer(payload.userId);
        });
        this.signaling.onDisconnect(() => this.callbacks.onStatus('Signaling server disconnected'));
        this.signaling.connect();
    }

    joinRoom(roomId: string) {
        this.signaling.joinRoom(roomId);
    }

    async startConnection(peerId: string) {
        const peer = this.addPeer(peerId);
        if (!peer) return;
        if (!peer.dataChannel) {
            this.setDataChannel(peerId, peer.connection.createDataChannel('collaboration'));
        }
        this.callbacks.onPeerStatus(peerId, 'Connecting');
        const offer = await peer.connection.createOffer();
        this.signaling.sendOffer(peerId, offer);
    }

    private receiveOffer(offer: OfferEvent) {
        this.addPeer(offer.from);
        this.pendingOffers.set(offer.from, offer);
        this.callbacks.onConnectionRequest(offer.from);
        this.callbacks.onPeerStatus(offer.from, 'Incoming offer');
    }

    async acceptOffer(peerId: string) {
        const offerEvent = this.pendingOffers.get(peerId);
        const peer = this.peers.get(peerId);
        if (!offerEvent || !peer) return;
        await peer.connection.setRemoteDescription(offerEvent.offer);
        await this.flushCandidates(peerId);
        const answer = await peer.connection.createAnswer();
        this.signaling.sendAnswer(peerId, answer);
        this.pendingOffers.delete(peerId);
        this.callbacks.onPeerStatus(peerId, 'Connecting');
    }

    private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
        const peer = this.peers.get(peerId);
        if (!peer) return;
        await peer.connection.setRemoteDescription(answer);
        await this.flushCandidates(peerId);
    }

    private async handleIceCandidate(peerId: string, candidate: RTCIceCandidateInit) {
        const peer = this.addPeer(peerId);
        if (!peer) return;
        if (!peer.connection.hasRemoteDescription) {
            peer.ice.addCandidate(candidate);
            return;
        }
        await peer.connection.addIceCandidate(candidate);
    }

    private async flushCandidates(peerId: string) {
        const peer = this.peers.get(peerId);
        if (!peer) return;
        await peer.ice.flushCandidates((candidate) => peer.connection.addIceCandidate(candidate));
    }

    sendMessage(peerId: string, text: string) {
        return this.peers.get(peerId)?.dataChannel?.sendMessage(text) ?? false;
    }

    sendDrawing(peerId: string, stroke: DrawingStroke) {
        return this.peers.get(peerId)?.dataChannel?.sendDrawing(stroke) ?? false;
    }

    close() {
        this.peers.forEach((peer) => {
            peer.dataChannel?.close();
            peer.ice.clearCandidates();
            peer.connection.close();
        });
        this.peers.clear();
        this.signaling.close();
    }

    private addPeer(peerId: string) {
        if (!peerId) return null;
        this.peerIds.add(peerId);
        this.callbacks.onPeers([...this.peerIds]);
        const existingPeer = this.peers.get(peerId);
        if (existingPeer) return existingPeer;

        const connection = new PeerConnectionManager();
        const peer: PeerState = { connection, ice: new ICEManager(), dataChannel: null };
        this.peers.set(peerId, peer);
        connection.onIceCandidate((event) => {
            if (event.candidate) this.signaling.sendIceCandidate(peerId, event.candidate);
        });
        connection.onDataChannel((event) => this.setDataChannel(peerId, event.channel));
        connection.onConnectionStateChange(() => {
            this.callbacks.onPeerStatus(peerId, connection.connectionState);
        });
        return peer;
    }

    private setDataChannel(peerId: string, channel: RTCDataChannel) {
        const peer = this.peers.get(peerId);
        if (!peer) return;
        peer.dataChannel = new DataChannel(channel, {
            onMessage: (message) => this.callbacks.dataChannel.onMessage({ ...message, peerId }),
            onDrawing: this.callbacks.dataChannel.onDrawing,
            onStatus: (status) => {
                this.callbacks.onPeerStatus(peerId, status);
                this.callbacks.dataChannel.onStatus(status);
            },
        });
    }

    private removePeer(peerId: string) {
        const peer = this.peers.get(peerId);
        peer?.dataChannel?.close();
        peer?.ice.clearCandidates();
        peer?.connection.close();
        this.peers.delete(peerId);
        this.peerIds.delete(peerId);
        this.pendingOffers.delete(peerId);
        this.callbacks.onPeers([...this.peerIds]);
    }
}
