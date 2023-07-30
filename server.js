const http = require("http");
const express = require("express");
const io = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const wsServer = io(httpServer, {
    cors: {
        origin: ["https://admin.socket.io", "http://localhost:3000"],
        credentials: true,
    },
});

const users = {};
const socketRooms = {};
const maximum = 4;

wsServer.on("connection", (socket) => {
    socket.on("join_room", ({ room, nickname }) => {
        if (users[room]) {
            if (users[room].length === maximum) {
                socket.to(socket.id).emit("room_full");
                return;
            }
            users[room].push({ id: socket.id, nickname });
        } else {
            users[room] = [{ id: socket.id, nickname }];
        }
        socketRooms[socket.id] = room;
        socket.join(room);
        const usersInRoom = users[room].filter((user) => user.id !== socket.id);
        wsServer.sockets.to(socket.id).emit("all_users", usersInRoom);
        // socket.to(socket.id).emit("all_users", usersInRoom);
    });

    socket.on("offer", ({ offer, offerSendId, offerSendNickname, offerReceiveId }) => {
        socket.to(offerReceiveId).emit("getOffer", { offer, offerSendId, offerSendNickname });
    });
    socket.on("answer", ({ answer, answerSendId, answerReceiveId }) => {
        socket.to(answerReceiveId).emit("getAnswer", { answer, answerSendId });
    });
    socket.on("iceCandidate", ({ candidate, candidateSendId, candidateReceiveId }) => {
        socket.to(candidateReceiveId).emit("getIceCandidate", { candidate, candidateSendId });
    });
    socket.on("disconnect", () => {
        const roomId = socketRooms[socket.id];
        let room = users[roomId];
        if (room) {
            room = room?.filter((user) => user.id !== socket.id);
            users[roomId] = room;
            if (room.length === 0) {
                delete users[roomId];
                return;
            }
            socket.to(roomId).emit("exit_user", socket.id);
        }
    });
});

httpServer.listen(8080, () => {
    console.log(`connect server port:8080`);
});
