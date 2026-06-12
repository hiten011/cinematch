/* eslint-disable no-undef */
const {
    request, getApp, loginAgent, makeUser,
    whenQuery, rows, result, resetDbMocks, TEST_PASSWORD
} = require('./test-utils');

beforeEach(resetDbMocks);

describe('POST /api/auth/signup', () => {
    const validBody = {
        username: 'newuser',
        password: 'Str0ng!Pass',
        firstName: 'New',
        lastName: 'User'
    };

    test('creates a user and its settings row (201)', async () => {
        whenQuery(/SELECT id FROM USERS WHERE user_name = \?/, rows([]));
        whenQuery(/INSERT INTO USERS/, result({ insertId: 42 }));
        whenQuery(/INSERT INTO USERSETTINGS/, result());

        const res = await request(getApp()).post('/api/auth/signup').send(validBody);
        expect(res.status).toBe(201);
        expect(res.body.msg).toBe('User created');
    });

    test('rejects a taken username (400)', async () => {
        whenQuery(/SELECT id FROM USERS WHERE user_name = \?/, rows([{ id: 1 }]));

        const res = await request(getApp()).post('/api/auth/signup').send(validBody);
        expect(res.status).toBe(400);
        expect(res.body.msg).toBe('Username already taken');
    });

    test.each([
        ['missing username', { ...validBody, username: '' }],
        ['username too short', { ...validBody, username: 'ab' }],
        ['username too long', { ...validBody, username: 'a'.repeat(21) }],
        ['missing password', { ...validBody, password: '' }],
        ['password too short', { ...validBody, password: 'S1!a' }],
        ['password without uppercase', { ...validBody, password: 'weak1!pass' }],
        ['password without lowercase', { ...validBody, password: 'WEAK1!PASS' }],
        ['password without digit', { ...validBody, password: 'Weak!Pass!' }],
        ['password without special char', { ...validBody, password: 'Weak1Passs' }],
        ['missing first name', { ...validBody, firstName: '' }],
        ['numeric first name', { ...validBody, firstName: 'New1' }],
        ['first name too long', { ...validBody, firstName: 'A'.repeat(21) }],
        ['missing last name', { ...validBody, lastName: '' }],
        ['numeric last name', { ...validBody, lastName: 'User1' }]
    ])('rejects %s (400)', async (_label, body) => {
        const res = await request(getApp()).post('/api/auth/signup').send(body);
        expect(res.status).toBe(400);
        expect(res.body.msg).toBeDefined();
    });

    test('returns 500 on a database error', async () => {
        whenQuery(/SELECT id FROM USERS WHERE user_name = \?/, () => {
            throw new Error('db down');
        });

        const res = await request(getApp()).post('/api/auth/signup').send(validBody);
        expect(res.status).toBe(500);
    });
});

describe('POST /api/auth/login', () => {
    test('logs in with valid credentials (200) and sets a session cookie', async () => {
        const user = makeUser();
        whenQuery(/SELECT id,user_name,password FROM USERS WHERE user_name = \?/, rows([user]));
        whenQuery(/UPDATE USERS SET last_login/, result());
        whenQuery(/UPDATE SESSIONS SET user_id/, result());

        const res = await request(getApp())
            .post('/api/auth/login')
            .send({ username: user.user_name, password: TEST_PASSWORD });

        expect(res.status).toBe(200);
        expect(res.headers['set-cookie'].join(';')).toContain('sessionId');
    });

    test('rejects a wrong password (401)', async () => {
        whenQuery(/SELECT id,user_name,password FROM USERS WHERE user_name = \?/, rows([makeUser()]));

        const res = await request(getApp())
            .post('/api/auth/login')
            .send({ username: 'tester', password: 'WrongPass1!' });

        expect(res.status).toBe(401);
        expect(res.body.msg).toBe('Invalid credentials');
    });

    test('rejects an unknown user (401)', async () => {
        whenQuery(/SELECT id,user_name,password FROM USERS WHERE user_name = \?/, rows([]));

        const res = await request(getApp())
            .post('/api/auth/login')
            .send({ username: 'ghost', password: TEST_PASSWORD });

        expect(res.status).toBe(401);
    });

    test.each([
        ['missing username', { password: TEST_PASSWORD }],
        ['username too short', { username: 'ab', password: TEST_PASSWORD }],
        ['missing password', { username: 'tester' }]
    ])('rejects %s (400)', async (_label, body) => {
        const res = await request(getApp()).post('/api/auth/login').send(body);
        expect(res.status).toBe(400);
    });

    test('returns 500 when the user lookup fails', async () => {
        whenQuery(/SELECT id,user_name,password FROM USERS WHERE user_name = \?/, () => {
            throw new Error('db down');
        });

        const res = await request(getApp())
            .post('/api/auth/login')
            .send({ username: 'tester', password: TEST_PASSWORD });

        expect(res.status).toBe(500);
    });
});

describe('POST /api/auth/change-password', () => {
    test('rejects guests (401)', async () => {
        const res = await request(getApp())
            .post('/api/auth/change-password')
            .send({ current_password: TEST_PASSWORD, new_password: 'NewStr0ng!Pass' });
        expect(res.status).toBe(401);
    });

    test('changes the password for a logged-in user (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT password FROM USERS WHERE id = \?/, rows([makeUser()]));
        whenQuery(/UPDATE USERS SET password = \?/, result());

        const res = await agent
            .post('/api/auth/change-password')
            .send({ current_password: TEST_PASSWORD, new_password: 'NewStr0ng!Pass' });

        expect(res.status).toBe(200);
    });

    test('rejects an incorrect current password (401)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT password FROM USERS WHERE id = \?/, rows([makeUser()]));

        const res = await agent
            .post('/api/auth/change-password')
            .send({ current_password: 'WrongPass1!', new_password: 'NewStr0ng!Pass' });

        expect(res.status).toBe(401);
    });

    test('rejects a weak new password (400)', async () => {
        const agent = await loginAgent();

        const res = await agent
            .post('/api/auth/change-password')
            .send({ current_password: TEST_PASSWORD, new_password: 'weakpass' });

        expect(res.status).toBe(400);
    });

    test('returns 404 when the user row has disappeared', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT password FROM USERS WHERE id = \?/, rows([]));

        const res = await agent
            .post('/api/auth/change-password')
            .send({ current_password: TEST_PASSWORD, new_password: 'NewStr0ng!Pass' });

        expect(res.status).toBe(404);
    });
});

describe('GET /api/auth/status & POST /api/auth/logout', () => {
    test('status is 401 for guests', async () => {
        const res = await request(getApp()).get('/api/auth/status');
        expect(res.status).toBe(401);
    });

    test('status is 200 once logged in, 401 again after logout', async () => {
        const agent = await loginAgent();

        expect((await agent.get('/api/auth/status')).status).toBe(200);

        const logout = await agent.post('/api/auth/logout');
        expect(logout.status).toBe(200);

        expect((await agent.get('/api/auth/status')).status).toBe(401);
    });
});
