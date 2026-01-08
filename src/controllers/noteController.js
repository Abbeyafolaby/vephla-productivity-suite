import Note from '../models/Note.js';
import logger from '../utils/logger.js';

/**
 * @desc    Create a new note
 * @route   POST /api/notes
 * @access  Private
 */
export const createNote = async (req, res) => {
  try {
    const { title, content, category, tags, color, isPinned } = req.body;

    const note = await Note.create({
      title,
      content,
      category,
      tags,
      color,
      isPinned,
      owner: req.user.id
    });

    logger.info(`Note created: ${note._id} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: note
    });
  } catch (error) {
    logger.error('Create note error:', error);

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
 * @desc    Get all notes for current user
 * @route   GET /api/notes
 * @access  Private
 */
export const getNotes = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, tags, search, isPinned } = req.query;

    // Build filter
    const filter = { owner: req.user.id };
    
    if (category) filter.category = category;
    if (isPinned !== undefined) filter.isPinned = isPinned === 'true';
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim().toLowerCase());
      filter.tags = { $in: tagArray };
    }
    if (search) {
      filter.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = Note.find(filter)
      .limit(parseInt(limit))
      .skip(skip);

    // Sort: pinned first, then by creation date
    if (search) {
      query.sort({ score: { $meta: 'textScore' }, isPinned: -1, createdAt: -1 });
    } else {
      query.sort({ isPinned: -1, createdAt: -1 });
    }

    const notes = await query;
    const total = await Note.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: notes.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalNotes: total
      },
      data: notes
    });
  } catch (error) {
    logger.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get single note by ID
 * @route   GET /api/notes/:id
 * @access  Private
 */
export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check ownership or shared access
    const hasAccess = note.owner.toString() === req.user.id || 
                     note.sharedWith.some(share => share.user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this note'
      });
    }

    res.status(200).json({
      success: true,
      data: note
    });
  } catch (error) {
    logger.error('Get note by ID error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update note
 * @route   PUT /api/notes/:id
 * @access  Private
 */
export const updateNote = async (req, res) => {
  try {
    let note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check ownership or edit permission
    const isOwner = note.owner.toString() === req.user.id;
    const hasEditPermission = note.sharedWith.some(
      share => share.user.toString() === req.user.id && share.permission === 'edit'
    );

    if (!isOwner && !hasEditPermission) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this note'
      });
    }

    const { title, content, category, tags, color, isPinned } = req.body;

    // Update fields
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (category !== undefined) note.category = category;
    if (tags !== undefined) note.tags = tags;
    if (color !== undefined) note.color = color;
    if (isPinned !== undefined) note.isPinned = isPinned;

    await note.save();

    logger.info(`Note updated: ${note._id} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      data: note
    });
  } catch (error) {
    logger.error('Update note error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Delete note
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Only owner can delete
    if (note.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this note'
      });
    }

    await note.deleteOne();

    logger.info(`Note deleted: ${req.params.id} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    logger.error('Delete note error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Share note with users
 * @route   POST /api/notes/:id/share
 * @access  Private
 */
export const shareNote = async (req, res) => {
  try {
    const { userIds, permission = 'view' } = req.body;

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Only owner can share
    if (note.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only note owner can share'
      });
    }

    // Add users to sharedWith
    userIds.forEach(userId => {
      const alreadyShared = note.sharedWith.some(
        share => share.user.toString() === userId
      );
      
      if (!alreadyShared) {
        note.sharedWith.push({ user: userId, permission });
      }
    });

    note.isShared = note.sharedWith.length > 0;
    await note.save();

    logger.info(`Note shared: ${note._id} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Note shared successfully',
      data: note
    });
  } catch (error) {
    logger.error('Share note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get shared notes
 * @route   GET /api/notes/shared
 * @access  Private
 */
export const getSharedNotes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const filter = {
      'sharedWith.user': req.user.id
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notes = await Note.find(filter)
      .populate('owner', 'username email profile.firstName profile.lastName')
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Note.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: notes.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalNotes: total
      },
      data: notes
    });
  } catch (error) {
    logger.error('Get shared notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};