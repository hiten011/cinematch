/* eslint-disable no-undef */
// Shared test utilities: mocked DB pool, mocked session store and
// helpers to build an app instance and authenticated supertest agents.

process.env.COOKIE_SECRET = 'test-secret';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '3306';
process.env.DB_NAME = 'cinematch_test';
process.env.DB_USER = 'test';
process.env.DB_PASS = 'test';
process.env.TMDB_API_KEY = 'test-tmdb-key';
process.env.OMDB_API_KEY = 'test-omdb-key';
process.env.NODE_ENV = 'test';

// ---- module mocks (hoisted by jest before requires) ----

jest.mock('../services/db', () => ({
    query: jest.fn(),
    execute: jest.fn(),
    end: jest.fn()
}));

// replace the MySQL-backed session store with the in-memory store
jest.mock('express-mysql-session', () => (session) => session.MemoryStore);

jest.mock('../services/tmdb', () => ({
    tmdb: { get: jest.fn() },
    getImdbData: jest.fn().mockResolvedValue({ ratings: [], director: null, cast: null })
}));

const request = require('supertest');
const db = require('../services/db');
const { tmdb, getImdbData } = require('../services/tmdb');
const { hashPassword } = require('../services/helpers');
const { clearCache } = require('../services/cache');

// SQL routing table: [regex, result-or-fn][]
let queryHandlers = [];
let executeHandlers = [];

// default result shape works for both SELECT ([rows]) and UPDATE ([result])
const DEFAULT_RESULT = [[], []];

function dispatch(handlers) {
    return async (sql, params) => {
        for (const [pattern, result] of handlers) {
            if (pattern.test(sql)) {
                return typeof result === 'function' ? result(sql, params) : result;
            }
        }
        return DEFAULT_RESULT;
    };
}

/** Register a db.query handler: rows for SELECTs, result object for writes. */
function whenQuery(pattern, result) {
    queryHandlers.push([pattern, result]);
}

/** Register a db.execute handler. */
function whenExecute(pattern, result) {
    executeHandlers.push([pattern, result]);
}

/** Wrap rows in the mysql2 [rows, fields] shape. */
function rows(r) {
    return [r, []];
}

/** Wrap a write result in the mysql2 [result, fields] shape. */
function result(r) {
    return [{ affectedRows: 1, insertId: 0, ...r }, []];
}

function resetDbMocks() {
    queryHandlers = [];
    executeHandlers = [];
    db.query.mockReset();
    db.execute.mockReset();
    db.query.mockImplementation(dispatch(queryHandlers));
    db.execute.mockImplementation(dispatch(executeHandlers));

    tmdb.get.mockReset();
    getImdbData.mockReset();
    getImdbData.mockResolvedValue({ ratings: [], director: null, cast: null });

    clearCache();
}

// password shared by all test users (satisfies the validators)
const TEST_PASSWORD = 'Str0ng!Pass';
const TEST_HASH = hashPassword(TEST_PASSWORD);

function makeUser(overrides = {}) {
    return {
        id: 1,
        user_name: 'tester',
        password: TEST_HASH,
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        profile_picture_url: '/uploads/avatar3.svg',
        ...overrides
    };
}

let app;
function getApp() {
    if (!app) {
        // require lazily so env vars and mocks are in place first
        app = require('../app');
    }
    return app;
}

/**
 * Logs `user` in through the real passport flow and returns a supertest
 * agent that carries the session cookie. Registers the queries needed by
 * the login route and deserializeUser.
 */
async function loginAgent(user = makeUser()) {
    whenQuery(/SELECT id,user_name,password FROM USERS WHERE user_name = \?/, rows([user]));
    whenQuery(/SELECT \* FROM USERS WHERE id = \?/, rows([user]));
    whenQuery(/UPDATE USERS SET last_login/, result());
    whenQuery(/UPDATE SESSIONS SET user_id/, result());

    const agent = request.agent(getApp());
    const res = await agent
        .post('/api/auth/login')
        .send({ username: user.user_name, password: TEST_PASSWORD });

    if (res.status !== 200) {
        throw new Error(`test login failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return agent;
}

module.exports = {
    request,
    db,
    tmdb,
    getImdbData,
    getApp,
    loginAgent,
    makeUser,
    whenQuery,
    whenExecute,
    rows,
    result,
    resetDbMocks,
    TEST_PASSWORD,
    TEST_HASH
};
