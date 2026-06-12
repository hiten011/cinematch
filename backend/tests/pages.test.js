/* eslint-disable no-undef */
const {
    request, getApp, loginAgent, makeUser,
    whenQuery, rows, resetDbMocks
} = require('./test-utils');

beforeEach(resetDbMocks);

describe('page routes', () => {
    test('GET / redirects to /home', async () => {
        const res = await request(getApp()).get('/');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/home');
    });

    test.each(['/home', '/login', '/signup', '/aboutus'])(
        'GET %s serves the page to guests (200)', async (path) => {
            const res = await request(getApp()).get(path);
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/html');
        }
    );

    test.each(['/mylists', '/settings', '/personalise'])(
        'GET %s requires authentication (401)', async (path) => {
            const res = await request(getApp()).get(path);
            expect(res.status).toBe(401);
        }
    );

    test('GET /mylists serves the page when logged in (200)', async () => {
        const agent = await loginAgent();
        const res = await agent.get('/mylists');
        expect(res.status).toBe(200);
    });

    test('GET /personalise serves the onboarding page when no vector exists', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT user_vector FROM USERSETTINGS/, rows([]));

        const res = await agent.get('/personalise');
        expect(res.status).toBe(200);
        expect(res.text).toContain('personalise.css');
    });

    test('GET /personalise serves the swipe page when a vector exists', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT user_vector FROM USERSETTINGS/, rows([{ user_vector: [1, 0] }]));

        const res = await agent.get('/personalise');
        expect(res.status).toBe(200);
        expect(res.text).toContain('personaliseswipe.css');
    });

    test('GET /admin-dashboard rejects regular users (401)', async () => {
        const agent = await loginAgent(makeUser({ role: 'user' }));
        const res = await agent.get('/admin-dashboard');
        expect(res.status).toBe(401);
    });

    test('GET /admin-dashboard serves the page to admins (200)', async () => {
        const agent = await loginAgent(makeUser({ id: 2, user_name: 'boss', role: 'admin' }));
        const res = await agent.get('/admin-dashboard');
        expect(res.status).toBe(200);
    });

    test.each(['/movie/603', '/tv/1399'])(
        'GET %s serves the detail page (200)', async (path) => {
            const res = await request(getApp()).get(path);
            expect(res.status).toBe(200);
        }
    );

    test('direct .html access is blocked (403)', async () => {
        const res = await request(getApp()).get('/homepage.html');
        expect(res.status).toBe(403);
    });

    test('unknown pages render the 404 error page', async () => {
        const res = await request(getApp()).get('/definitely-not-a-page');
        expect(res.status).toBe(404);
        expect(res.text).toContain('Page Not Found');
    });

    test('static assets are served', async () => {
        const res = await request(getApp()).get('/stylesheets/index.css');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/css');
    });
});
