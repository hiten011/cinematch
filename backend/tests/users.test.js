/* eslint-disable no-undef */
const {
    request, getApp, loginAgent, makeUser,
    whenQuery, rows, result, resetDbMocks, TEST_PASSWORD
} = require('./test-utils');

beforeEach(resetDbMocks);

describe('GET /api/users/me', () => {
    test('rejects guests (401)', async () => {
        const res = await request(getApp()).get('/api/users/me');
        expect(res.status).toBe(401);
    });

    test('returns the logged-in user profile (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/FROM USERS u\s+JOIN USERSETTINGS/, rows([{
            user_name: 'tester',
            first_name: 'Test',
            last_name: 'User',
            profile_picture_url: '/uploads/avatar3.svg',
            theme: 'dark',
            role: 'user'
        }]));

        const res = await agent.get('/api/users/me');
        expect(res.status).toBe(200);
        expect(res.body.user_name).toBe('tester');
        expect(res.body.theme).toBe('dark');
    });

    test('returns 404 when the user has no settings row', async () => {
        const agent = await loginAgent();
        whenQuery(/FROM USERS u\s+JOIN USERSETTINGS/, rows([]));

        const res = await agent.get('/api/users/me');
        expect(res.status).toBe(404);
    });
});

describe('PUT /api/users/me', () => {
    test('rejects guests (401)', async () => {
        const res = await request(getApp())
            .put('/api/users/me')
            .send({ first_name: 'New', password: TEST_PASSWORD });
        expect(res.status).toBe(401);
    });

    test('updates names with the correct password (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT password FROM USERS WHERE id = \?/, rows([makeUser()]));
        whenQuery(/UPDATE USERS SET first_name = \?, last_name = \?/, result());

        const res = await agent
            .put('/api/users/me')
            .send({ first_name: 'New', last_name: 'Name', password: TEST_PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('User updated');
    });

    test('rejects an incorrect password (401)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT password FROM USERS WHERE id = \?/, rows([makeUser()]));

        const res = await agent
            .put('/api/users/me')
            .send({ first_name: 'New', password: 'WrongPass1!' });

        expect(res.status).toBe(401);
    });

    test('rejects when no updatable fields are provided (400)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT password FROM USERS WHERE id = \?/, rows([makeUser()]));

        const res = await agent.put('/api/users/me').send({ password: TEST_PASSWORD });
        expect(res.status).toBe(400);
        expect(res.body.msg).toBe('No fields to update');
    });

    test.each([
        ['numeric first name', { first_name: 'Bob1', password: TEST_PASSWORD }],
        ['too long last name', { last_name: 'B'.repeat(21), password: TEST_PASSWORD }],
        ['missing password', { first_name: 'Bob' }]
    ])('rejects %s (400)', async (_label, body) => {
        const agent = await loginAgent();
        const res = await agent.put('/api/users/me').send(body);
        expect(res.status).toBe(400);
    });
});

describe('DELETE /api/users/me', () => {
    test('rejects guests (401)', async () => {
        const res = await request(getApp())
            .delete('/api/users/me')
            .send({ password: TEST_PASSWORD });
        expect(res.status).toBe(401);
    });

    test('deletes the account with the correct password (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT password FROM USERS WHERE id = \?/, rows([makeUser()]));
        whenQuery(/DELETE FROM USERS WHERE id = \?/, result());

        const res = await agent
            .delete('/api/users/me')
            .send({ password: TEST_PASSWORD });

        expect(res.status).toBe(200);
        // session destroyed: subsequent requests are unauthenticated
        expect((await agent.get('/api/auth/status')).status).toBe(401);
    });

    test('rejects an incorrect password (401)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT password FROM USERS WHERE id = \?/, rows([makeUser()]));

        const res = await agent
            .delete('/api/users/me')
            .send({ password: 'WrongPass1!' });

        expect(res.status).toBe(401);
    });

    test('rejects a missing password (400/401)', async () => {
        const agent = await loginAgent();
        const res = await agent.delete('/api/users/me').send({});
        expect([400, 401]).toContain(res.status);
    });
});

describe('POST /api/users/me/theme', () => {
    test('rejects guests (401)', async () => {
        const res = await request(getApp())
            .post('/api/users/me/theme')
            .send({ theme: 'dark' });
        expect(res.status).toBe(401);
    });

    test.each(['light', 'dark'])('accepts theme %s (200)', async (theme) => {
        const agent = await loginAgent();
        whenQuery(/UPDATE USERSETTINGS SET theme = \?/, result());

        const res = await agent.post('/api/users/me/theme').send({ theme });
        expect(res.status).toBe(200);
    });

    test.each([
        ['an invalid theme', { theme: 'blue' }],
        ['a missing theme', {}]
    ])('rejects %s (400)', async (_label, body) => {
        const agent = await loginAgent();
        const res = await agent.post('/api/users/me/theme').send(body);
        expect(res.status).toBe(400);
    });

    test('returns 404 when no settings row was updated', async () => {
        const agent = await loginAgent();
        whenQuery(/UPDATE USERSETTINGS SET theme = \?/, result({ affectedRows: 0 }));

        const res = await agent.post('/api/users/me/theme').send({ theme: 'dark' });
        expect(res.status).toBe(404);
    });
});

describe('POST /api/users/me/profile-avatar', () => {
    test.each([1, 5])('accepts avatar id %i (200)', async (id) => {
        const agent = await loginAgent();
        whenQuery(/UPDATE USERS SET profile_picture_url = \?/, result());

        const res = await agent.post('/api/users/me/profile-avatar').send({ id });
        expect(res.status).toBe(200);
        expect(res.body.profile_picture_url).toBe(`/uploads/avatar${id}.svg`);
    });

    test.each([0, 6, 'abc', null])('rejects avatar id %p (400)', async (id) => {
        const agent = await loginAgent();
        const res = await agent.post('/api/users/me/profile-avatar').send({ id });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/users/languages-genres', () => {
    test('returns the user preferences (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/select name from USERGENRES/, rows([{ name: 'Action' }, { name: 'Drama' }]));
        whenQuery(/select code from USERLANGUAGES/, rows([{ code: 'en' }]));

        const res = await agent.get('/api/users/languages-genres');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            favorite_genres: ['Action', 'Drama'],
            preferred_languages: ['en']
        });
    });

    test('falls back to empty lists when the lookups fail (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/select name from USERGENRES/, () => {
            throw new Error('db down');
        });

        const res = await agent.get('/api/users/languages-genres');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ favorite_genres: [], preferred_languages: [] });
    });
});
