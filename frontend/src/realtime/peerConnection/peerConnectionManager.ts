export class PeerConnectionManager {

    private peerConnection: RTCPeerConnection;

    constructor() {
        this.peerConnection = new RTCPeerConnection();
    }

    async createOffer(): Promise<RTCSessionDescriptionInit> {
        const offer = await this.peerConnection.createOffer();

        await this.peerConnection.setLocalDescription(offer);

        return offer;
    }

    async createAnswer(): Promise<RTCSessionDescriptionInit> {
        const answer = await this.peerConnection.createAnswer();

        await this.peerConnection.setLocalDescription(answer);

        return answer;
    }

    async setRemoteDescription(
        description: RTCSessionDescriptionInit
    ) {
        await this.peerConnection.setRemoteDescription(description);
    }

    async addIceCandidate(
        candidate: RTCIceCandidateInit
    ) {
        await this.peerConnection.addIceCandidate(candidate);
    }

    createDataChannel(label: string) {
        return this.peerConnection.createDataChannel(label);
    }

    onDataChannel(callback: (event: RTCDataChannelEvent) => void) {
        this.peerConnection.ondatachannel = callback;
    }

    onIceCandidate(callback: (event: RTCPeerConnectionIceEvent) => void) {
        this.peerConnection.onicecandidate = callback;
    }

    onConnectionStateChange(callback: () => void) {
        this.peerConnection.onconnectionstatechange = callback;
    }

    get connectionState() {
        return this.peerConnection.connectionState;
    }

    get hasRemoteDescription() {
        return this.peerConnection.remoteDescription !== null;
    }

    close() {
        this.peerConnection.close();
    }
}