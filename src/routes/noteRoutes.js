import express from 'express';
import {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  shareNote,
  getSharedNotes
} from '../controllers/noteController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Note:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         category:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         owner:
 *           type: string
 *         isPinned:
 *           type: boolean
 *         color:
 *           type: string
 *         isShared:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Create a new note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               color:
 *                 type: string
 *               isPinned:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Note created successfully
 *       401:
 *         description: Not authorized
 */
router.post('/', protect, createNote);

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Get all notes for current user
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPinned
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of notes
 */
router.get('/', protect, getNotes);

/**
 * @swagger
 * /api/notes/shared:
 *   get:
 *     summary: Get notes shared with current user
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of shared notes
 */
router.get('/shared', protect, getSharedNotes);

/**
 * @swagger
 * /api/notes/{id}:
 *   get:
 *     summary: Get note by ID
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note data
 *       404:
 *         description: Note not found
 */
router.get('/:id', protect, getNoteById);

/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Update note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 */
router.put('/:id', protect, updateNote);

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note deleted successfully
 */
router.delete('/:id', protect, deleteNote);

/**
 * @swagger
 * /api/notes/{id}/share:
 *   post:
 *     summary: Share note with users
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               permission:
 *                 type: string
 *                 enum: [view, edit]
 *     responses:
 *       200:
 *         description: Note shared successfully
 */
router.post('/:id/share', protect, shareNote);

export default router;