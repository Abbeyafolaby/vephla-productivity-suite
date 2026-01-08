import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['todo', 'in_progress', 'completed', 'cancelled'],
        message: 'Status must be one of: todo, in_progress, completed, cancelled'
      },
      default: 'todo',
      index: true
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Priority must be one of: low, medium, high, urgent'
      },
      default: 'medium',
      index: true
    },
    dueDate: {
      type: Date,
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assignedTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    }],
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    attachments: [{
      file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    completedAt: {
      type: Date
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
taskSchema.index({ owner: 1, status: 1, priority: 1 });
taskSchema.index({ owner: 1, dueDate: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ status: 1, dueDate: 1 });

// Text index for search
taskSchema.index({ title: 'text', description: 'text' });

// Virtual for checking if overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return this.dueDate < new Date();
});

// Virtual for days until due
taskSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const diff = this.dueDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Pre-save hook to set completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Ensure virtuals are included
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

const Task = mongoose.model('Task', taskSchema);

export default Task;