import express from 'express';
import {
  uploadFile,
  getFiles,
  getFileById,
  downloadFile,
  deleteFile,
  updateFile,
  getFileStats
} from '../controllers/fileController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         originalName:
 *           type: string
 *         fileName:
 *           type: string
 *         mimeType:
 *           type: string
 *         size:
 *           type: number
 *         owner:
 *           type: string
 *         uploadedFor:
 *           type: string
 *           enum: [note, task, profile, general]
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               uploadedFor:
 *                 type: string
 *                 enum: [note, task, profile, general]
 *               relatedDocument:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/upload', protect, uploadSingle, handleUploadError, uploadFile);

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Get all files for current user
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: uploadedFor
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of files
 */
router.get('/', protect, getFiles);

/**
 * @swagger
 * /api/files/stats:
 *   get:
 *     summary: Get file statistics
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File statistics
 */
router.get('/stats', protect, getFileStats);

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get file by ID
 *     tags: [Files]
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
 *         description: File data
 */
router.get('/:id', protect, getFileById);

/**
 * @swagger
 * /api/files/{id}/download:
 *   get:
 *     summary: Download file
 *     tags: [Files]
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
 *         description: File download
 */
router.get('/:id/download', protect, downloadFile);

/**
 * @swagger
 * /api/files/{id}:
 *   put:
 *     summary: Update file metadata
 *     tags: [Files]
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
 *         description: File updated successfully
 */
router.put('/:id', protect, updateFile);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete file
 *     tags: [Files]
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
 *         description: File deleted successfully
 */
router.delete('/:id', protect, deleteFile);

export default router;