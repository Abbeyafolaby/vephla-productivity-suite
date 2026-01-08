import File from '../models/File.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * @desc    Upload a file
 * @route   POST /api/files/upload
 * @access  Private
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const { uploadedFor, relatedDocument } = req.body;

    const file = await File.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      owner: req.user.id,
      uploadedFor: uploadedFor || 'general',
      relatedDocument: relatedDocument || null
    });

    logger.info(`File uploaded: ${file._id} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: file
    });
  } catch (error) {
    // Delete uploaded file if database operation fails
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    logger.error('Upload file error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get all files for current user
 * @route   GET /api/files
 * @access  Private
 */
export const getFiles = async (req, res) => {
  try {
    const { page = 1, limit = 20, uploadedFor } = req.query;

    // Build filter
    const filter = { owner: req.user.id };
    
    if (uploadedFor) filter.uploadedFor = uploadedFor;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const files = await File.find(filter)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await File.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: files.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalFiles: total
      },
      data: files
    });
  } catch (error) {
    logger.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get single file by ID
 * @route   GET /api/files/:id
 * @access  Private
 */
export const getFileById = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership or public access
    if (file.owner.toString() !== req.user.id && !file.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this file'
      });
    }

    res.status(200).json({
      success: true,
      data: file
    });
  } catch (error) {
    logger.error('Get file by ID error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Download file
 * @route   GET /api/files/:id/download
 * @access  Private
 */
export const downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership or public access
    if (file.owner.toString() !== req.user.id && !file.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this file'
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    logger.info(`File downloaded: ${file._id} by user: ${req.user.email}`);

    // Send file
    res.download(file.path, file.originalName, (err) => {
      if (err) {
        logger.error('File download error:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading file'
          });
        }
      }
    });
  } catch (error) {
    logger.error('Download file error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Delete file
 * @route   DELETE /api/files/:id
 * @access  Private
 */
export const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this file'
      });
    }

    // Delete file from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Delete from database
    await file.deleteOne();

    logger.info(`File deleted: ${req.params.id} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Delete file error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update file metadata
 * @route   PUT /api/files/:id
 * @access  Private
 */
export const updateFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check ownership
    if (file.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this file'
      });
    }

    const { isPublic, uploadedFor, relatedDocument } = req.body;

    if (isPublic !== undefined) file.isPublic = isPublic;
    if (uploadedFor) file.uploadedFor = uploadedFor;
    if (relatedDocument) file.relatedDocument = relatedDocument;

    await file.save();

    logger.info(`File updated: ${file._id} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'File updated successfully',
      data: file
    });
  } catch (error) {
    logger.error('Update file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get file statistics
 * @route   GET /api/files/stats
 * @access  Private
 */
export const getFileStats = async (req, res) => {
  try {
    const filter = { owner: req.user.id };

    const totalFiles = await File.countDocuments(filter);
    
    // Total storage used
    const files = await File.find(filter).select('size');
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    // Files by type
    const filesByType = await File.aggregate([
      { $match: filter },
      { $group: { _id: '$uploadedFor', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalFiles,
        totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        filesByType: filesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Get file stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}