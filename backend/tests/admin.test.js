/* eslint-disable no-undef */
const {
    request, getApp, loginAgent, makeUser,
    whenQuery, rows, result, resetDbMocks
} = require('./test-utils');

beforeEach(resetDbMocks);

const adminUser = () => makeUser({ id: 2, user_name: 'boss', role: 'admin' });

describe('authorization', () => {
    test('rejects guests (401)', async () => {
        const res = await request(getApp()).get('/api/admin/users');
        expect(res.status).toBe(401);
    });

    test('rejects non-admin users (401)', async () => {
        const agent = await loginAgent(makeUser({ role: 'user' }));
        const res = await agent.get('/api/admin/users');
        expect(res.status).toBe(401);
    });
});

describe('GET /api/admin/users', () => {
    test('returns paginated users (200)', async () => {
        const agent = await loginAgent(adminUser());
        whenQuery(/SELECT COUNT\(\*\) AS total FROM USERLIST/, rows([{ total: 23 }]));
        whenQuery(/FROM USERLIST/, rows([{ user_id: 1, user_name: 'tester', role: 'user' }]));

        const res = await agent.get('/api/admin/users').query({ page: 2, limit: 10 });
        expect(res.status).toBe(200);
        expect(res.body.total_users).toBe(23);
        expect(res.body.total_pages).toBe(3);
        expect(res.body.page).toBe(2);
        expect(res.body.users).toHaveLength(1);
    });

    test.each([
        ['page=0', { page: 0 }],
        ['page=abc', { page: 'abc' }],
        ['limit=0', { limit: 0 }],
        ['invalid role filter', { role: 'superuser' }],
        ['invalid sort field', { sort: 'password.asc' }],
        ['invalid sort direction', { sort: 'user_name.sideways' }]
    ])('rejects %s (400)', async (_label, query) => {
        const agent = await loginAgent(adminUser());
        const res = await agent.get('/api/admin/users').query(query);
        expect(res.status).toBe(400);
    });

    test('filters by role and username substring (200)', async () => {
        const agent = await loginAgent(adminUser());
        let captured;
        whenQuery(/SELECT COUNT\(\*\) AS total FROM USERLIST/, (sql, params) => {
            captured = { sql, params };
            return rows([{ total: 1 }]);
        });
        whenQuery(/FROM USERLIST/, rows([]));

        const res = await agent.get('/api/admin/users').query({ role: 'admin', username: 'bo' });
        expect(res.status).toBe(200);
        expect(captured.sql).toContain('role IN');
        expect(captured.sql).toContain('user_name LIKE ?');
        expect(captured.params).toEqual(['admin', '%bo%']);
    });
});

describe('GET /api/admin/stats', () => {
    test('aggregates all counters (200)', async () => {
        const agent = await loginAgent(adminUser());
        whenQuery(/SELECT COUNT\(\*\) AS count FROM USERS/, rows([{ count: 10 }]));
        whenQuery(/SELECT COUNT\(\*\) AS count FROM MOVIES/, rows([{ count: 50 }]));
        whenQuery(/SELECT COUNT\(DISTINCT user_id\) AS count/, rows([{ count: 3 }]));
        whenQuery(/SELECT COUNT\(\*\) AS count FROM SESSIONS/, rows([{ count: 99 }]));

        const res = await agent.get('/api/admin/stats');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            total_users: 10,
            total_movies: 50,
            total_active: 3,
            total_visits: 99
        });
    });

    test('returns 500 when a counter query fails', async () => {
        const agent = await loginAgent(adminUser());
        whenQuery(/SELECT COUNT\(\*\) AS count FROM USERS/, () => {
            throw new Error('db down');
        });

        const res = await agent.get('/api/admin/stats');
        expect(res.status).toBe(500);
    });
});

describe('POST /api/admin/users', () => {
    const newUser = {
        username: 'fresh',
        password: 'Str0ng!Pass',
        firstName: 'Fresh',
        lastName: 'User',
        role: 'user'
    };

    test('creates a user and settings row (201)', async () => {
        const agent = await loginAgent(adminUser());
        whenQuery(/SELECT id FROM USERS WHERE user_name = \?/, rows([]));
        whenQuery(/INSERT INTO USERS/, result({ insertId: 7 }));
        whenQuery(/INSERT INTO USERSETTINGS/, result());

        const res = await agent.post('/api/admin/users').send(newUser);
        expect(res.status).toBe(201);
        expect(res.body.user_id).toBe(7);
    });

    test('rejects a duplicate username (409)', async () => {
        const agent = await loginAgent(adminUser());
        whenQuery(/SELECT id FROM USERS WHERE user_name = \?/, rows([{ id: 1 }]));

        const res = await agent.post('/api/admin/users').send(newUser);
        expect(res.status).toBe(409);
    });

    test('returns a generic 500 without leaking DB errors', async () => {
        const agent = await loginAgent(adminUser());
        whenQuery(/SELECT id FROM USERS WHERE user_name = \?/, () => {
            throw new Error('ER_SECRET_INTERNALS at table USERS');
        });

        const res = await agent.post('/api/admin/users').send(newUser);
        expect(res.status).toBe(500);
        expect(res.body.msg).not.toContain('ER_SECRET_INTERNALS');
    });
});

describe('DELETE /api/admin/users/:id & delete-multiple', () => {
    test('deletes a single user (200)', async () => {
        const agent = await loginAgent(adminUser());
        whenQuery(/DELETE FROM USERS WHERE id = \?/, result());

        const res = await agent.delete('/api/admin/users/5');
        expect(res.status).toBe(200);
    });

    test('bulk-deletes valid integer ids (200)', async () => {
        const agent = await loginAgent(adminUser());
        let captured;
        whenQuery(/DELETE FROM USERS WHERE id IN/, (sql, params) => {
            captured = params;
            return result();
        });

        const res = await agent
            .post('/api/admin/users/delete-multiple')
            .send({ user_ids: [3, 4, 5] });

        expect(res.status).toBe(200);
        expect(res.body.deleted_ids).toEqual([3, 4, 5]);
        expect(captured).toEqual([[3, 4, 5]]);
    });

    test.each([
        ['an empty array', { user_ids: [] }],
        ['a missing array', {}],
        ['a non-array', { user_ids: 'all' }],
        ['non-integer ids', { user_ids: [1, 'two'] }],
        ['sql-injection strings', { user_ids: ["1; DROP TABLE USERS"] }],
        ['negative ids', { user_ids: [-1] }],
        ['float ids', { user_ids: [1.5] }]
    ])('rejects %s (400)', async (_label, body) => {
        const agent = await loginAgent(adminUser());
        const res = await agent.post('/api/admin/users/delete-multiple').send(body);
        expect(res.status).toBe(400);
    });
});

describe('PUT /api/admin/users/:id', () => {
    test('updates only the provided fields (200)', async () => {
        const agent = await loginAgent(adminUser());
        let captured;
        whenQuery(/UPDATE USERS SET/, (sql, params) => {
            captured = { sql, params };
            return result();
        });

        const res = await agent
            .put('/api/admin/users/5')
            .send({ firstName: 'Renamed', role: 'admin' });

        expect(res.status).toBe(200);
        expect(captured.sql).toContain('first_name = ?');
        expect(captured.sql).toContain('role = ?');
        expect(captured.sql).not.toContain('last_name');
        expect(captured.params).toEqual(['Renamed', 'admin', '5']);
    });

    test('rejects an update with no fields (400)', async () => {
        const agent = await loginAgent(adminUser());
        const res = await agent.put('/api/admin/users/5').send({});
        expect(res.status).toBe(400);
    });
});

describe('GET /api/admin/active', () => {
    test('lists active sessions (200)', async () => {
        const agent = await loginAgent(adminUser());
        whenQuery(/FROM SESSIONS S/, rows([
            { session_id: 'abc', user_id: 1, user_name: 'tester', last_seen: '2026-06-12' }
        ]));

        const res = await agent.get('/api/admin/active');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });
});
