import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Task from '../../src/models/Task.js';
import dotenv from 'dotenv';

dotenv.config();

let token, userId, taskId;

beforeAll(async () => {
  const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/vephla-test';
  await mongoose.connect(testDbUri);
});

beforeEach(async () => {
  await User.deleteMany({});
  await Task.deleteMany({});

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

describe('Task CRUD Tests', () => {
  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test description',
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task created successfully');
      expect(response.body.data).toHaveProperty('title', 'Test Task');
      expect(response.body.data.status).toBe('todo');
      expect(response.body.data.priority).toBe('high');
      
      taskId = response.body.data._id;
    });

    it('should create task with minimal data', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Simple Task'
        })
        .expect(201);

      expect(response.body.data.status).toBe('todo');
      expect(response.body.data.priority).toBe('medium');
    });

    it('should create task with tags', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Tagged Task',
          tags: ['urgent', 'client']
        })
        .expect(201);

      expect(response.body.data.tags).toEqual(['urgent', 'client']);
    });

    it('should fail without title', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'No title'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid priority', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Task',
          priority: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Task',
          status: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should create task with assignment', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const user2Id = user2Response.body.data.user._id;

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Assigned Task',
          assignedTo: [user2Id]
        })
        .expect(201);

      expect(response.body.data.assignedTo).toHaveLength(1);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const yesterday = new Date(Date.now() - 86400000);

      await Task.create([
        {
          title: 'Task 1',
          description: 'High priority task',
          priority: 'high',
          status: 'todo',
          owner: userId,
          dueDate: tomorrow
        },
        {
          title: 'Task 2',
          description: 'In progress task',
          priority: 'medium',
          status: 'in_progress',
          owner: userId
        },
        {
          title: 'Task 3',
          description: 'Completed task',
          priority: 'low',
          status: 'completed',
          owner: userId
        },
        {
          title: 'Overdue Task',
          description: 'Overdue',
          priority: 'urgent',
          status: 'todo',
          owner: userId,
          dueDate: yesterday
        }
      ]);
    });

    it('should get all user tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(4);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=todo')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.every(task => task.status === 'todo')).toBe(true);
    });

    it('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.every(task => task.priority === 'high')).toBe(true);
    });

    it('should filter overdue tasks', async () => {
      const response = await request(app)
        .get('/api/tasks?dueDate=overdue')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should search tasks', async () => {
      const response = await request(app)
        .get('/api/tasks?search=High priority')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should get assigned tasks', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const user2Id = user2Response.body.data.user._id;
      const user2Token = user2Response.body.data.accessToken;

      // Create task assigned to user2
      await Task.create({
        title: 'Assigned to User2',
        owner: userId,
        assignedTo: [user2Id]
      });

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tasks/:id', () => {
    beforeEach(async () => {
      const task = await Task.create({
        title: 'Single Task',
        description: 'Single description',
        owner: userId
      });
      taskId = task._id;
    });

    it('should get task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', 'Single Task');
    });

    it('should populate owner and assignedTo', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.owner).toHaveProperty('username');
      expect(response.body.data.owner).toHaveProperty('email');
    });

    it('should fail with invalid ID', async () => {
      const response = await request(app)
        .get('/api/tasks/invalidid')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should fail to access unauthorized task', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(403);

      expect(response.body.message).toContain('Not authorized');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    beforeEach(async () => {
      const task = await Task.create({
        title: 'Original Task',
        description: 'Original description',
        status: 'todo',
        priority: 'low',
        owner: userId
      });
      taskId = task._id;
    });

    it('should update task', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Task',
          description: 'Updated description',
          priority: 'high'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Task');
      expect(response.body.data.priority).toBe('high');
    });

    it('should update status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'in_progress'
        })
        .expect(200);

      expect(response.body.data.status).toBe('in_progress');
    });

    it('should set completedBy when marking as completed', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'completed'
        })
        .expect(200);

      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedBy).toBe(userId);
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should update due date', async () => {
      const newDate = new Date(Date.now() + 86400000).toISOString();

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          dueDate: newDate
        })
        .expect(200);

      expect(response.body.data.dueDate).toBeDefined();
    });

    it('should allow assigned user to update', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const user2Id = user2Response.body.data.user._id;
      const user2Token = user2Response.body.data.accessToken;

      // Update task to assign to user2
      await Task.findByIdAndUpdate(taskId, {
        assignedTo: [user2Id]
      });

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          status: 'in_progress'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    beforeEach(async () => {
      const task = await Task.create({
        title: 'Task to Delete',
        owner: userId
      });
      taskId = task._id;
    });

    it('should delete task', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task deleted successfully');

      const task = await Task.findById(taskId);
      expect(task).toBeNull();
    });

    it('should only allow owner to delete', async () => {
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${user2Response.body.data.accessToken}`)
        .expect(403);

      expect(response.body.message).toBe('Only task owner can delete');
    });
  });

  describe('PUT /api/tasks/:id/status', () => {
    beforeEach(async () => {
      const task = await Task.create({
        title: 'Task for Status Update',
        status: 'todo',
        owner: userId
      });
      taskId = task._id;
    });

    it('should update task status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'in_progress'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should mark as completed', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'completed'
        })
        .expect(200);

      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.completedBy).toBe(userId);
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'invalid'
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid status');
    });
  });

  describe('GET /api/tasks/stats', () => {
    beforeEach(async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const nextWeek = new Date(Date.now() + 7 * 86400000);

      await Task.create([
        { title: 'Todo 1', status: 'todo', owner: userId },
        { title: 'Todo 2', status: 'todo', owner: userId },
        { title: 'In Progress', status: 'in_progress', owner: userId },
        { title: 'Completed', status: 'completed', owner: userId },
        { 
          title: 'Overdue', 
          status: 'todo', 
          owner: userId,
          dueDate: yesterday 
        },
        { 
          title: 'Due This Week', 
          status: 'todo', 
          owner: userId,
          dueDate: nextWeek 
        }
      ]);
    });

    it('should get task statistics', async () => {
      const response = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('todo');
      expect(response.body.data).toHaveProperty('inProgress');
      expect(response.body.data).toHaveProperty('completed');
      expect(response.body.data).toHaveProperty('overdue');
      expect(response.body.data).toHaveProperty('dueThisWeek');
    });

    it('should have correct counts', async () => {
      const response = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.total).toBe(6);
      expect(response.body.data.todo).toBe(3);
      expect(response.body.data.inProgress).toBe(1);
      expect(response.body.data.completed).toBe(1);
    });
  });
});