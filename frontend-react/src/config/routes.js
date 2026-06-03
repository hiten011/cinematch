/**
 * Route Configuration
 * All client-side route paths live here.
 * Update this file to rename or add routes — no magic strings in components.
 */

export const ROUTES = {
  ROOT:             '/',
  HOME:             '/home',
  LOGIN:            '/login',
  SIGNUP:           '/signup',
  PERSONALISE:      '/personalise',
  MY_LISTS:         '/mylists',
  ABOUT_US:         '/aboutus',
  SETTINGS:         '/settings',
  ADMIN_DASHBOARD:  '/admin-dashboard',
  MOVIE:            (id) => `/movie/${id}`,
  TV:               (id) => `/tv/${id}`,
};

/** Nav links shown in the main navigation bar */
export const NAV_LINKS = [
  { label: 'HOME',        path: ROUTES.HOME },
  { label: 'PERSONALISE', path: ROUTES.PERSONALISE },
  { label: 'MY LISTS',    path: ROUTES.MY_LISTS },
  { label: 'ABOUT US',    path: ROUTES.ABOUT_US },
];
