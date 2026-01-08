import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import File from '../../src/models/File.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let token, userId, fileId;
const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
const testPdfPath = path.join(__dirname, '../fixtures/test-document.pdf');

// Create test fixtures directory and files
beforeAll(async () => {
  const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/vephla-test';
  await mongoose.connect(testDbUri);

  // Create fixtures directory
  const fixturesDir = path.join(__dirname, '../fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // Create a test image (1x1 pixel PNG)
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync(testFilePath, pngBuffer);

  // Create a test PDF
  const pdfBuffer = Buffer.from('%PDF-1.4\n%Test PDF\n%%EOF');
  fs.writeFileSync(testPdfPath, pdfBuffer);
});

beforeEach(async () => {
  await User.deleteMany({});
  await File.deleteMany({});

  // Clean uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    files.forEach(file => {
      fs.unlinkSync(path.join(uploadsDir, file));
    });
  }

  const response = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });

  token = response.body.data.accessToken;
  userId = response.body.data.user._id;
});

afterAll(async () => {
  // Clean up test files
  if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
  
  await mongoose.connection.close();
});

describe('File Upload Tests', () => {
  describe('POST /api/files/upload', () => {
    it('should upload an image file', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath)
        .field('uploadedFor', 'general')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('File uploaded successfully');
      expect(response.body.data).toHaveProperty('originalName');
      expect(response.body.data).toHaveProperty('fileName');
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data.owner).toBe(userId);
      
      fileId = response.body.data._id;

      // Verify file exists on disk
      expect(fs.existsSync(response.body.data.path)).toBe(true);
    });

    it('should upload PDF file', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testPdfPath)
        .expect(201);

      expect(response.body.data.mimeType).toBe('application/pdf');
    });

    it('should upload with uploadedFor field', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath)
        .field('uploadedFor', 'profile')
        .expect(201);

      expect(response.body.data.uploadedFor).toBe('profile');
    });

    it('should fail without file', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Please upload a file');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', testFilePath)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid file types', async () => {
      // Create a fake executable file
      const exePath = path.join(__dirname, '../fixtures/test.exe');
      fs.writeFileSync(exePath, 'fake exe content');

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', exePath)
        .expect(400);

      expect(response.body.message).toContain('not allowed');

      // Clean up
      fs.unlinkSync(exePath);
    });

    it('should create file record in database', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath)
        .expect(201);

      const file = await File.findById(response.body.data._id);
      expect(file).not.toBeNull();
      expect(file.originalName).toBe('test-image.jpg');
    });
  });

  describe('GET /api/files', () => {
    beforeEach(async () => {
      // Upload multiple files
      await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath)
        .field('uploadedFor', 'profile');

      await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testPdfPath)
        .field('uploadedFor', 'general');
    });

    it('should get all user files', async () => {
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by uploadedFor', async () => {
      const response = await request(app)
        .get('/api/files?uploadedFor=profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.every(file => file.uploadedFor === 'profile')).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/files?page=1&limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should not show other users files', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(200);

      expect(response.body.count).toBe(0);
    });
  });

  describe('GET /api/files/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath);

      fileId = response.body.data._id;
    });

    it('should get file by ID', async () => {
      const response = await request(app)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(fileId);
    });

    it('should fail with invalid ID', async () => {
      const response = await request(app)
        .get('/api/files/invalidid')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail to access other user file', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(403);

      expect(response.body.message).toContain('Not authorized');
    });

    it('should access public file', async () => {
      await File.findByIdAndUpdate(fileId, { isPublic: true });

      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/files/:id/download', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath);

      fileId = response.body.data._id;
    });

    it('should download file', async () => {
      const response = await request(app)
        .get(`/api/files/${fileId}/download`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.headers['content-disposition']).toContain('test-image.jpg');
    });

    it('should fail to download other user file', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .get(`/api/files/${fileId}/download`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(403);

      expect(response.body.message).toContain('Not authorized');
    });

    it('should download public file', async () => {
      await File.findByIdAndUpdate(fileId, { isPublic: true });

      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .get(`/api/files/${fileId}/download`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(200);
    });
  });

  describe('PUT /api/files/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath);

      fileId = response.body.data._id;
    });

    it('should update file metadata', async () => {
      const response = await request(app)
        .put(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isPublic: true,
          uploadedFor: 'task'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isPublic).toBe(true);
      expect(response.body.data.uploadedFor).toBe('task');
    });

    it('should fail to update other user file', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .put(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .send({ isPublic: true })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/files/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath);

      fileId = response.body.data._id;
    });

    it('should delete file', async () => {
      const file = await File.findById(fileId);
      const filePath = file.path;

      const response = await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('File deleted successfully');

      // Verify file deleted from database
      const deletedFile = await File.findById(fileId);
      expect(deletedFile).toBeNull();

      // Verify file deleted from disk
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should fail to delete other user file', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(403);

      expect(response.body.message).toBe('Not authorized to delete this file');
    });
  });

  describe('GET /api/files/stats', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testFilePath)
        .field('uploadedFor', 'profile');

      await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', testPdfPath)
        .field('uploadedFor', 'general');
    });

    it('should get file statistics', async () => {
      const response = await request(app)
        .get('/api/files/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFiles');
      expect(response.body.data).toHaveProperty('totalSize');
      expect(response.body.data).toHaveProperty('totalSizeFormatted');
      expect(response.body.data).toHaveProperty('filesByType');
    });

    it('should have correct counts', async () => {
      const response = await request(app)
        .get('/api/files/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.totalFiles).toBe(2);
      expect(response.body.data.filesByType.profile).toBe(1);
      expect(response.body.data.filesByType.general).toBe(1);
    });
  });
});