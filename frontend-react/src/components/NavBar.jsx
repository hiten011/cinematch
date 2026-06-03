import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NAV_LINKS, ROUTES } from '../config/routes';
import '@styles/index.css';
import '@styles/nav-bar.css';

export default function NavBar() {
  const { isLogin, user, isDark, toggleTheme, logout } = useAuth();
  const [showMenu, setShowMenu]           = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileRef = useRef(null);
  const location   = useLocation();
  const navigate   = useNavigate();

  // Close menus on route change
  useEffect(() => {
    setShowMenu(false);
    setShowMobileMenu(false);
  }, [location.pathname]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const initials = user
    ? `${user.first_name?.[0]?.toUpperCase()}.${user.last_name?.[0]?.toUpperCase()}`
    : '';

  const profilePic = user?.profile_picture_url || '/uploads/avatar3.svg';

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  return (
    <nav className="primary-bg-color-nav-bar" id="nav-bar">
      {/* Logo */}
      <div className="logo-nav-bar secondary-bg-color-nav-bar">
        <div className="primary-bg-color-nav-bar">
          <Link to={ROUTES.HOME} className="secondary-color-nav-bar" style={{ pointerEvents: 'auto' }}>
            CINEMATCH
          </Link>
        </div>
      </div>

      {/* Nav links */}
      <div className={`nav secondary-bg-color-nav-bar${showMobileMenu ? ' open' : ''}`}>
        {NAV_LINKS.map(({ label, path }) => (
          <Link
            key={path}
            to={path}
            className={`primary-color-nav-bar${location.pathname === path ? ' underline-nav-bar' : ''}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right side: hamburger + profile */}
      <div className="login-nav-bar secondary-bg-color-nav-bar">
        <button
          className={`hamburger-btn${showMobileMenu ? ' is-open' : ''}`}
          onClick={() => setShowMobileMenu((v) => !v)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>

        <div className="primary-bg-color-nav-bar" id="profile" ref={profileRef}>
          {!isLogin ? (
            <Link
              to={ROUTES.LOGIN}
              className="primary-color-nav-bar secondary-bg-color-nav-bar"
            >
              SIGN IN/UP
            </Link>
          ) : (
            <div className="user-container-nav-bar">
              <div>Welcome, <strong>{initials}</strong>!</div>
              <img
                src={profilePic}
                alt="User avatar"
                onClick={() => setShowMenu((v) => !v)}
              />
            </div>
          )}

          {showMenu && (
            <div className="user-menu">
              <div onClick={() => navigate(ROUTES.SETTINGS)}>
                <img
                  src={isDark ? '/images/dark-mode-sett-icon.png' : '/images/light-mode-sett-icon.png'}
                  alt="settings"
                />
                Account Settings
              </div>
              {user?.role === 'admin' && (
                <div onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}>
                  <img src="/images/admin-lock-icon.png" alt="admin" />
                  Admin Dashboard
                </div>
              )}
              <div onClick={toggleTheme}>
                <img
                  src={isDark ? '/images/dark-on-icon.png' : '/images/dark-off-icon.png'}
                  alt="theme"
                />
                <span className="theme">Dark Theme</span>
              </div>
              <div onClick={handleLogout}>
                <img src="/images/logout-icon.png" alt="logout" />
                <span className="logout-nav-bar">Log out</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
