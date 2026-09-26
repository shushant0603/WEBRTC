#include <iostream>
#include <string>
#include <vector>

using namespace std;


// ==========================================
// 1. SignalingClient
// ==========================================

class SignalingClient {

private:
    string socket;

public:
    SignalingClient(string url) {
        socket = url;
    }

    void connect() {
        cout << "Signaling connected\n";
    }

    void joinRoom(string roomId) {
        cout << "Joined room: " << roomId << "\n";
    }

    void sendOffer(string target, string offer) {
        cout << "Sending offer to: " << target << "\n";
    }

    void sendAnswer(string target, string answer) {
        cout << "Sending answer to: " << target << "\n";
    }

    void sendIceCandidate(string target, string candidate) {
        cout << "Sending ICE candidate to: " << target << "\n";
    }
};


// ==========================================
// 2. PeerConnectionManager
// ==========================================

class PeerConnectionManager {

public:

    PeerConnectionManager() {
        cout << "PeerConnection created\n";
    }

    string createOffer() {
        return "Offer";
    }

    string createAnswer() {
        return "Answer";
    }

    void setRemoteDescription(string description) {
        cout << "Remote description set\n";
    }

    void close() {
        cout << "Peer connection closed\n";
    }
};


// ==========================================
// 3. IceCandidateManager
// ==========================================

class IceCandidateManager {

private:
    vector<string> candidates;

public:

    void addCandidate(string candidate) {
        candidates.push_back(candidate);
    }

    void sendCandidate(string target, string candidate) {
        cout << "Sending ICE candidate to: "
             << target << "\n";
    }

    void handleCandidate(string candidate) {
        cout << "Handling ICE candidate\n";
    }
};


// ==========================================
// 4. DataChannelManager
// ==========================================

class DataChannelManager {

public:

    void create() {
        cout << "Data channel created\n";
    }

    void send(string data) {
        cout << "Sending data: " << data << "\n";
    }

    void receive(string data) {
        cout << "Received data: " << data << "\n";
    }

    void close() {
        cout << "Data channel closed\n";
    }
};


// ==========================================
// MAIN
// ==========================================

int main() {

    // ======================================
    // USER A
    // ======================================

    cout << "\n--- USER A ---\n";

    SignalingClient userA_signaling("server-url");

    PeerConnectionManager userA_peer;

    IceCandidateManager userA_ice;

    DataChannelManager userA_data;


    // ======================================
    // USER B
    // ======================================

    cout << "\n--- USER B ---\n";

    SignalingClient userB_signaling("server-url");

    PeerConnectionManager userB_peer;

    IceCandidateManager userB_ice;

    DataChannelManager userB_data;


    // ======================================
    // USER A ACTIONS
    // ======================================

    userA_signaling.connect();
    userA_signaling.joinRoom("room123");


    // ======================================
    // USER B ACTIONS
    // ======================================

    userB_signaling.connect();
    userB_signaling.joinRoom("room123");


    // ======================================
    // USER A creates offer
    // ======================================

    string offer = userA_peer.createOffer();

    userA_signaling.sendOffer(
        "UserB",
        offer
    );


    // ======================================
    // USER B creates answer
    // ======================================

    string answer = userB_peer.createAnswer();

    userB_signaling.sendAnswer(
        "UserA",
        answer
    );


    // ======================================
    // DATA CHANNEL
    // ======================================

    userA_data.create();

    userA_data.send("Hello User B");


    return 0;
}