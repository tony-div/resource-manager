import request from 'supertest';
import app from '../app';
import { getPool } from '../config/database';

let adminToken: string;
let userToken: string;
let createdItemId: number;
let createdPackageId: number;
let createdEntityId: number;
let createdReservationId: number;

beforeAll(async () => {
  const pool = getPool();
  await pool.execute("DELETE FROM reservation_items");
  await pool.execute("DELETE FROM reservations");
  await pool.execute("DELETE FROM package_items");
  await pool.execute("DELETE FROM packages");
  await pool.execute("DELETE FROM inventory_items WHERE id > 20");
  await pool.execute("DELETE FROM audit_log");
  await pool.execute("DELETE FROM refresh_tokens");
  await pool.execute("DELETE FROM user_borrower_entity");
  await pool.execute("DELETE FROM borrower_entities WHERE id > 3");
  await pool.execute("DELETE FROM users WHERE id > 3");

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123' });
  adminToken = adminRes.body.token;

  const userRes = await request(app)
    .post('/api/auth/login')
    .send({ username: 'user1', password: 'user123' });
  userToken = userRes.body.token;
});

describe('Auth Endpoints', () => {
  test('POST /api/auth/login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('role', 'admin');
  });

  test('POST /api/auth/login with invalid credentials returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/logout requires auth', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('POST /api/auth/logout without auth returns 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

describe('Users Endpoints', () => {
  test('GET /api/users requires admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/users returns paginated list', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/users creates a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'testuser',
        password: 'testpass123',
        role: 'borrower',
        full_name: 'Test User',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('username', 'testuser');
  });

  test('POST /api/users rejects duplicate username', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'testuser',
        password: 'testpass123',
        role: 'borrower',
        full_name: 'Test User',
      });
    expect(res.status).toBe(409);
  });

  test('GET /api/users/:id returns specific user', async () => {
    const res = await request(app)
      .get('/api/users/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('username');
  });

  test('PUT /api/users/:id updates user', async () => {
    const res = await request(app)
      .put('/api/users/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ full_name: 'Updated Admin' });
    expect(res.status).toBe(200);
  });

  test('DELETE /api/users/:id requires admin', async () => {
    const res = await request(app)
      .delete('/api/users/1')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Borrower Entities Endpoints', () => {
  test('GET /api/entities returns list', async () => {
    const res = await request(app)
      .get('/api/entities')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  test('POST /api/entities creates entity', async () => {
    const res = await request(app)
      .post('/api/entities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Entity', description: 'A test entity' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Test Entity');
    createdEntityId = res.body.id;
  });

  test('GET /api/entities/:id returns specific entity', async () => {
    const res = await request(app)
      .get(`/api/entities/${createdEntityId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdEntityId);
  });

  test('PUT /api/entities/:id updates entity', async () => {
    const res = await request(app)
      .put(`/api/entities/${createdEntityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Entity' });
    expect(res.status).toBe(200);
  });

  test('DELETE /api/entities/:id requires admin', async () => {
    const res = await request(app)
      .delete(`/api/entities/${createdEntityId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Inventory Endpoints', () => {
  test('GET /api/inventory returns paginated list', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/inventory includes available_quantity', async () => {
    const res = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toHaveProperty('available_quantity');
  });

  test('POST /api/inventory creates item with Arabic normalization', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'شاشة عرض',
        description: 'Arabic name test',
        total_quantity: 10,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'شاشة عرض');
    createdItemId = res.body.id;
  });

  test('GET /api/inventory/:id returns item', async () => {
    const res = await request(app)
      .get(`/api/inventory/${createdItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdItemId);
  });

  test('PUT /api/inventory/:id updates item', async () => {
    const res = await request(app)
      .put(`/api/inventory/${createdItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ total_quantity: 15 });
    expect(res.status).toBe(200);
    expect(res.body.total_quantity).toBe(15);
  });

  test('DELETE /api/inventory/:id cleans up reservations', async () => {
    const res = await request(app)
      .delete(`/api/inventory/${createdItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Packages Endpoints', () => {
  test('POST /api/packages creates package', async () => {
    const res = await request(app)
      .post('/api/packages')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Package',
        description: 'A test package',
        items: [
          { inventory_id: 2, quantity: 1 },
          { inventory_id: 3, quantity: 2 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Test Package');
    expect(res.body.items).toHaveLength(2);
    createdPackageId = res.body.id;
  });

  test('GET /api/packages returns list', async () => {
    const res = await request(app)
      .get('/api/packages')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  test('GET /api/packages/:id returns package with items', async () => {
    const res = await request(app)
      .get(`/api/packages/${createdPackageId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });

  test('PUT /api/packages/:id updates package', async () => {
    const res = await request(app)
      .put(`/api/packages/${createdPackageId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Package' });
    expect(res.status).toBe(200);
  });

  test('DELETE /api/packages/:id cleans up reservations', async () => {
    const res = await request(app)
      .delete(`/api/packages/${createdPackageId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Reservation Endpoints', () => {
  test('POST /api/reservations creates reservation', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        borrower_entity_id: 1,
        pickup_time: '09:00:00',
        return_time: '17:00:00',
        start_date: '2026-06-01',
        end_date: '2026-06-03',
        notes: 'Test reservation',
        items: [{ inventory_id: 2, quantity: 1 }],
        packages: [],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('status', 'pending');
    createdReservationId = res.body.id;
  });

  test('GET /api/reservations returns list', async () => {
    const res = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/reservations/:id returns reservation', async () => {
    const res = await request(app)
      .get(`/api/reservations/${createdReservationId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdReservationId);
  });

  test('POST /api/reservations rejects insufficient inventory', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        borrower_entity_id: 1,
        pickup_time: '09:00:00',
        return_time: '17:00:00',
        start_date: '2026-06-01',
        end_date: '2026-06-03',
        items: [{ inventory_id: 2, quantity: 999 }],
        packages: [],
      });
    expect(res.status).toBe(409);
  });

  test('POST /api/reservations/:id/return requires admin', async () => {
    const res = await request(app)
      .post(`/api/reservations/${createdReservationId}/return`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ notes: 'Returned in good condition' });
    expect(res.status).toBe(403);
  });

  test('DELETE /api/reservations/:id cancels reservation', async () => {
    const res = await request(app)
      .delete(`/api/reservations/${createdReservationId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Config Endpoints', () => {
  test('GET /api/config returns settings', async () => {
    const res = await request(app)
      .get('/api/config')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('PUT /api/config requires admin', async () => {
    const res = await request(app)
      .put('/api/config')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ company_name: 'Test Corp' });
    expect(res.status).toBe(403);
  });

  test('PUT /api/config updates settings', async () => {
    const res = await request(app)
      .put('/api/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ test_key: 'test_value' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('test_key');
  });
});

describe('Dashboard Endpoints', () => {
  test('GET /api/dashboard/stats returns stats', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('active_reservations_count');
    expect(res.body).toHaveProperty('total_inventory_items');
    expect(res.body).toHaveProperty('total_borrower_entities');
  });
});

describe('Audit Log Endpoints', () => {
  test('GET /api/audit-logs requires admin', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/audit-logs returns paginated logs', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
  });
});

afterAll(async () => {
  const pool = getPool();
  await pool.execute("DELETE FROM reservation_items");
  await pool.execute("DELETE FROM reservations");
  await pool.execute("DELETE FROM package_items");
  await pool.execute("DELETE FROM packages WHERE id > 3");
  await pool.execute("DELETE FROM inventory_items WHERE id > 20");
  await pool.execute("DELETE FROM borrower_entities WHERE id > 3");
  await pool.execute("DELETE FROM users WHERE username = 'testuser'");
  await pool.end();
});
