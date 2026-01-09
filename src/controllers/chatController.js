import logger from '../utils/logger.js';
import { getIO } from '../config/socket.js';
import { notifyRoom } from '../services/socketService.js';

/**
 * @desc    Get chat history for a room
 * @route   GET /api/chat/history/:roomId
 * @access  Private
 */
export const getChatHistory = async (req, res) => {
    try {
        const { roomId } = req.params;
        // In a real app, we would fetch from DB
        // For now, return mock empty history or implement if Message model exists

        res.status(200).json({
            success: true,
            data: []
        });
    } catch (error) {
        logger.error('Get chat history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * @desc    Send a message via API (Alternative to socket emit)
 * @route   POST /api/chat/message
 * @access  Private
 */
export const sendMessageAPI = async (req, res) => {
    try {
        const { room, message } = req.body;

        if (!room || !message) {
            return res.status(400).json({
                success: false,
                message: 'Room and message are required'
            });
        }

        const io = getIO();

        // Broadcast to room
        io.to(room).emit('receive_message', {
            room,
            message,
            senderId: req.user.id,
            senderName: req.user.username || req.user.email,
            timestamp: new Date()
        });

        res.status(200).json({
            success: true,
            message: 'Message sent'
        });
    } catch (error) {
        logger.error('Send message API error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
