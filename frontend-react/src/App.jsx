import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './config/routes';
import PrivateRoute from './components/PrivateRoute';

import Login           from './pages/Login';
import Signup          from './pages/Signup';
import Home            from './pages/Home';
import AboutUs         from './pages/AboutUs';
import Personalise     from './pages/Personalise';
import PersonaliseSwipe from './pages/PersonaliseSwipe';
import MoviePage       from './pages/MoviePage';
import MyLists         from './pages/MyLists';
import Settings        from './pages/Settings';
import AdminDashboard  from './pages/AdminDashboard';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path={ROUTES.ROOT}     element={<Navigate to={ROUTES.HOME} replace />} />
      <Route path={ROUTES.HOME}     element={<Home />} />
      <Route path={ROUTES.LOGIN}    element={<Login />} />
      <Route path={ROUTES.SIGNUP}   element={<Signup />} />
      <Route path={ROUTES.ABOUT_US} element={<AboutUs />} />

      {/* Movie & TV detail — public, but auth-aware for saved/watched */}
      <Route path="/movie/:id" element={<MoviePage />} />
      <Route path="/tv/:id"    element={<MoviePage />} />

      {/* Auth-required routes */}
      <Route path={ROUTES.PERSONALISE} element={
        <PrivateRoute><Personalise /></PrivateRoute>
      } />
      <Route path="/personalise/swipe" element={
        <PrivateRoute><PersonaliseSwipe /></PrivateRoute>
      } />
      <Route path={ROUTES.MY_LISTS} element={
        <PrivateRoute><MyLists /></PrivateRoute>
      } />
      <Route path={ROUTES.SETTINGS} element={
        <PrivateRoute><Settings /></PrivateRoute>
      } />

      {/* Admin-only routes */}
      <Route path={ROUTES.ADMIN_DASHBOARD} element={
        <PrivateRoute adminOnly><AdminDashboard /></PrivateRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}
