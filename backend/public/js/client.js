const socket = io();

const roomId = "abc123";

socket.emit("join-room", roomId);


// =====================================================
// 1. PEER DISCOVERY
// =====================================================

let otherPeerId = null;

socket.on("user-joined", ({ userId }) => {

    console.log("👤 User joined:", userId);

    otherPeerId = userId;

    console.log("Other peer ID:", otherPeerId);
});


// =====================================================
// 2. WEBRTC PEER CONNECTION
// =====================================================

const pc = new RTCPeerConnection();


// =====================================================
// 3. CONNECTION STATE
// =====================================================

pc.onconnectionstatechange = () => {

    console.log(
        "🔗 Connection state:",
        pc.connectionState
    );

};


// =====================================================
// 4. ICE CONNECTION STATE
// =====================================================

pc.oniceconnectionstatechange = () => {

    console.log(
        "🧊 ICE state:",
        pc.iceConnectionState
    );

};


// =====================================================
// 5. DATA CHANNEL
// =====================================================

let dataChannel = null;


// =====================================================
// MESSAGE UI ELEMENTS
// =====================================================

const messageInput =
    document.getElementById("messageInput");

const sendMessageButton =
    document.getElementById("sendMessage");

const messagesContainer =
    document.getElementById("messages");


// =====================================================
// DISPLAY MESSAGE
// =====================================================

function displayMessage(message, sender) {

    const messageElement =
        document.createElement("p");

    messageElement.textContent =
        `${sender}: ${message}`;

    messagesContainer.appendChild(
        messageElement
    );

}


// -----------------------------------------------------
// A creates DataChannel
// -----------------------------------------------------

function createDataChannel() {

    dataChannel =
        pc.createDataChannel("collaboration");

    console.log(
        "📡 DataChannel created:",
        dataChannel.label
    );


    // DataChannel opened
    dataChannel.onopen = () => {

        console.log(
            "🟢 DataChannel OPEN"
        );

    };


    // DataChannel closed
    dataChannel.onclose = () => {

        console.log(
            "🔴 DataChannel CLOSED"
        );

    };


    // DataChannel error
    dataChannel.onerror = (error) => {

        console.error(
            "❌ DataChannel error:",
            error
        );

    };


    // Message received
    dataChannel.onmessage = (event) => {

        console.log(
            "📩 Message received:",
            event.data
        );

        displayMessage(
            event.data,
            "Peer"
        );

    };
}


// -----------------------------------------------------
// B receives DataChannel
// -----------------------------------------------------

pc.ondatachannel = (event) => {

    console.log(
        "📡 DataChannel received"
    );

    dataChannel = event.channel;


    dataChannel.onopen = () => {

        console.log(
            "🟢 DataChannel OPEN on B"
        );

    };


    dataChannel.onclose = () => {

        console.log(
            "🔴 DataChannel CLOSED"
        );

    };


    dataChannel.onerror = (error) => {

        console.error(
            "❌ DataChannel error:",
            error
        );

    };


    dataChannel.onmessage = (event) => {

        console.log(
            "📩 Message received:",
            event.data
        );

        displayMessage(
            event.data,
            "Peer"
        );

    };

};


// =====================================================
// 6. ICE CANDIDATE
// =====================================================

pc.onicecandidate = (event) => {

    if (!event.candidate) {
        return;
    }

    console.log(
        "🧊 New ICE candidate"
    );


    socket.emit("ice-candidate", {

        candidate: event.candidate,

        target: otherPeerId

    });

};


// =====================================================
// 7. RECEIVE ICE CANDIDATE
// =====================================================

socket.on(
    "ice-candidate",
    async ({ candidate, from }) => {

        console.log(
            "🧊 ICE candidate received from:",
            from
        );

        try {

            await pc.addIceCandidate(
                candidate
            );

            console.log(
                "✅ ICE candidate added"
            );

        } catch (error) {

            console.error(
                "❌ Failed to add ICE candidate:",
                error
            );

        }

    }
);


// =====================================================
// 8. CREATE OFFER
// =====================================================

const createOffer = async () => {

    if (!otherPeerId) {

        console.log(
            "❌ No other peer connected"
        );

        return;
    }


    // Create DataChannel BEFORE createOffer()
    createDataChannel();


    console.log(
        "📡 Creating WebRTC offer..."
    );


    const offer =
        await pc.createOffer();


    await pc.setLocalDescription(
        offer
    );


    console.log(
        "📤 Offer created"
    );


    socket.emit("offer", {

        offer: pc.localDescription,

        target: otherPeerId

    });


    console.log(
        "📤 Offer sent to:",
        otherPeerId
    );

};


// =====================================================
// 9. RECEIVE OFFER
// =====================================================

socket.on(
    "offer",
    async ({ offer, from }) => {

        console.log(
            "📥 Offer received from:",
            from
        );


        // Set A's offer
        await pc.setRemoteDescription(
            offer
        );


        console.log(
            "✅ Remote offer set"
        );


        // Create answer
        const answer =
            await pc.createAnswer();


        // Set answer locally
        await pc.setLocalDescription(
            answer
        );


        console.log(
            "📤 Answer created"
        );


        // Send answer back to A
        socket.emit("answer", {

            answer: pc.localDescription,

            target: from

        });


        console.log(
            "📤 Answer sent to:",
            from
        );

    }
);


// =====================================================
// 10. RECEIVE ANSWER
// =====================================================

socket.on(
    "answer",
    async ({ answer, from }) => {

        console.log(
            "📥 Answer received from:",
            from
        );


        await pc.setRemoteDescription(
            answer
        );


        console.log(
            "✅ Remote answer set"
        );

    }
);


// =====================================================
// 11. SEND MESSAGE THROUGH DATACHANNEL
// =====================================================

function sendMessage(message) {

    if (!dataChannel) {

        console.log(
            "❌ DataChannel does not exist"
        );

        return;
    }


    if (dataChannel.readyState !== "open") {

        console.log(
            "❌ DataChannel is not open"
        );

        console.log(
            "Current state:",
            dataChannel.readyState
        );

        return;
    }


    // Send through WebRTC
    dataChannel.send(message);


    console.log(
        "📤 Message sent:",
        message
    );


    // Show our own message
    displayMessage(
        message,
        "You"
    );

}


// =====================================================
// 12. SEND BUTTON
// =====================================================

sendMessageButton.addEventListener(
    "click",
    () => {

        const message =
            messageInput.value.trim();


        if (!message) {
            return;
        }


        sendMessage(message);


        // Clear input
        messageInput.value = "";


        // Focus input again
        messageInput.focus();

    }
);


// =====================================================
// 13. ENTER KEY TO SEND
// =====================================================

messageInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            sendMessageButton.click();

        }

    }
);


// =====================================================
// 14. CREATE OFFER BUTTON
// =====================================================

document
    .getElementById("createOffer")
    .addEventListener(
        "click",
        createOffer
    );