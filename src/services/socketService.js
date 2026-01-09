import logger from '../utils/logger.js';

// Store active users: userId -> [socketId]
const activeUsers = new Map();

/**
 * Handle new socket connection
 * @param {import('socket.io').Socket} socket 
 * @param {import('socket.io').Server} io 
 */
export const handleSocketConnection = (socket, io) => {

    // -- Events --
    const userId = socket.user.id;
    logger.info(`User authenticated: ${userId} with socket ${socket.id}`);

    // Add to active users
    if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socket.id);

    // Join a room specific to this user for private notifications
    socket.join(`user:${userId}`);

    // Broadcast active status (optional)
    io.emit('user_status', { userId, status: 'online' });

    // Join Room
    socket.on('join_room', (room) => {
        socket.join(room);
        logger.info(`Socket ${socket.id} joined room ${room}`);
    });

    // Leave Room
    socket.on('leave_room', (room) => {
        socket.leave(room);
        logger.info(`Socket ${socket.id} left room ${room}`);
    });

    // Chat Message
    socket.on('send_message', (data) => {
        const { room, message, senderId, senderName } = data;

        // Broadcast to room (excluding sender if needed, but usually include for confirm)
        io.to(room).emit('receive_message', {
            room,
            message,
            senderId,
            senderName,
            timestamp: new Date()
        });
    });

    // Typing Indicator
    socket.on('typing', (data) => {
        const { room, user } = data;
        socket.to(room).emit('user_typing', { room, user });
    });

    socket.on('stop_typing', (data) => {
        const { room, user } = data;
        socket.to(room).emit('user_stop_typing', { room, user });
    });

    // Disconnect
    socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);

        // Remove from active users
        for (const [userId, sockets] of activeUsers.entries()) {
            if (sockets.has(socket.id)) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    activeUsers.delete(userId);
                    io.emit('user_status', { userId, status: 'offline' });
                }
                break;
            }
        }
    });
};

/**
 * Send notification to a specific user
 * @param {import('socket.io').Server} io 
 * @param {string} userId 
 * @param {object} notification 
 */
export const notifyUser = (io, userId, notification) => {
    if (!io) return;
    io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * Send notification to a room (e.g. shared document or project)
 * @param {import('socket.io').Server} io 
 * @param {string} roomId 
 * @param {object} notification 
 */
export const notifyRoom = (io, roomId, notification) => {
    if (!io) return;
    io.to(roomId).emit('notification', notification);
};
