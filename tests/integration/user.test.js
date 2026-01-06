import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

let adminToken, standardToken, adminUser, standardUser;

beforeAll(async () => {
  const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/vephla-test';
  await mongoose.connect(testDbUri);
});

beforeEach(async () => {
  await User.deleteMany({});

  // Create admin user
  const adminResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    });

  adminToken = adminResponse.body.data.accessToken;
  adminUser = adminResponse.body.data.user;

  // Create standard user
  const standardResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'standard',
      email: 'standard@example.com',
      password: 'standard123',
      role: 'standard'
    });

  standardToken = standardResponse.body.data.accessToken;
  standardUser = standardResponse.body.data.user;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('User Management Tests', () => {
  describe('GET /api/users', () => {
    it('should get all users as admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('should fail as standard user', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${standardToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.every(user => user.role === 'admin')).toBe(true);
    });

    it('should search users', async () => {
      const response = await request(app)
        .get('/api/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      // Create more users
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({
            username: `user${i}`,
            email: `user${i}@example.com`,
            password: 'password123'
          });
      }

      const response = await request(app)
        .get('/api/users?page=1&limit=3')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(3);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(3);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID as admin', async () => {
      const response = await request(app)
        .get(`/api/users/${standardUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('standard');
    });

    it('should fail with invalid ID', async () => {
      const response = await request(app)
        .get('/api/users/invalidid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail as standard user', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${standardToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user as admin', async () => {
      const response = await request(app)
        .put(`/api/users/${standardUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          profile: {
            firstName: 'Updated',
            lastName: 'Name'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.profile.firstName).toBe('Updated');
    });

    it('should update user role', async () => {
      const response = await request(app)
        .put(`/api/users/${standardUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'admin'
        })
        .expect(200);

      expect(response.body.data.role).toBe('admin');
    });

    it('should fail as standard user', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${standardToken}`)
        .send({ isActive: false })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as admin', async () => {
      const response = await request(app)
        .delete(`/api/users/${standardUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');

      // Verify user is deleted
      const user = await User.findById(standardUser._id);
      expect(user).toBeNull();
    });

    it('should fail to delete own account', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe('You cannot delete your own account');
    });

    it('should fail as standard user', async () => {
      const response = await request(app)
        .delete(`/api/users/${adminUser._id}`)
        .set('Authorization', `Bearer ${standardToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id/role', () => {
    it('should update user role as admin', async () => {
      const response = await request(app)
        .put(`/api/users/${standardUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('admin');
    });

    it('should fail with invalid role', async () => {
      const response = await request(app)
        .put(`/api/users/${standardUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superadmin' })
        .expect(400);

      expect(response.body.message).toContain('Invalid role');
    });

    it('should fail to change own role', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'standard' })
        .expect(400);

      expect(response.body.message).toBe('You cannot change your own role');
    });

    it('should fail as standard user', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser._id}/role`)
        .set('Authorization', `Bearer ${standardToken}`)
        .send({ role: 'standard' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/stats', () => {
    it('should get user statistics as admin', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalUsers');
      expect(response.body.data).toHaveProperty('activeUsers');
      expect(response.body.data).toHaveProperty('adminUsers');
      expect(response.body.data).toHaveProperty('standardUsers');
      expect(response.body.data.totalUsers).toBeGreaterThan(0);
    });

    it('should fail as standard user', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${standardToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});