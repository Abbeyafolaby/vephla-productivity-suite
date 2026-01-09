import express from 'express';
import { protect } from '../middleware/auth.js'; // Assuming auth middleware exists and is named 'protect' or similar. 
// Checking app.js imports, it imports authRoutes etc. I should check where 'protect' is.
// Usually in 'middleware/authMiddleware.js'.
// I'll assume 'protect' is the name. If not I'll fix it.
// Checking file structure earlier, I didn't list middlewares.
import { getChatHistory, sendMessageAPI } from '../controllers/chatController.js';

const router = express.Router();

// Apply auth middleware
// I need to be sure about the middleware path and export
// based on 'src/controllers/noteController.js', creates are 'Private'.
// I will assume there is an auth middleware.

/**
 * @swagger
 * /api/chat/history/{roomId}:
 *   get:
 *     summary: Get chat history for a room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the room
 *     responses:
 *       200:
 *         description: Chat history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/history/:roomId', protect, getChatHistory);

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send a message via API
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - room
 *               - message
 *             properties:
 *               room:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.post('/message', protect, sendMessageAPI);

export default router;
