import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
    origin: frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: frontendUrl,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/public', express.static(path.join(__dirname, 'public')));
io.on('connection', (socket) => {

    console.log(
        "User connected:",
        socket.id
    );


    // =================================================
    // JOIN ROOM
    // =================================================

    socket.on('join-room', (roomId) => {
        if (typeof roomId !== 'string' || !roomId.trim()) {
            return;
        }

        console.log(
            socket.id,
            "joined",
            roomId
        );


        socket.data.roomId = roomId;
        socket.join(roomId);


        // Tell existing users that a new user joined
        socket.to(roomId).emit(
            "user-joined",
            {
                userId: socket.id
            }
        );

    });


    // =================================================
    // OFFER
    // =================================================

    socket.on(
        'offer',
        ({ offer, target }) => {
            if (!target || !offer) return;

            console.log(
                "📨 Offer received from:",
                socket.id
            );

            console.log(
                "🎯 Sending offer to:",
                target
            );


            io.to(target).emit(
                'offer',
                {
                    offer,
                    from: socket.id
                }
            );

        }
    );


    // =================================================
    // ANSWER
    // =================================================

    socket.on(
        'answer',
        ({ answer, target }) => {
            if (!target || !answer) return;

            console.log(
                "📨 Answer received from:",
                socket.id
            );

            console.log(
                "🎯 Sending answer to:",
                target
            );


            io.to(target).emit(
                'answer',
                {
                    answer,
                    from: socket.id
                }
            );

        }
    );


    // =================================================
    // ICE CANDIDATE
    // =================================================

    socket.on(
        'ice-candidate',
        ({ candidate, target }) => {
            if (!target || !candidate) return;

            console.log(
                "🧊 ICE candidate received from:",
                socket.id
            );

            console.log(
                "🎯 Sending ICE candidate to:",
                target
            );


            io.to(target).emit(
                'ice-candidate',
                {
                    candidate,
                    from: socket.id
                }
            );

        }
    );


    // =================================================
    // DISCONNECT
    // =================================================

    socket.on('disconnect', () => {

        if (socket.data.roomId) {
            socket.to(socket.data.roomId).emit('peer-left');
        }

        console.log(
            "User disconnected:",
            socket.id
        );

    });

});
app.get('/', (request, response) => {
  response.render('index', {
    title: 'WebRTC Backend',
    message: 'Express and EJS are ready.'
  });
});
app.get('/user', (req,res) => {
    res.send(
        "shushant"
    );
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
