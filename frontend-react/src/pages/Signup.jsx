import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../config/api';
import { ROUTES } from '../config/routes';
import '@styles/index.css';
import '@styles/signup.css';

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [message, setMessage]     = useState('Unexpected error');
  const [failed, setFailed]       = useState(false);
  const navigate = useNavigate();

  const signup = async () => {
    try {
      const res = await axios.post(API.AUTH.SIGNUP, {
        username,
        password,
        firstName,
        lastName,
      });
      if (res.status === 200 || res.status === 201) {
        navigate(ROUTES.LOGIN);
      }
    } catch (e) {
      setMessage(e.response?.data?.msg || 'Unexpected error');
      setFailed(true);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') signup(); };

  return (
    <main
      className="primary-bg-color-signup"
      id="signup-page"
      style={{ '--primary-color': '#3B699A', '--secondary-color': '#8EC2FF', '--text-color': 'white' }}
    >
      <div className="signup-img" />

      <div className="content">
        <span>Ready to join in?</span>

        <div className="input">
          <div>
            <div className="input-div">
              <span>First Name</span>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} onKeyUp={handleKey} />
            </div>
            <div className="input-div">
              <span>Last Name</span>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} onKeyUp={handleKey} />
            </div>
          </div>

          <div>
            <div className="input-div">
              <span>Username</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} onKeyUp={handleKey} />
            </div>
            <div className="input-div">
              <span>Create Password</span>
              <div className="pass-info">
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={handleKey} />
                <button type="button" className="info-icon" />
                <div className="tooltip">
                  Password must be 8-16 characters, including a number, an UPPERCASE + a lowercase letter, and a special character.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="signup-button">
          {failed && <span id="fail-signup">{message}</span>}
          <button type="submit" onClick={signup}>Sign up</button>
          <span>Have an account already? <Link to={ROUTES.LOGIN}>Login here</Link></span>
        </div>
      </div>
    </main>
  );
}
