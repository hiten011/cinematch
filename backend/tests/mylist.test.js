/* eslint-disable no-undef */
const {
    request, getApp, loginAgent,
    whenQuery, rows, result, resetDbMocks
} = require('./test-utils');

beforeEach(resetDbMocks);

describe('GET /api/mylist', () => {
    test('rejects guests (401)', async () => {
        const res = await request(getApp()).get('/api/mylist');
        expect(res.status).toBe(401);
    });

    test('returns an empty array when nothing matches (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT DISTINCT movie_id, MAX\(created_at\)/, rows([]));

        const res = await agent.get('/api/mylist');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('returns formatted movies with deduplicated genres/providers (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT DISTINCT movie_id, MAX\(created_at\)/, rows([{ movie_id: 603 }]));
        // one movie joined against two genres and one provider (3 rows)
        const base = {
            movie_id: 603,
            title: 'The Matrix',
            release_date: '1999-03-31',
            watch_status: 3,
            certification: 'M',
            imdb_rating: 8.7,
            my_rating: 4.5
        };
        whenQuery(/WHERE user_id = \? AND movie_id IN/, rows([
            { ...base, genre_id: 28, genre_name: 'Action', watchprovider_id: 8, watchprovider_name: 'Netflix', watchprovider_logo_path: '/n.jpg', watchprovider_priority: 5 },
            { ...base, genre_id: 878, genre_name: 'Science Fiction', watchprovider_id: 8, watchprovider_name: 'Netflix', watchprovider_logo_path: '/n.jpg', watchprovider_priority: 5 },
            { ...base, genre_id: 28, genre_name: 'Action', watchprovider_id: 8, watchprovider_name: 'Netflix', watchprovider_logo_path: '/n.jpg', watchprovider_priority: 5 }
        ]));
        whenQuery(/SELECT COUNT\(DISTINCT movie_id\) AS total/, rows([{ total: 1 }]));

        const res = await agent.get('/api/mylist');
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.movies).toHaveLength(1);
        expect(res.body.movies[0].genres).toEqual([
            { id: 28, name: 'Action' },
            { id: 878, name: 'Science Fiction' }
        ]);
        expect(res.body.movies[0].watch_providers).toHaveLength(1);
    });

    test.each([
        ['page=0', { page: 0 }],
        ['page=abc', { page: 'abc' }],
        ['limit=0', { limit: 0 }],
        ['limit=-5', { limit: -5 }],
        ['bad sort field', { sort: 'title.asc' }],
        ['bad sort direction', { sort: 'imdb_rating.up' }],
        ['sort without direction', { sort: 'imdb_rating' }],
        ['non-numeric genre', { genre: 'horror' }],
        ['status out of range', { status: 7 }],
        ['my_rating above 10', { my_rating: 11 }]
    ])('rejects %s (400)', async (_label, query) => {
        const agent = await loginAgent();
        const res = await agent.get('/api/mylist').query(query);
        expect(res.status).toBe(400);
    });

    test('accepts valid filters, sorting and pagination (200)', async () => {
        const agent = await loginAgent();
        const seen = { idQuery: null, idParams: null };
        whenQuery(/SELECT DISTINCT movie_id, MAX\(created_at\)/, (sql, params) => {
            seen.idQuery = sql;
            seen.idParams = params;
            return rows([]);
        });

        const res = await agent.get('/api/mylist').query({
            page: 2,
            limit: 5,
            sort: 'imdb_rating.desc',
            genre: [28, 878],
            certification: 'M',
            status: 3,
            my_rating: 4.5
        });

        expect(res.status).toBe(200);
        expect(seen.idQuery).toContain('genre_id IN');
        expect(seen.idQuery).toContain('certification IN');
        // user_id, 2 genres, 1 cert, 1 status, rating, limit, offset
        expect(seen.idParams).toEqual(expect.arrayContaining([1, '28', '878', 'M', '4.5', 5, 5]));
    });

    test('returns 500 when the query fails', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT DISTINCT movie_id, MAX\(created_at\)/, () => {
            throw new Error('db down');
        });

        const res = await agent.get('/api/mylist');
        expect(res.status).toBe(500);
    });
});

describe('POST /api/mylist', () => {
    const validBody = { movie_id: 603, is_liked: true, watch_status: 2 };

    test('rejects guests (401)', async () => {
        const res = await request(getApp()).post('/api/mylist').send(validBody);
        expect(res.status).toBe(401);
    });

    test('inserts a new preference (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT preference_id FROM USERPREFERENCES/, rows([]));
        whenQuery(/SELECT id FROM PREFERENCES WHERE is_liked = \?/, rows([{ id: 7 }]));
        whenQuery(/INSERT INTO USERPREFERENCES/, result());

        const res = await agent.post('/api/mylist').send(validBody);
        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('successfully added');
    });

    test('updates an existing preference (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT preference_id FROM USERPREFERENCES/, rows([{ preference_id: 3 }]));
        whenQuery(/SELECT id FROM PREFERENCES WHERE is_liked = \?/, rows([{ id: 7 }]));
        whenQuery(/UPDATE USERPREFERENCES SET preference_id = \?/, result());

        const res = await agent.post('/api/mylist').send(validBody);
        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('successfully updated');
    });

    test.each([
        ['missing movie_id', { is_liked: true, watch_status: 2 }],
        ['non-integer movie_id', { movie_id: 'abc', is_liked: true, watch_status: 2 }],
        ['negative movie_id', { movie_id: -1, is_liked: true, watch_status: 2 }],
        ['missing is_liked', { movie_id: 603, watch_status: 2 }],
        ['non-boolean is_liked', { movie_id: 603, is_liked: 'maybe', watch_status: 2 }],
        ['missing watch_status', { movie_id: 603, is_liked: true }],
        ['watch_status too high', { movie_id: 603, is_liked: true, watch_status: 4 }],
        ['negative watch_status', { movie_id: 603, is_liked: true, watch_status: -1 }]
    ])('rejects %s (400)', async (_label, body) => {
        const agent = await loginAgent();
        const res = await agent.post('/api/mylist').send(body);
        expect(res.status).toBe(400);
    });

    test('returns 500 when no matching preference row exists', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT preference_id FROM USERPREFERENCES/, rows([]));
        whenQuery(/SELECT id FROM PREFERENCES WHERE is_liked = \?/, rows([]));

        const res = await agent.post('/api/mylist').send(validBody);
        expect(res.status).toBe(500);
    });
});

describe('POST /api/mylist/add-rating', () => {
    const validBody = { movie_id: 603, rating: 4.5, review: 'Great movie' };

    test('rejects guests (401)', async () => {
        const res = await request(getApp()).post('/api/mylist/add-rating').send(validBody);
        expect(res.status).toBe(401);
    });

    test('inserts a first rating for an existing preference (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT user_rating_id FROM USERPREFERENCES/, rows([{ user_rating_id: null }]));
        whenQuery(/INSERT INTO USERRATINGS/, result({ insertId: 11 }));
        whenQuery(/UPDATE USERPREFERENCES SET user_rating_id=\?/, result());

        const res = await agent.post('/api/mylist/add-rating').send(validBody);
        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('successfully added');
    });

    test('updates an existing rating (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT user_rating_id FROM USERPREFERENCES/, rows([{ user_rating_id: 11 }]));
        whenQuery(/UPDATE USERRATINGS SET rating = \?/, result());

        const res = await agent.post('/api/mylist/add-rating').send(validBody);
        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('successfully updated');
    });

    test('creates a default preference when none exists (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT user_rating_id FROM USERPREFERENCES/, rows([]));
        whenQuery(/SELECT preference_id FROM USERPREFERENCES/, rows([]));
        whenQuery(/SELECT id FROM PREFERENCES WHERE is_liked = \?/, rows([{ id: 5 }]));
        whenQuery(/INSERT INTO USERPREFERENCES/, result());
        whenQuery(/INSERT INTO USERRATINGS/, result({ insertId: 12 }));
        whenQuery(/UPDATE USERPREFERENCES SET user_rating_id=\?/, result());

        const res = await agent.post('/api/mylist/add-rating').send(validBody);
        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('successfully added');
    });

    test.each([
        ['missing movie_id', { rating: 4 }],
        ['missing rating', { movie_id: 603 }],
        ['rating above 5', { movie_id: 603, rating: 5.5 }],
        ['negative rating', { movie_id: 603, rating: -1 }],
        ['rating not in 0.5 steps', { movie_id: 603, rating: 4.3 }],
        ['review too long', { movie_id: 603, rating: 4, review: 'x'.repeat(1001) }],
        ['non-string review', { movie_id: 603, rating: 4, review: { a: 1 } }]
    ])('rejects %s (400)', async (_label, body) => {
        const agent = await loginAgent();
        const res = await agent.post('/api/mylist/add-rating').send(body);
        expect(res.status).toBe(400);
    });

    test.each([0, 0.5, 5])('accepts boundary rating %p (200)', async (rating) => {
        const agent = await loginAgent();
        whenQuery(/SELECT user_rating_id FROM USERPREFERENCES/, rows([{ user_rating_id: 11 }]));
        whenQuery(/UPDATE USERRATINGS SET rating = \?/, result());

        const res = await agent.post('/api/mylist/add-rating').send({ movie_id: 603, rating });
        expect(res.status).toBe(200);
    });
});
