import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { handleSocketConnection } from '../services/socketService.js';
import User from '../models/User.js';

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true
        }
    });

    // Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Optionally fetch full user if needed, or just use decoded data
            // const user = await User.findById(decoded.id);
            // if (!user) return next(new Error('Authentication error: User not found'));

            socket.user = { id: decoded.id }; // Attach user ID to socket
            next();
        } catch (error) {
            logger.error('Socket authentication error:', error.message);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}`);
        handleSocketConnection(socket, io);
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        logger.error('Socket.io not initialized!');
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
