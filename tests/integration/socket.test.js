import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import { initSocket } from '../../src/config/socket.js';
import { handleSocketConnection } from '../../src/services/socketService.js';

describe('Socket.io Service', () => {
    let io, serverSocket, clientSocket;
    let httpServer;
    const port = 5001;

    beforeAll((done) => {
        httpServer = createServer();
        io = initSocket(httpServer);
        httpServer.listen(port, () => {
            clientSocket = new Client(`http://localhost:${port}`);
            io.on('connection', (socket) => {
                serverSocket = socket;
            });
            clientSocket.on('connect', done);
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.close();
        httpServer.close();
    });

    test('should establish connection', (done) => {
        expect(clientSocket.connected).toBe(true);
        done();
    });

    test('should join room', (done) => {
        clientSocket.emit('join_room', 'test_room');

        // Give time for server to process
        setTimeout(() => {
            const rooms = io.sockets.adapter.rooms;
            expect(rooms.get('test_room')).toBeDefined();
            expect(rooms.get('test_room').has(serverSocket.id)).toBe(true);
            done();
        }, 100);
    });

    test('should send and receive messages', (done) => {
        const testMessage = {
            room: 'chat_room',
            message: 'Hello World',
            senderId: 'user1',
            senderName: 'User One'
        };

        // Client joins room
        clientSocket.emit('join_room', 'chat_room');

        // Setup listener for received message
        clientSocket.on('receive_message', (data) => {
            expect(data.message).toBe(testMessage.message);
            expect(data.senderName).toBe(testMessage.senderName);
            expect(data.timestamp).toBeDefined();
            done();
        });

        // Send message (need another client or server to emit to room)
        // Here we simulate another client sending via server event or just self-sending if implementation allows
        // Our implementation broadcasts to room.

        setTimeout(() => {
            clientSocket.emit('send_message', testMessage);
        }, 50);
    });

    test('should receive notifications', (done) => {
        // Identify user
        const userId = 'user_123';
        clientSocket.emit('identify', userId);

        clientSocket.on('notification', (data) => {
            expect(data.type).toBe('TEST_NOTIF');
            done();
        });

        setTimeout(() => {
            // Simulate server sending notification
            io.to(`user:${userId}`).emit('notification', {
                type: 'TEST_NOTIF',
                message: 'Test notification'
            });
        }, 100);
    });
});
