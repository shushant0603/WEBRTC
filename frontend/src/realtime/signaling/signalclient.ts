import { io, type Socket } from 'socket.io-client';
import { signalingEvents } from './signalingEvents';
import type {
  SignalingClientToServerEvents,
  SignalingServerToClientEvents,
} from './signalingTypes';

export class SignalingClient {
  private readonly socket: Socket<
    SignalingServerToClientEvents,
    SignalingClientToServerEvents
  >;

  constructor(url: string) {
    this.socket = io(url, { autoConnect: false }) as Socket<
      SignalingServerToClientEvents,
      SignalingClientToServerEvents
    >;
  }

  connect() {
    this.socket.connect();
  }

  joinRoom(roomId: string) {
    this.socket.emit(signalingEvents.joinRoom, roomId);
  }

  sendOffer(target: string, offer: RTCSessionDescriptionInit) {
    this.socket.emit(signalingEvents.offer, {
      target,
      offer,
    });
  }

  sendAnswer(target: string, answer: RTCSessionDescriptionInit) {
    this.socket.emit(signalingEvents.answer, {
      target,
      answer,
    });
  }

  sendIceCandidate(
    target: string,
    candidate: RTCIceCandidateInit
  ) {
    this.socket.emit(signalingEvents.iceCandidate, {
      target,
      candidate,
    });
  }

  on(event: 'connect', listener: () => void): void;
  on(event: 'disconnect', listener: (reason: string) => void): void;
  on<K extends keyof SignalingServerToClientEvents>(
    event: K,
    listener: SignalingServerToClientEvents[K]
  ): void;
  on(
    event: string,
    listener: (...args: never[]) => void
  ) {
    this.socket.on(event as never, listener as never);
  }

  off(event: 'connect', listener: () => void): void;
  off(event: 'disconnect', listener: (reason: string) => void): void;
  off<K extends keyof SignalingServerToClientEvents>(
    event: K,
    listener: SignalingServerToClientEvents[K]
  ): void;
  off(
    event: string,
    listener: (...args: never[]) => void
  ) {
    this.socket.off(event as never, listener as never);
  }

  disconnect() {
    this.socket.disconnect();
  }
}