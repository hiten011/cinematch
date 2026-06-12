/* eslint-disable no-undef */
const {
    request, getApp, loginAgent, tmdb,
    whenQuery, whenExecute, rows, result, resetDbMocks
} = require('./test-utils');

beforeEach(resetDbMocks);

// minimal cached movie row used by the vector code
const dbMovie = {
    id: 603,
    title: 'The Matrix',
    imdb_id: 'tt0133093',
    original_language: 'en',
    overview: 'A hacker...',
    release_date: '1999-03-31',
    imdb_rating: 8.7,
    rotten_rating: 88,
    metacritic_rating: 73,
    poster_url: '/poster.jpg',
    backdrop_url: '/backdrop.jpg',
    trailer_url: null,
    run_time: 136,
    certification: 'M',
    director: null,
    cast: null
};

describe('auth guard', () => {
    test.each([
        ['GET', '/api/personalise/movies'],
        ['POST', '/api/personalise/createUserVector'],
        ['POST', '/api/personalise/genres-id'],
        ['POST', '/api/personalise/languages-id'],
        ['POST', '/api/personalise/genres-name'],
        ['POST', '/api/personalise/languages-code'],
        ['POST', '/api/personalise/movie']
    ])('%s %s rejects guests (401)', async (method, path) => {
        const req = method === 'GET'
            ? request(getApp()).get(path)
            : request(getApp()).post(path).send([]);
        const res = await req;
        expect(res.status).toBe(401);
    });
});

describe('POST /api/personalise/genres-id & languages-id', () => {
    test.each([
        ['/api/personalise/genres-id'],
        ['/api/personalise/languages-id']
    ])('%s rejects a non-array body (400)', async (path) => {
        const agent = await loginAgent();
        const res = await agent.post(path).send({ id: 1 });
        expect(res.status).toBe(400);
    });

    test('replaces the user genres in bulk (200)', async () => {
        const agent = await loginAgent();
        const calls = [];
        whenQuery(/DELETE FROM USERGENRES/, (sql) => { calls.push(sql); return result(); });
        whenQuery(/INSERT IGNORE INTO USERGENRES/, (sql, params) => {
            calls.push(sql);
            expect(params[0]).toEqual([[1, 28], [1, 878]]); // bulk rows
            return result();
        });

        const res = await agent.post('/api/personalise/genres-id').send([28, 878]);
        expect(res.status).toBe(200);
        expect(calls).toHaveLength(2);
    });

    test('accepts an empty genre array (clears preferences, 200)', async () => {
        const agent = await loginAgent();
        whenQuery(/DELETE FROM USERGENRES/, result());

        const res = await agent.post('/api/personalise/genres-id').send([]);
        expect(res.status).toBe(200);
    });

    test('replaces the user languages in bulk (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/DELETE FROM USERLANGUAGES/, result());
        whenQuery(/INSERT IGNORE INTO USERLANGUAGES/, result());

        const res = await agent.post('/api/personalise/languages-id').send([1, 2]);
        expect(res.status).toBe(200);
    });

    test('returns 500 when the delete fails', async () => {
        const agent = await loginAgent();
        whenQuery(/DELETE FROM USERGENRES/, () => {
            throw new Error('db down');
        });

        const res = await agent.post('/api/personalise/genres-id').send([28]);
        expect(res.status).toBe(500);
    });
});

describe('POST /api/personalise/genres-name', () => {
    test('rejects a non-array body (400)', async () => {
        const agent = await loginAgent();
        const res = await agent.post('/api/personalise/genres-name').send('Action');
        expect(res.status).toBe(400);
    });

    test('maps names to ids in one query and bulk inserts (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT id FROM GENRES WHERE name IN/, rows([{ id: 28 }, { id: 18 }]));
        whenQuery(/DELETE FROM USERGENRES/, result());
        whenQuery(/INSERT INTO USERGENRES/, (sql, params) => {
            expect(params[0]).toEqual([[1, 28], [1, 18]]);
            return result();
        });

        const res = await agent.post('/api/personalise/genres-name').send(['Action', 'Drama']);
        expect(res.status).toBe(200);
    });

    test('ignores unknown genre names (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT id FROM GENRES WHERE name IN/, rows([]));
        whenQuery(/DELETE FROM USERGENRES/, result());

        const res = await agent.post('/api/personalise/genres-name').send(['NotAGenre']);
        expect(res.status).toBe(200);
    });
});

describe('POST /api/personalise/languages-code', () => {
    test('maps unknown codes to "ot" (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT id, code FROM LANGUAGES WHERE code IN/, rows([{ id: 38, code: 'en' }]));
        whenQuery(/SELECT id FROM LANGUAGES WHERE code = "ot"/, rows([{ id: 173 }]));
        whenQuery(/DELETE FROM USERLANGUAGES/, result());
        whenQuery(/INSERT INTO USERLANGUAGES/, (sql, params) => {
            expect(params[0]).toEqual(expect.arrayContaining([[1, 38], [1, 173]]));
            return result();
        });

        const res = await agent.post('/api/personalise/languages-code').send(['en', 'zz']);
        expect(res.status).toBe(200);
    });
});

describe('POST /api/personalise/createUserVector', () => {
    test('creates and stores a vector when none exists (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT user_vector FROM USERSETTINGS/, rows([{ user_vector: null }]));
        whenQuery(/select name from USERGENRES/, rows([{ name: 'Action' }]));
        whenQuery(/select code from USERLANGUAGES/, rows([{ code: 'en' }]));
        const stored = [];
        whenExecute(/UPDATE USERSETTINGS SET user_vector = \?/, (sql, params) => {
            stored.push(JSON.parse(params[0]));
            return result();
        });

        const res = await agent.post('/api/personalise/createUserVector');
        expect(res.status).toBe(200);
        expect(stored).toHaveLength(1);
        expect(stored[0].some((v) => v === 1)).toBe(true); // genre/lang flags set
    });

    test('reuses an existing vector without rewriting it (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT user_vector FROM USERSETTINGS/, rows([{ user_vector: [0.5, 0.5] }]));

        const res = await agent.post('/api/personalise/createUserVector');
        expect(res.status).toBe(200);
        expect(require('../services/db').execute).not.toHaveBeenCalled();
    });
});

describe('GET /api/personalise/movies', () => {
    test('recommends via TMDB from the top scored movie (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT movie_id, score FROM USERPREFERENCES/, rows([{ movie_id: 603, score: 0.9 }]));
        whenExecute(/UPDATE USERPREFERENCES SET score = -1/, result());
        tmdb.get.mockResolvedValue({ data: { results: [{ id: 1 }, { id: 2 }, { id: 3 }] } });
        // user has already seen movie 2
        whenQuery(/SELECT movie_id\s+FROM USERPREFERENCES\s+WHERE user_id = \?/, rows([{ movie_id: 2 }]));

        const res = await agent.get('/api/personalise/movies');
        expect(res.status).toBe(200);
        expect(res.body.movieIds).toEqual([1, 3]);
        expect(tmdb.get).toHaveBeenCalledWith('/movie/603/recommendations');
    });

    test('falls back to random movies when there is no seed (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT movie_id, score FROM USERPREFERENCES/, rows([])); // no top movie
        whenQuery(/SELECT id FROM MOVIES ORDER BY RAND\(\)/, rows([{ id: 7 }, { id: 8 }]));
        whenQuery(/SELECT movie_id\s+FROM USERPREFERENCES\s+WHERE user_id = \?/, rows([]));

        const res = await agent.get('/api/personalise/movies');
        expect(res.status).toBe(200);
        expect(res.body.movieIds).toEqual([7, 8]);
        expect(tmdb.get).not.toHaveBeenCalled();
    });

    test('returns 204 when every candidate was already seen', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT movie_id, score FROM USERPREFERENCES/, rows([])); // random path
        whenQuery(/SELECT id FROM MOVIES ORDER BY RAND\(\)/, rows([{ id: 7 }]));
        // user has seen everything that comes back
        whenQuery(/SELECT movie_id\s+FROM USERPREFERENCES\s+WHERE user_id = \?/, rows([{ movie_id: 7 }]));

        const res = await agent.get('/api/personalise/movies');
        expect(res.status).toBe(204);
    });

    test('returns 500 when the database fails', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT movie_id, score FROM USERPREFERENCES/, () => {
            throw new Error('db down');
        });

        const res = await agent.get('/api/personalise/movies');
        expect(res.status).toBe(500);
    });
});

describe('POST /api/personalise/movie (swipe)', () => {
    function mockSwipeQueries({ userVector } = {}) {
        // addMoviePreference
        whenQuery(/SELECT preference_id FROM USERPREFERENCES/, rows([]));
        whenQuery(/SELECT id FROM PREFERENCES WHERE is_liked = \?/, rows([{ id: 5 }]));
        whenQuery(/INSERT INTO USERPREFERENCES/, result());
        // createMovieVector -> getMovieData + getUserRating
        whenQuery(/SELECT \* FROM MOVIES WHERE id = \?/, rows([dbMovie]));
        whenQuery(/FROM GENRES G/, rows([{ id: 28, name: 'Action' }]));
        whenQuery(/FROM WATCHPROVIDERS P/, rows([{ id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 5 }]));
        whenQuery(/SELECT my_rating FROM MOVIELIST/, rows([{ my_rating: 4 }]));
        // getUserVector
        whenQuery(/SELECT user_vector FROM USERSETTINGS/, rows([{ user_vector: userVector || null }]));
        whenQuery(/select name from USERGENRES/, rows([{ name: 'Action' }]));
        whenQuery(/select code from USERLANGUAGES/, rows([{ code: 'en' }]));
    }

    test('a like stores a score and updates the user vector (200)', async () => {
        const agent = await loginAgent();
        mockSwipeQueries();

        const scoreUpdates = [];
        const vectorUpdates = [];
        whenExecute(/UPDATE USERPREFERENCES SET score = \?/, (sql, params) => {
            scoreUpdates.push(params);
            return result();
        });
        whenExecute(/UPDATE USERSETTINGS SET user_vector = \?/, (sql, params) => {
            vectorUpdates.push(JSON.parse(params[0]));
            return result();
        });

        const res = await agent.post('/api/personalise/movie')
            .send({ movie_id: 603, is_liked: true, watch_status: 0 });

        expect(res.status).toBe(200);
        expect(scoreUpdates).toHaveLength(1);
        const [score, userId, movieId] = scoreUpdates[0];
        expect(userId).toBe(1);
        expect(movieId).toBe(603);
        expect(score).toBeGreaterThan(0); // cosine similarity of overlapping vectors
        expect(vectorUpdates.length).toBeGreaterThan(0);
    });

    test('a dislike never writes a score (200)', async () => {
        const agent = await loginAgent();
        mockSwipeQueries();

        const scoreUpdates = [];
        whenExecute(/UPDATE USERPREFERENCES SET score = \?/, (sql, params) => {
            scoreUpdates.push(params);
            return result();
        });
        whenExecute(/UPDATE USERSETTINGS SET user_vector = \?/, result());

        const res = await agent.post('/api/personalise/movie')
            .send({ movie_id: 603, is_liked: false, watch_status: 0 });

        expect(res.status).toBe(200);
        expect(scoreUpdates).toHaveLength(0);
    });

    test('the stored user vector is not normalized by scoring', async () => {
        const agent = await loginAgent();
        // pre-existing vector with known magnitude
        const big = new Array(120).fill(0);
        big[0] = 10;
        mockSwipeQueries({ userVector: big });

        let storedVector = null;
        whenExecute(/UPDATE USERPREFERENCES SET score = \?/, result());
        whenExecute(/UPDATE USERSETTINGS SET user_vector = \?/, (sql, params) => {
            storedVector = JSON.parse(params[0]);
            return result();
        });

        const res = await agent.post('/api/personalise/movie')
            .send({ movie_id: 603, is_liked: true, watch_status: 0 });

        expect(res.status).toBe(200);
        // decay shrinks 10 slightly; normalization would collapse it below 1
        expect(storedVector[0]).toBeGreaterThan(5);
    });

    test('returns 500 when the preference write fails', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT preference_id FROM USERPREFERENCES/, () => {
            throw new Error('db down');
        });

        const res = await agent.post('/api/personalise/movie')
            .send({ movie_id: 603, is_liked: true, watch_status: 0 });

        expect(res.status).toBe(500);
    });
});
