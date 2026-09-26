import {io,type Socket} from 'socket.io-client';

export class SignalingClient{
  private socket : Socket;


  constructor(url : string){
    this.socket = io(url,{autoConnect:false}) as Socket;
  }

  connect(){
    this.socket.connect();
  }
  joinRoom(roomId : string){
    this.socket.emit('join-room',roomId);
  }
  sendOffer(){

  }
  sendAnswer(){

  }
  sendIcecandidate(){

  }


}