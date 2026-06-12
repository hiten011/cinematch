/* eslint-disable no-undef */
const {
    request, getApp, tmdb, getImdbData, resetDbMocks
} = require('./test-utils');

beforeEach(resetDbMocks);

function tmdbTvList(n = 2) {
    return {
        data: {
            results: Array.from({ length: n }, (_, i) => ({
                id: i + 1,
                name: `Show ${i + 1}`,
                poster_path: `/poster${i + 1}.jpg`
            }))
        }
    };
}

describe('GET /api/tv list endpoints', () => {
    test.each([
        ['/api/tv/trending', '/trending/tv/day'],
        ['/api/tv/top-rated', '/tv/top_rated'],
        ['/api/tv/now-airing', '/tv/on_the_air']
    ])('%s returns trimmed results (200)', async (endpoint, tmdbPath) => {
        tmdb.get.mockResolvedValue(tmdbTvList());

        const res = await request(getApp()).get(endpoint);
        expect(res.status).toBe(200);
        expect(res.body[0]).toEqual({ id: 1, title: 'Show 1', poster_path: '/poster1.jpg' });
        expect(tmdb.get).toHaveBeenCalledWith(tmdbPath);
    });

    test('caches the TMDB response between requests', async () => {
        tmdb.get.mockResolvedValue(tmdbTvList());

        await request(getApp()).get('/api/tv/trending');
        await request(getApp()).get('/api/tv/trending');

        expect(tmdb.get.mock.calls.filter(([p]) => p === '/trending/tv/day')).toHaveLength(1);
    });

    test('returns 500 when TMDB fails', async () => {
        tmdb.get.mockRejectedValue(new Error('tmdb down'));

        const res = await request(getApp()).get('/api/tv/top-rated');
        expect(res.status).toBe(500);
    });
});

describe('GET /api/tv/search', () => {
    test('returns at most 5 trimmed results (200)', async () => {
        tmdb.get.mockResolvedValue(tmdbTvList(9));

        const res = await request(getApp()).get('/api/tv/search').query({ q: 'breaking' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(5);
        expect(res.body[0]).toEqual({ id: 1, title: 'Show 1' });
    });

    test.each([
        ['missing query', {}],
        ['too-short query', { q: 'a' }],
        ['invalid characters', { q: '<img onerror=1>' }]
    ])('rejects %s (400)', async (_label, query) => {
        const res = await request(getApp()).get('/api/tv/search').query(query);
        expect(res.status).toBe(400);
    });
});

describe('GET /api/tv/show/:id', () => {
    test.each(['abc', '-2', '0'])('rejects invalid id %s (400)', async (id) => {
        const res = await request(getApp()).get(`/api/tv/show/${id}`);
        expect(res.status).toBe(400);
    });

    test('assembles show details from TMDB/OMDB (200)', async () => {
        tmdb.get.mockResolvedValue({
            data: {
                id: 1399,
                name: 'Game of Thrones',
                original_language: 'en',
                overview: 'Westeros...',
                first_air_date: '2011-04-17',
                number_of_episodes: 73,
                number_of_seasons: 8,
                poster_path: '/p.jpg',
                backdrop_path: '/b.jpg',
                genres: [{ id: 10765, name: 'Sci-Fi & Fantasy' }],
                created_by: [{ name: 'David Benioff' }, { name: 'D. B. Weiss' }],
                external_ids: { imdb_id: 'tt0944947' },
                content_ratings: { results: [{ iso_3166_1: 'US', rating: 'TV-MA' }] },
                videos: { results: [{ site: 'YouTube', type: 'Trailer', key: 'got' }] },
                'watch/providers': {
                    results: { US: { flatrate: [{ provider_id: 1899, provider_name: 'Max' }] } }
                }
            }
        });
        getImdbData.mockResolvedValue({
            ratings: [{ Source: 'Internet Movie Database', Value: '9.2/10' }],
            cast: 'Emilia Clarke'
        });

        const res = await request(getApp()).get('/api/tv/show/1399');
        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Game of Thrones');
        expect(res.body.certification).toBe('TV-MA');
        expect(res.body.director).toBe('David Benioff, D. B. Weiss');
        expect(res.body.imdb_rating).toBe(9.2);
        expect(res.body.trailer).toBe('https://www.youtube.com/watch?v=got');
        expect(res.body.watch_providers).toEqual([{ provider_id: 1899, provider_name: 'Max' }]);
    });

    test('falls back to NR when no preferred-country rating exists (200)', async () => {
        tmdb.get.mockResolvedValue({
            data: {
                id: 1400,
                name: 'Obscure Show',
                external_ids: {},
                content_ratings: { results: [{ iso_3166_1: 'FR', rating: '16' }] },
                videos: { results: [] },
                'watch/providers': { results: {} }
            }
        });

        const res = await request(getApp()).get('/api/tv/show/1400');
        expect(res.status).toBe(200);
        expect(res.body.certification).toBe('NR');
        expect(res.body.trailer).toBeNull();
        expect(res.body.watch_providers).toEqual([]);
    });

    test('returns 500 when TMDB fails', async () => {
        tmdb.get.mockRejectedValue(new Error('tmdb down'));

        const res = await request(getApp()).get('/api/tv/show/1399');
        expect(res.status).toBe(500);
    });
});

describe('GET /api/tv/user-preferences/:id', () => {
    test('returns default rating/status placeholders (200)', async () => {
        const res = await request(getApp()).get('/api/tv/user-preferences/1399');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ user_rating: 0, watch_status: 0 });
    });

    test('rejects an invalid id (400)', async () => {
        const res = await request(getApp()).get('/api/tv/user-preferences/abc');
        expect(res.status).toBe(400);
    });
});
