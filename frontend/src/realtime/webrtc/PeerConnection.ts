export class PeerConnectionManager {
  private peer: RTCPeerConnection;

  constructor() {
    this.peer = new RTCPeerConnection();
  }

  get connection() {
    return this.peer;
  }

  async createOffer() {
    const offer = await this.peer.createOffer();

    await this.peer.setLocalDescription(offer);

    return this.peer.localDescription;
  }

  async createAnswer() {
    const answer = await this.peer.createAnswer();

    await this.peer.setLocalDescription(answer);

    return this.peer.localDescription;
  }

  async setRemoteDescription(
    description: RTCSessionDescriptionInit
  ) {
    await this.peer.setRemoteDescription(description);
  }

  async addIceCandidate(
    candidate: RTCIceCandidateInit
  ) {
    await this.peer.addIceCandidate(candidate);
  }

  close() {
    this.peer.close();
  }
}