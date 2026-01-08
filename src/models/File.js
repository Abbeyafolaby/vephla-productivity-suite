import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    fileName: {
      type: String,
      required: [true, 'Filename is required'],
      unique: true
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required']
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      max: [10485760, 'File size cannot exceed 10MB'] // 10MB
    },
    path: {
      type: String,
      required: true
    },
    cloudinaryUrl: {
      type: String
    },
    cloudinaryPublicId: {
      type: String,
      unique: true,
      sparse: true // Allows null values while maintaining uniqueness
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    uploadedFor: {
      type: String,
      enum: ['note', 'task', 'profile', 'general'],
      default: 'general',
      index: true
    },
    relatedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'uploadedFor'
    },
    isPublic: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
fileSchema.index({ owner: 1, uploadedFor: 1 });
fileSchema.index({ owner: 1, createdAt: -1 });

// Virtual for file URL
fileSchema.virtual('url').get(function() {
  return this.cloudinaryUrl || `/uploads/${this.fileName}`;
});

// Virtual for size in KB/MB
fileSchema.virtual('sizeFormatted').get(function() {
  if (this.size < 1024) return `${this.size} B`;
  if (this.size < 1048576) return `${(this.size / 1024).toFixed(2)} KB`;
  return `${(this.size / 1048576).toFixed(2)} MB`;
});

// Ensure virtuals are included
fileSchema.set('toJSON', { virtuals: true });
fileSchema.set('toObject', { virtuals: true });

const File = mongoose.model('File', fileSchema);

export default File;