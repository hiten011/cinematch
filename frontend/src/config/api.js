/**
 * API Configuration
 * Edit API_BASE to change the backend URL (useful for different environments).
 * All endpoint constants are defined here — no magic strings in components.
 */

export const API_BASE = '/api';

export const API = {
  AUTH: {
    STATUS:  `${API_BASE}/auth/status`,
    LOGIN:   `${API_BASE}/auth/login`,
    LOGOUT:  `${API_BASE}/auth/logout`,
    SIGNUP:  `${API_BASE}/auth/signup`,
  },

  USERS: {
    ME:               `${API_BASE}/users/me`,
    THEME:            `${API_BASE}/users/me/theme`,
    UPLOAD_PIC:       `${API_BASE}/users/me/profile-picture`,
    PROFILE_AVATAR:   `${API_BASE}/users/me/profile-avatar`,
    LANGUAGES_GENRES: `${API_BASE}/users/languages-genres`,
  },

  AUTH_EXTRA: {
    CHANGE_PASSWORD: `${API_BASE}/auth/change-password`,
  },

  MOVIES: {
    TRENDING:         `${API_BASE}/movies/trending`,
    TOP_RATED:        `${API_BASE}/movies/top-rated`,
    NOW_PLAYING:      `${API_BASE}/movies/now-playing`,
    SEARCH:           (q) => `${API_BASE}/movies/search?q=${encodeURIComponent(q)}`,
    DETAIL:           (id) => `${API_BASE}/movies/movie/${id}`,
    USER_PREFS:       (id) => `${API_BASE}/movies/user-preferences/${id}`,
  },

  TV: {
    TRENDING:    `${API_BASE}/tv/trending`,
    TOP_RATED:   `${API_BASE}/tv/top-rated`,
    NOW_AIRING:  `${API_BASE}/tv/now-airing`,
    SEARCH:      (q) => `${API_BASE}/tv/search?q=${encodeURIComponent(q)}`,
    DETAIL:      (id) => `${API_BASE}/tv/show/${id}`,
    USER_PREFS:  (id) => `${API_BASE}/tv/user-preferences/${id}`,
  },

  PERSONALISE: {
    MOVIES:            `${API_BASE}/personalise/movies`,
    MOVIE:             `${API_BASE}/personalise/movie`,
    CREATE_VECTOR:     `${API_BASE}/personalise/createUserVector`,
    HAS_VECTOR:        `${API_BASE}/personalise/has-vector`,
    GENRES_ID:         `${API_BASE}/personalise/genres-id`,
    LANGUAGES_ID:      `${API_BASE}/personalise/languages-id`,
  },

  MYLIST: {
    ROOT:        `${API_BASE}/mylist`,
    ADD_RATING:  `${API_BASE}/mylist/add-rating`,
    MOVIES:      (params) => `${API_BASE}/mylist?${new URLSearchParams(params).toString()}`,
  },

  ADMIN: {
    USERS:   `${API_BASE}/admin/users`,
    MOVIES:  `${API_BASE}/admin/movies`,
    STATS:   `${API_BASE}/admin/stats`,
  },

  GENRES: `${API_BASE}/movies/genres`,
  LANGUAGES: `${API_BASE}/movies/languages`,
};
