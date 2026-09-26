import { io, type Socket } from 'socket.io-client';
import { signalingEvents } from './signalingEvents';
import type {
    SignalingClientToServerEvents,
    SignalingServerToClientEvents,
} from './signalingTypes';

export class SignalingManager{
        private socket: Socket<SignalingServerToClientEvents, SignalingClientToServerEvents>;

        constructor(url:string){
            this.socket=io(url,{autoConnect:false}) as Socket<SignalingServerToClientEvents, SignalingClientToServerEvents>;
        }

        connect(){
            this.socket.connect();
        }
        joinRoom(roomId:string){
            this.socket.emit(signalingEvents.joinRoom,roomId);
        }
        sendOffer(target:string,offer:RTCSessionDescriptionInit){
            this.socket.emit(signalingEvents.offer,{target,offer});
        }
        sendAnswer(target:string,answer:RTCSessionDescriptionInit){
            this.socket.emit(signalingEvents.answer,{target,answer});
        }
        sendIceCandidate(target:string,candidate:RTCIceCandidateInit){
            this.socket.emit(signalingEvents.iceCandidate,{target,candidate});
        }
        on<K extends keyof SignalingServerToClientEvents>(
            event: K,
            listener: SignalingServerToClientEvents[K]
        ) {
            this.socket.on(event, listener as never);
        }
        off<K extends keyof SignalingServerToClientEvents>(
            event: K,
            listener: SignalingServerToClientEvents[K]
        ) {
            this.socket.off(event, listener as never);
        }
        onConnect(listener: () => void) {
            this.socket.on('connect', listener);
        }
        offConnect(listener: () => void) {
            this.socket.off('connect', listener);
        }
        onDisconnect(listener: (reason: string) => void) {
            this.socket.on('disconnect', listener);
        }
        offDisconnect(listener: (reason: string) => void) {
            this.socket.off('disconnect', listener);
        }
        close(){
            this.socket.close();
        }
}



