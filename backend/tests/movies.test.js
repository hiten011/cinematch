/* eslint-disable no-undef */
const {
    request, getApp, loginAgent, tmdb, getImdbData,
    whenQuery, rows, resetDbMocks
} = require('./test-utils');

beforeEach(resetDbMocks);

function tmdbList(n = 3) {
    return {
        data: {
            results: Array.from({ length: n }, (_, i) => ({
                id: i + 1,
                title: `Movie ${i + 1}`,
                name: `Show ${i + 1}`,
                poster_path: `/poster${i + 1}.jpg`
            }))
        }
    };
}

describe('GET /api/movies list endpoints', () => {
    test.each([
        ['/api/movies/trending', '/movie/popular'],
        ['/api/movies/top-rated', '/movie/top_rated'],
        ['/api/movies/now-playing', '/movie/now_playing']
    ])('%s returns trimmed results (200)', async (endpoint, tmdbPath) => {
        tmdb.get.mockResolvedValue(tmdbList());

        const res = await request(getApp()).get(endpoint);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(3);
        expect(res.body[0]).toEqual({ id: 1, title: 'Movie 1', poster_path: '/poster1.jpg' });
        expect(tmdb.get).toHaveBeenCalledWith(tmdbPath);
    });

    test('caches the TMDB response between requests', async () => {
        tmdb.get.mockResolvedValue(tmdbList());

        await request(getApp()).get('/api/movies/trending');
        await request(getApp()).get('/api/movies/trending');

        // second request must be served from the cache
        expect(tmdb.get.mock.calls.filter(([p]) => p === '/movie/popular')).toHaveLength(1);
    });

    test('returns 500 when TMDB fails (uncached path)', async () => {
        tmdb.get.mockRejectedValue(new Error('tmdb down'));

        // use top-rated to avoid the value cached by the previous tests
        const res = await request(getApp()).get('/api/movies/now-playing');
        expect(res.status).toBe(500);
    });
});

describe('GET /api/movies/search', () => {
    test('returns at most 5 trimmed results (200)', async () => {
        tmdb.get.mockResolvedValue(tmdbList(8));

        const res = await request(getApp()).get('/api/movies/search').query({ q: 'batman' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(5);
        expect(res.body[0]).toEqual({ id: 1, title: 'Movie 1' });
    });

    test.each([
        ['missing query', {}],
        ['empty query', { q: '' }],
        ['single character query', { q: 'a' }],
        ['query with invalid characters', { q: 'movie;<script>' }]
    ])('rejects %s (400)', async (_label, query) => {
        const res = await request(getApp()).get('/api/movies/search').query(query);
        expect(res.status).toBe(400);
    });
});

describe('GET /api/movies/genres & /api/movies/languages', () => {
    test('returns genre rows (200)', async () => {
        whenQuery(/SELECT \* FROM GENRES/, rows([{ id: 28, name: 'Action' }]));

        const res = await request(getApp()).get('/api/movies/genres');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 28, name: 'Action' }]);
    });

    test('returns language rows (200)', async () => {
        whenQuery(/SELECT \* FROM LANGUAGES/, rows([{ id: 1, code: 'en', name: 'English' }]));

        const res = await request(getApp()).get('/api/movies/languages');
        expect(res.status).toBe(200);
        expect(res.body[0].code).toBe('en');
    });

    test('returns 500 when the genre lookup fails', async () => {
        whenQuery(/SELECT \* FROM GENRES/, () => {
            throw new Error('db down');
        });

        const res = await request(getApp()).get('/api/movies/genres');
        expect(res.status).toBe(500);
    });
});

describe('GET /api/movies/movie/:id', () => {
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
        trailer_url: 'https://www.youtube.com/watch?v=abc',
        run_time: 136,
        certification: 'M',
        director: 'Wachowski',
        cast: 'Keanu Reeves'
    };

    test.each(['abc', '-1', '0'])('rejects invalid id %s (400)', async (id) => {
        const res = await request(getApp()).get(`/api/movies/movie/${id}`);
        expect(res.status).toBe(400);
    });

    test('serves a locally cached movie without calling TMDB (200)', async () => {
        whenQuery(/SELECT \* FROM MOVIES WHERE id = \?/, rows([dbMovie]));
        whenQuery(/FROM GENRES G/, rows([{ id: 28, name: 'Action' }]));
        whenQuery(/FROM WATCHPROVIDERS P/, rows([{ id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 5 }]));

        const res = await request(getApp()).get('/api/movies/movie/603');
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('The Matrix');
        expect(res.body.genres).toEqual([{ id: 28, name: 'Action' }]);
        expect(res.body.watch_providers[0].provider_name).toBe('Netflix');
        expect(tmdb.get).not.toHaveBeenCalled();
    });

    test('fetches, assembles and caches a movie from TMDB/OMDB (200)', async () => {
        whenQuery(/SELECT \* FROM MOVIES WHERE id = \?/, rows([])); // not cached yet
        whenQuery(/SELECT id FROM MOVIES WHERE id = \?/, rows([])); // insertMovie check

        tmdb.get.mockResolvedValue({
            data: {
                id: 604,
                imdb_id: 'tt0234215',
                original_language: 'en',
                overview: 'Neo returns',
                title: 'The Matrix Reloaded',
                runtime: 138,
                poster_path: '/p.jpg',
                backdrop_path: '/b.jpg',
                genres: [{ id: 28, name: 'Action' }],
                release_date: '2003-05-15',
                release_dates: {
                    results: [{
                        iso_3166_1: 'AU',
                        release_dates: [{ certification: 'M', release_date: '2003-05-15T00:00:00.000Z' }]
                    }]
                },
                videos: { results: [{ site: 'YouTube', type: 'Trailer', key: 'xyz' }] },
                'watch/providers': {
                    results: {
                        AU: { flatrate: [{ provider_id: 8, provider_name: 'Netflix' }] }
                    }
                }
            }
        });
        getImdbData.mockResolvedValue({
            ratings: [
                { Source: 'Internet Movie Database', Value: '7.2/10' },
                { Source: 'Rotten Tomatoes', Value: '74%' },
                { Source: 'Metacritic', Value: '62/100' }
            ],
            director: 'Wachowski',
            cast: 'Keanu Reeves'
        });

        const res = await request(getApp()).get('/api/movies/movie/604');
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('The Matrix Reloaded');
        expect(res.body.certification).toBe('M');
        expect(res.body.release_date).toBe('2003-05-15');
        expect(res.body.trailer).toBe('https://www.youtube.com/watch?v=xyz');
        expect(res.body.imdb_rating).toBe(7.2);
        expect(res.body.rotten_rating).toBe(74);
        expect(res.body.metacritic_rating).toBe(62);
        expect(res.body.watch_providers).toEqual([{ provider_id: 8, provider_name: 'Netflix' }]);
    });

    test('returns 500 when TMDB fails and the movie is not cached', async () => {
        whenQuery(/SELECT \* FROM MOVIES WHERE id = \?/, rows([]));
        tmdb.get.mockRejectedValue(new Error('tmdb down'));

        const res = await request(getApp()).get('/api/movies/movie/605');
        expect(res.status).toBe(500);
    });
});

describe('GET /api/movies/user-preferences/:id', () => {
    test('rejects guests (401)', async () => {
        const res = await request(getApp()).get('/api/movies/user-preferences/603');
        expect(res.status).toBe(401);
    });

    test('rejects an invalid id (400)', async () => {
        const agent = await loginAgent();
        const res = await agent.get('/api/movies/user-preferences/abc');
        expect(res.status).toBe(400);
    });

    test('returns the stored rating and status (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT my_rating FROM MOVIELIST/, rows([{ my_rating: 4.5 }]));
        whenQuery(/SELECT watch_status FROM MOVIELIST/, rows([{ watch_status: 3 }]));

        const res = await agent.get('/api/movies/user-preferences/603');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ user_rating: 4.5, watch_status: 3 });
    });

    test('defaults to 0/0 when the movie is not in the list (200)', async () => {
        const agent = await loginAgent();
        whenQuery(/SELECT my_rating FROM MOVIELIST/, rows([]));
        whenQuery(/SELECT watch_status FROM MOVIELIST/, rows([]));

        const res = await agent.get('/api/movies/user-preferences/603');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ user_rating: 0, watch_status: 0 });
    });
});
