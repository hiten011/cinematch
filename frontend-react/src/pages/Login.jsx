import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../config/api';
import { ROUTES } from '../config/routes';
import { useAuth } from '../contexts/AuthContext';
import '@styles/index.css';
import '@styles/login.css';

export default function Login() {
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const login = async () => {
    try {
      await axios.post(API.AUTH.LOGIN, { username, password });
      await checkAuth();
      navigate(ROUTES.HOME);
    } catch {
      setLoginFailed(true);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') login(); };

  return (
    <main
      className="primary-bg-color-login"
      id="login-page"
      style={{ '--primary-color': '#3C8972', '--secondary-color': '#7CD1B8', '--text-color': 'white' }}
    >
      <div className="logo-home">
        <Link to={ROUTES.HOME}>CINEMATCH</Link>
      </div>

      <div className="content">
        <span>Welcome back!</span>

        <div className="input">
          <div>
            <span>Enter Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyUp={handleKey}
            />
          </div>

          <div className="input-password">
            <span>Enter Password</span>
            <div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={handleKey}
              />
              <button
                type="button"
                className={showPass ? 'hide-icon' : 'show-icon'}
                onClick={() => setShowPass((v) => !v)}
              />
            </div>
          </div>
        </div>

        <div className="login-button">
          {loginFailed && <span id="fail-login">Username or password incorrect</span>}
          <button type="button" onClick={login}>Login</button>
          <span>Don&apos;t have an account? <Link to={ROUTES.SIGNUP}>Sign up here</Link></span>
        </div>
      </div>

      <div className="login-img" />
    </main>
  );
}
