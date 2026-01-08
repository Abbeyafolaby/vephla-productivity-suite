import Task from '../models/Task.js';
import logger from '../utils/logger.js';

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
export const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assignedTo, tags } = req.body;

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      tags,
      owner: req.user.id
    });

    logger.info(`Task created: ${task._id} by user: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    logger.error('Create task error:', error);

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
 * @desc    Get all tasks for current user
 * @route   GET /api/tasks
 * @access  Private
 */
export const getTasks = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, search, dueDate } = req.query;

    // Build filter - user sees tasks they own OR are assigned to
    const filter = {
      $or: [
        { owner: req.user.id },
        { assignedTo: req.user.id }
      ]
    };
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$text = { $search: search };
    }
    if (dueDate) {
      // Filter by specific date or range
      if (dueDate === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        filter.dueDate = { $gte: today, $lt: tomorrow };
      } else if (dueDate === 'week') {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        filter.dueDate = { $gte: today, $lte: nextWeek };
      } else if (dueDate === 'overdue') {
        filter.dueDate = { $lt: new Date() };
        filter.status = { $nin: ['completed', 'cancelled'] };
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = Task.find(filter)
      .populate('owner', 'username email profile.firstName profile.lastName')
      .populate('assignedTo', 'username email profile.firstName profile.lastName')
      .limit(parseInt(limit))
      .skip(skip);

    // Sort
    if (search) {
      query.sort({ score: { $meta: 'textScore' }, priority: 1, dueDate: 1 });
    } else {
      query.sort({ priority: 1, dueDate: 1, createdAt: -1 });
    }

    const tasks = await query;
    const total = await Task.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: tasks.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalTasks: total
      },
      data: tasks
    });
  } catch (error) {
    logger.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('owner', 'username email profile.firstName profile.lastName')
      .populate('assignedTo', 'username email profile.firstName profile.lastName');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access
    const hasAccess = task.owner.toString() === req.user.id || 
                     task.assignedTo.some(user => user._id.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Get task by ID error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
export const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can update (owner or assigned)
    const canUpdate = task.owner.toString() === req.user.id || 
                     task.assignedTo.some(user => user.toString() === req.user.id);

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const { title, description, status, priority, dueDate, assignedTo, tags } = req.body;

    // Update fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) {
      task.status = status;
      if (status === 'completed') {
        task.completedBy = req.user.id;
      }
    }
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (tags !== undefined) task.tags = tags;

    await task.save();

    task = await Task.findById(task._id)
      .populate('owner', 'username email')
      .populate('assignedTo', 'username email');

    logger.info(`Task updated: ${task._id} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    logger.error('Update task error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only owner can delete
    if (task.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only task owner can delete'
      });
    }

    await task.deleteOne();

    logger.info(`Task deleted: ${req.params.id} by user: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error('Delete task error:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update task status
 * @route   PUT /api/tasks/:id/status
 * @access  Private
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['todo', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access
    const hasAccess = task.owner.toString() === req.user.id || 
                     task.assignedTo.some(user => user.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedBy = req.user.id;
    }

    await task.save();

    logger.info(`Task status updated: ${task._id} to ${status}`);

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: task
    });
  } catch (error) {
    logger.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get task statistics
 * @route   GET /api/tasks/stats
 * @access  Private
 */
export const getTaskStats = async (req, res) => {
  try {
    const filter = {
      $or: [
        { owner: req.user.id },
        { assignedTo: req.user.id }
      ]
    };

    const total = await Task.countDocuments(filter);
    const todo = await Task.countDocuments({ ...filter, status: 'todo' });
    const inProgress = await Task.countDocuments({ ...filter, status: 'in_progress' });
    const completed = await Task.countDocuments({ ...filter, status: 'completed' });
    
    // Overdue tasks
    const overdue = await Task.countDocuments({
      ...filter,
      dueDate: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] }
    });

    // Tasks due this week
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dueThisWeek = await Task.countDocuments({
      ...filter,
      dueDate: { $gte: today, $lte: nextWeek },
      status: { $nin: ['completed', 'cancelled'] }
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        todo,
        inProgress,
        completed,
        overdue,
        dueThisWeek
      }
    });
  } catch (error) {
    logger.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};