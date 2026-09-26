export type UserJoinedEvent = {
	userId: string;
};

export type RoomPeersEvent = {
	peerIds: string[];
};

export type OfferEvent = {
	offer: RTCSessionDescriptionInit;
	from: string;
};

export type AnswerEvent = {
	answer: RTCSessionDescriptionInit;
	from: string;
};

export type IceCandidateEvent = {
	candidate: RTCIceCandidateInit;
	from: string;
};

export type SignalingClientToServerEvents = {
	'join-room': (roomId: string) => void;
	offer: (payload: { target: string; offer: RTCSessionDescriptionInit }) => void;
	answer: (payload: { target: string; answer: RTCSessionDescriptionInit }) => void;
	'ice-candidate': (payload: { target: string; candidate: RTCIceCandidateInit }) => void;
};

export type SignalingServerToClientEvents = {
	'user-joined': (payload: UserJoinedEvent) => void;
	offer: (payload: OfferEvent) => void;
	answer: (payload: AnswerEvent) => void;
	'ice-candidate': (payload: IceCandidateEvent) => void;
	'room-peers': (payload: RoomPeersEvent) => void;
	'peer-left': (payload: { userId: string }) => void;
};
