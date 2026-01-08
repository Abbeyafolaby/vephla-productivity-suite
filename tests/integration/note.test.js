import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Note from '../../src/models/Note.js';
import dotenv from 'dotenv';

dotenv.config();

let token, userId, noteId;

beforeAll(async () => {
  const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/vephla-test';
  await mongoose.connect(testDbUri);
});

beforeEach(async () => {
  await User.deleteMany({});
  await Note.deleteMany({});

  // Create test user and get token
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
  await mongoose.connection.close();
});

describe('Note CRUD Tests', () => {
  describe('POST /api/notes', () => {
    it('should create a new note', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note content',
        category: 'Work',
        tags: ['important', 'urgent']
      };

      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send(noteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Note created successfully');
      expect(response.body.data).toHaveProperty('title', 'Test Note');
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('owner', userId);
      expect(response.body.data.tags).toEqual(['important', 'urgent']);
      
      noteId = response.body.data._id;
    });

    it('should create note with minimal data', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Simple Note',
          content: 'Simple content'
        })
        .expect(201);

      expect(response.body.data.category).toBe('General');
    });

    it('should fail without title', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Content without title'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should fail without content', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Title without content'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/notes')
        .send({
          title: 'Test',
          content: 'Test content'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should create note with color', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Colored Note',
          content: 'Note with color',
          color: '#FF5733'
        })
        .expect(201);

      expect(response.body.data.color).toBe('#FF5733');
    });

    it('should create pinned note', async () => {
      const response = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Pinned Note',
          content: 'This is pinned',
          isPinned: true
        })
        .expect(201);

      expect(response.body.data.isPinned).toBe(true);
    });
  });

  describe('GET /api/notes', () => {
    beforeEach(async () => {
      // Create multiple notes
      await Note.create([
        {
          title: 'Note 1',
          content: 'Content 1',
          category: 'Work',
          tags: ['important'],
          owner: userId,
          isPinned: true
        },
        {
          title: 'Note 2',
          content: 'Content 2',
          category: 'Personal',
          tags: ['reminder'],
          owner: userId
        },
        {
          title: 'Note 3',
          content: 'Content 3',
          category: 'Work',
          owner: userId
        }
      ]);
    });

    it('should get all user notes', async () => {
      const response = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter notes by category', async () => {
      const response = await request(app)
        .get('/api/notes?category=Work')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toBe(2);
      expect(response.body.data.every(note => note.category === 'Work')).toBe(true);
    });

    it('should filter notes by tags', async () => {
      const response = await request(app)
        .get('/api/notes?tags=important')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0].tags).toContain('important');
    });

    it('should filter pinned notes', async () => {
      const response = await request(app)
        .get('/api/notes?isPinned=true')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.every(note => note.isPinned === true)).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/notes?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should search notes', async () => {
      const response = await request(app)
        .get('/api/notes?search=Note 1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should show pinned notes first', async () => {
      const response = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data[0].isPinned).toBe(true);
    });
  });

  describe('GET /api/notes/:id', () => {
    beforeEach(async () => {
      const note = await Note.create({
        title: 'Single Note',
        content: 'Single content',
        owner: userId
      });
      noteId = note._id;
    });

    it('should get note by ID', async () => {
      const response = await request(app)
        .get(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', 'Single Note');
    });

    it('should fail with invalid ID', async () => {
      const response = await request(app)
        .get('/api/notes/invalidid')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail to access another user note', async () => {
      // Create another user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const user2Token = user2Response.body.data.accessToken;

      const response = await request(app)
        .get(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(response.body.message).toContain('Not authorized');
    });
  });

  describe('PUT /api/notes/:id', () => {
    beforeEach(async () => {
      const note = await Note.create({
        title: 'Original Note',
        content: 'Original content',
        owner: userId
      });
      noteId = note._id;
    });

    it('should update note', async () => {
      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Note',
          content: 'Updated content',
          category: 'Updated'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Note');
      expect(response.body.data.content).toBe('Updated content');
      expect(response.body.data.category).toBe('Updated');
    });

    it('should update only specified fields', async () => {
      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Title Only'
        })
        .expect(200);

      expect(response.body.data.title).toBe('New Title Only');
      expect(response.body.data.content).toBe('Original content');
    });

    it('should update tags', async () => {
      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          tags: ['updated', 'tags']
        })
        .expect(200);

      expect(response.body.data.tags).toEqual(['updated', 'tags']);
    });

    it('should pin/unpin note', async () => {
      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          isPinned: true
        })
        .expect(200);

      expect(response.body.data.isPinned).toBe(true);
    });

    it('should fail to update another user note', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .send({ title: 'Hacked' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/notes/:id', () => {
    beforeEach(async () => {
      const note = await Note.create({
        title: 'Note to Delete',
        content: 'Will be deleted',
        owner: userId
      });
      noteId = note._id;
    });

    it('should delete note', async () => {
      const response = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Note deleted successfully');

      // Verify deletion
      const note = await Note.findById(noteId);
      expect(note).toBeNull();
    });

    it('should fail with invalid ID', async () => {
      const response = await request(app)
        .delete('/api/notes/invalidid')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail to delete another user note', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(403);

      expect(response.body.message).toBe('Not authorized to delete this note');
    });
  });

  describe('POST /api/notes/:id/share', () => {
    let user2Id, user2Token;

    beforeEach(async () => {
      // Create note
      const note = await Note.create({
        title: 'Note to Share',
        content: 'Shareable content',
        owner: userId
      });
      noteId = note._id;

      // Create second user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      user2Id = user2Response.body.data.user._id;
      user2Token = user2Response.body.data.accessToken;
    });

    it('should share note with users', async () => {
      const response = await request(app)
        .post(`/api/notes/${noteId}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userIds: [user2Id],
          permission: 'view'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isShared).toBe(true);
      expect(response.body.data.sharedWith).toHaveLength(1);
    });

    it('should share with edit permission', async () => {
      const response = await request(app)
        .post(`/api/notes/${noteId}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userIds: [user2Id],
          permission: 'edit'
        })
        .expect(200);

      expect(response.body.data.sharedWith[0].permission).toBe('edit');
    });

    it('should fail if not owner', async () => {
      const response = await request(app)
        .post(`/api/notes/${noteId}/share`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          userIds: [user2Id]
        })
        .expect(403);

      expect(response.body.message).toBe('Only note owner can share');
    });
  });

  describe('GET /api/notes/shared', () => {
    let user2Token;

    beforeEach(async () => {
      // Create second user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const user2Id = user2Response.body.data.user._id;
      user2Token = user2Response.body.data.accessToken;

      // Create and share note
      const note = await Note.create({
        title: 'Shared Note',
        content: 'Shared content',
        owner: userId,
        isShared: true,
        sharedWith: [{
          user: user2Id,
          permission: 'view'
        }]
      });
    });

    it('should get shared notes', async () => {
      const response = await request(app)
        .get('/api/notes/shared')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data[0].title).toBe('Shared Note');
    });

    it('should populate owner information', async () => {
      const response = await request(app)
        .get('/api/notes/shared')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.data[0].owner).toHaveProperty('username');
      expect(response.body.data[0].owner).toHaveProperty('email');
    });
  });
});