export class ICEManager {

    private candidates: RTCIceCandidateInit[] = [];

    addCandidate(candidate: RTCIceCandidateInit) {
        this.candidates.push(candidate);
    }

    async flushCandidates(
        addCandidate: (candidate: RTCIceCandidateInit) => Promise<void>
    ) {
        for (const candidate of this.candidates) {
            await addCandidate(candidate);
        }
        this.clearCandidates();
    }

    clearCandidates() {
        this.candidates = [];
    }
}