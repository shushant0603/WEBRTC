export const signalingEvents = {
	joinRoom: 'join-room',
	userJoined: 'user-joined',
	roomPeers: 'room-peers',
	offer: 'offer',
	answer: 'answer',
	iceCandidate: 'ice-candidate',
	peerLeft: 'peer-left',
} as const;
