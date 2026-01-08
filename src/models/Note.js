import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a note title'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    content: {
      type: String,
      required: [true, 'Please provide note content'],
      maxlength: [10000, 'Content cannot exceed 10000 characters']
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
      default: 'General'
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    isShared: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permission: {
        type: String,
        enum: ['view', 'edit'],
        default: 'view'
      }
    }],
    isPinned: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      default: '#ffffff',
      match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color']
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
noteSchema.index({ owner: 1, createdAt: -1 });
noteSchema.index({ owner: 1, isPinned: -1, createdAt: -1 });
noteSchema.index({ tags: 1 });
noteSchema.index({ category: 1 });

// Text index for search
noteSchema.index({ title: 'text', content: 'text' });

// Virtual for shared count
noteSchema.virtual('sharedCount').get(function() {
  return this.sharedWith.length;
});

// Ensure virtuals are included in JSON
noteSchema.set('toJSON', { virtuals: true });
noteSchema.set('toObject', { virtuals: true });

const Note = mongoose.model('Note', noteSchema);

export default Note;