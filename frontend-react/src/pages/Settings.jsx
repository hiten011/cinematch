import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API } from '../config/api';
import { ROUTES } from '../config/routes';
import '@styles/index.css';
import '@styles/settings.css';

const AVATARS = [
  { id: 1, src: '/uploads/avatar1.svg' },
  { id: 2, src: '/uploads/avatar2.svg' },
  { id: 3, src: '/uploads/avatar3.svg' },
  { id: 4, src: '/uploads/avatar4.svg' },
  { id: 5, src: '/uploads/avatar5.svg' },
];

function validatePass(p) {
  return {
    length:    p.length >= 8 && p.length <= 16,
    uppercase: /[A-Z]/.test(p),
    lowercase: /[a-z]/.test(p),
    number:    /[0-9]/.test(p),
    special:   /[!_@#$%^&*(),?":{}|<>]/.test(p),
    noSpaces:  !/\s/.test(p) && !p.includes('.') && p.length > 0,
  };
}

export default function Settings() {
  const navigate       = useNavigate();
  const { logout, toggleTheme, isDark } = useAuth();

  const [user, setUser]             = useState({ firstName: '', lastName: '', userName: '', profilePic: '' });
  const [isAdmin, setIsAdmin]       = useState(false);
  const [isOnlyAdmin, setIsOnlyAdmin] = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [popup, setPopup]           = useState({ show: false, text: '' });

  // Name change
  const [newFirst, setNewFirst]     = useState('');
  const [newLast, setNewLast]       = useState('');
  const [namePass, setNamePass]     = useState('');
  const [namePassErr, setNamePassErr] = useState(false);

  // Password change
  const [curPass, setCurPass]       = useState('');
  const [newPass, setNewPass]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMatch, setPassMatch]   = useState(true);
  const [passError, setPassError]   = useState('');
  const [passReq, setPassReq]       = useState({ length: false, uppercase: false, lowercase: false, number: false, special: false, noSpaces: false });

  // Delete account
  const [delPass, setDelPass]       = useState('');
  const [delPassErr, setDelPassErr] = useState(false);

  // Avatar
  const [currAvIdx, setCurrAvIdx]   = useState(2);
  const [selectedAv, setSelectedAv] = useState(null);
  const [uploadedImage, setUploaded] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Preferences
  const [languages, setLanguages]   = useState([]);
  const [genres, setGenres]         = useState([]);
  const [selectedTheme, setTheme]   = useState('dark');
  const [searchLang, setSearchLang] = useState('');
  const [dropdowns, setDropdowns]   = useState({ theme: false, languages: false, genres: false });

  const popupTimer = useRef(null);

  const showPopup = (text) => {
    clearTimeout(popupTimer.current);
    setPopup({ show: true, text });
    popupTimer.current = setTimeout(() => setPopup({ show: false, text: '' }), 2500);
  };

  useEffect(() => {
    const init = async () => {
      const [prefs, userData] = await Promise.all([
        axios.get('/api/users/languages-genres').then((r) => r.data).catch(() => ({})),
        axios.get(API.USERS.ME).then((r) => r.data).catch(() => ({})),
      ]);
      const [allGenres, allLangs] = await Promise.all([
        axios.get(API.GENRES).then((r) => r.data).catch(() => []),
        axios.get(API.LANGUAGES).then((r) => r.data).catch(() => []),
      ]);

      const favGenres = prefs.favorite_genres || [];
      const prefLangs = prefs.preferred_languages || [];

      setGenres(allGenres.map((g) => ({ ...g, selected: favGenres.includes(g.name) })));
      setLanguages(allLangs.map((l) => ({ ...l, selected: prefLangs.includes(l.code) })));

      setUser({
        firstName: (userData.first_name || '').toUpperCase(),
        lastName:  (userData.last_name  || '').toUpperCase(),
        userName:  userData.user_name || '',
        profilePic: userData.profile_picture_url || '',
      });
      const theme = (userData.theme || 'dark').toLowerCase();
      setTheme(theme);
      setIsAdmin(userData.role === 'admin');

      if (userData.role === 'admin') {
        const adminUsers = await axios.get(API.ADMIN.USERS).then((r) => r.data).catch(() => ({ users: [] }));
        const adminCount = (adminUsers.users || []).filter((u) => u.role === 'admin').length;
        setIsOnlyAdmin(adminCount <= 1);
      }

      // Set initial avatar
      const idx = AVATARS.findIndex((a) => a.src === userData.profile_picture_url);
      if (idx !== -1) {
        setSelectedAv(AVATARS[idx]);
        setCurrAvIdx(idx);
      } else if (userData.profile_picture_url) {
        setUploaded(userData.profile_picture_url);
        setSelectedAv({ src: userData.profile_picture_url, isUploaded: true });
      }
    };
    init();
  }, []);

  useEffect(() => {
    setPassReq(validatePass(newPass));
    if (newPass && confirmPass) setPassMatch(newPass === confirmPass);
  }, [newPass, confirmPass]);

  const changeName = async () => {
    if (!newFirst.trim() || !newLast.trim() || !namePass.trim()) return;
    try {
      await axios.put(API.USERS.ME, { first_name: newFirst, last_name: newLast, password: namePass });
      showPopup('Name updated successfully');
      setUser((u) => ({ ...u, firstName: newFirst.toUpperCase(), lastName: newLast.toUpperCase() }));
      setNewFirst(''); setNewLast(''); setNamePass(''); setNamePassErr(false);
    } catch {
      setNamePass(''); setNamePassErr(true);
    }
  };

  const changePassword = async () => {
    if (!curPass || !newPass || !confirmPass || !passMatch || curPass === newPass) return;
    try {
      await axios.post('/api/auth/change-password', { current_password: curPass, new_password: newPass });
      showPopup('Password changed successfully');
      setCurPass(''); setNewPass(''); setConfirmPass(''); setPassMatch(true); setPassError('');
    } catch (e) {
      setPassError(e.response?.data?.msg || '');
      setPassMatch(false);
    }
  };

  const deleteAccount = async () => {
    if (!delPass.trim() || isOnlyAdmin) return;
    try {
      await axios.delete(API.USERS.ME, { data: { password: delPass } });
      navigate(ROUTES.HOME);
    } catch {
      setDelPassErr(true);
    }
  };

  const doLogout = async () => {
    await logout();
    navigate(ROUTES.HOME);
  };

  const selectTheme = (theme) => {
    setTheme(theme);
    localStorage.setItem('theme', theme);
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
    axios.post(API.USERS.THEME, { theme }).catch(() => {});
    setDropdowns((d) => ({ ...d, theme: false }));
  };

  const toggleLanguage = (id) => {
    setLanguages((prev) => {
      const updated = prev.map((l) => l.id === id ? { ...l, selected: !l.selected } : l);
      const ids = updated.filter((l) => l.selected).map((l) => l.id);
      axios.post(API.PERSONALISE.LANGUAGES_ID, ids).catch(() => {});
      return updated;
    });
  };

  const toggleGenre = (id) => {
    setGenres((prev) => {
      const updated = prev.map((g) => g.id === id ? { ...g, selected: !g.selected } : g);
      const ids = updated.filter((g) => g.selected).map((g) => g.id);
      axios.post(API.PERSONALISE.GENRES_ID, ids).catch(() => {});
      return updated;
    });
  };

  const getAvatars = () => {
    return [-2,-1,0,1,2].map((offset) => {
      const idx = ((currAvIdx + offset) % AVATARS.length + AVATARS.length) % AVATARS.length;
      return { ...AVATARS[idx], isSelected: offset === 0, isLarge: Math.abs(offset) === 1 };
    });
  };

  const isCurrAvSelected = () => {
    if (!selectedAv) return false;
    return selectedAv.src === AVATARS[currAvIdx].src && !selectedAv.isUploaded;
  };

  const isUploadAvSelected = () => {
    if (!selectedAv || !uploadedImage) return false;
    return selectedAv.isUploaded && selectedAv.src === uploadedImage;
  };

  const selectAv = () => {
    if (isCurrAvSelected()) return;
    const av = AVATARS[currAvIdx];
    setSelectedAv(av);
    axios.post('/api/users/me/profile-avatar', { id: av.id }).catch(() => {});
    showPopup('Avatar updated successfully');
  };

  const fileUpload = (e) => {
    const file = e.target.files[0];
    setUploadError('');
    if (!file) return;
    if (!['image/jpg','image/jpeg','image/png'].includes(file.type)) {
      setUploadError('Please upload a JPG/JPEG/PNG file'); return;
    }
    if (file.size > 1024 * 1024) {
      setUploadError('Max file size allowed is 1MB'); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setUploaded(ev.target.result);
    reader.readAsDataURL(file);
  };

  const selectUpload = async () => {
    if (!uploadedImage || isUploadAvSelected()) return;
    try {
      const blob = await (await fetch(uploadedImage)).blob();
      const form = new FormData();
      form.append('profile_picture', blob, 'avatar.png');
      const res = await axios.post(API.USERS.UPLOAD_PIC, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSelectedAv({ src: res.data.profile_picture_url, isUploaded: true });
      showPopup('Avatar updated successfully');
    } catch (e) {
      setUploadError(e.response?.data?.msg || 'Upload error');
    }
  };

  const isChangeNameValid  = newFirst.trim() && newLast.trim() && namePass.trim();
  const isChangePassValid  = curPass && newPass && confirmPass && passMatch && curPass !== newPass;
  const isDeleteAccValid   = delPass.trim() !== '';
  const filterLang = searchLang ? languages.filter((l) => l.name.toLowerCase().includes(searchLang.toLowerCase())) : languages;

  const checkMatch = !newPass || !confirmPass || newPass === confirmPass;

  return (
    <div id="settings">
      <div className={`popup${popup.show ? ' show' : ''}`}>{popup.text}</div>

      <div className="esc">
        <button type="button" onClick={() => navigate(ROUTES.HOME)} />
        <p>ESC</p>
      </div>

      <div className="sidebar">
        <div className="sidebar-icon"><a href="#acc"     className="icon-img acc-icon"     aria-label="Account" /></div>
        <div className="sidebar-icon"><a href="#profile" className="icon-img profile-icon" aria-label="Profile" /></div>
        <div className="sidebar-icon"><a href="#pref"    className="icon-img pref-icon"    aria-label="Preferences" /></div>
        <div className="sidebar-icon logout" onClick={doLogout}>
          <a href="#logout" className="icon-img logout-icon" aria-label="Logout" />
        </div>
      </div>

      <div className="container">
        <h1 id="acc">Account Settings</h1>
        <div className="row">
          {/* Change Name */}
          <div className="card change-name">
            <h2 className="card-title">Change name</h2>
            <p className="info-text">Current name: <span>{user.firstName} {user.lastName}</span></p>
            <input type="text" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} placeholder="Enter new first name..." className="input-field changename-input-border" onKeyUp={(e) => e.key === 'Enter' && isChangeNameValid && changeName()} />
            <input type="text" value={newLast}  onChange={(e) => setNewLast(e.target.value)}  placeholder="Enter new last name..."  className="input-field changename-input-border" onKeyUp={(e) => e.key === 'Enter' && isChangeNameValid && changeName()} />
            <input type={showPass ? 'text' : 'password'} value={namePass} onChange={(e) => setNamePass(e.target.value)} placeholder="Enter your password..." className="input-field changename-input-border" onKeyUp={(e) => e.key === 'Enter' && isChangeNameValid && changeName()} />
            {namePassErr && <p className="error-message">Incorrect Password</p>}
            <button type="button" className="confirm" onClick={changeName} disabled={!isChangeNameValid}>Done</button>
          </div>

          {/* Change Password */}
          <div className="card change-password">
            <h2 className="card-title">Change password</h2>
            <input type={showPass ? 'text' : 'password'} value={curPass}     onChange={(e) => setCurPass(e.target.value)}     placeholder="Enter current password..." className="input-field changepassword-input-border" onKeyUp={(e) => e.key === 'Enter' && isChangePassValid && changePassword()} />
            <input type={showPass ? 'text' : 'password'} value={newPass}     onChange={(e) => setNewPass(e.target.value)}     placeholder="Enter new password..."     className="input-field changepassword-input-border" onKeyUp={(e) => e.key === 'Enter' && isChangePassValid && changePassword()} />
            <input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Confirm new password..."    className="input-field changepassword-input-border" onKeyUp={(e) => e.key === 'Enter' && isChangePassValid && changePassword()} />
            {!checkMatch && <p className="error-message">Passwords do not match</p>}
            {!passMatch && passError !== 'Current password is incorrect' && <p className="error-message">New password didn&apos;t meet requirements</p>}
            {curPass && newPass && curPass === newPass && <p className="error-message">New password can&apos;t be same as current password</p>}
            {!passMatch && passError === 'Current password is incorrect' && <p className="error-message">Current password is incorrect</p>}
            <button type="button" className="confirm" onClick={changePassword} disabled={!isChangePassValid}>Done</button>
          </div>
        </div>

        <div className="show-hide-pass">
          <button type="button" onClick={() => setShowPass((v) => !v)} className={showPass ? 'hide-icon' : 'show-icon'} />
        </div>

        <div className="row">
          {/* Delete Account */}
          <div className={`card delete-account${isOnlyAdmin ? ' disabled' : ''}`}>
            <h2 className="card-title">Delete account</h2>
            <p className="info-text">IMPORTANT!<br />This action cannot be undone</p>
            <input type={showPass ? 'text' : 'password'} value={delPass} onChange={(e) => setDelPass(e.target.value)} placeholder="Enter your password..." disabled={isOnlyAdmin} className="input-field del-account-input-border" onKeyUp={(e) => e.key === 'Enter' && !isOnlyAdmin && isDeleteAccValid && deleteAccount()} />
            {delPassErr  && <p className="error-message">Incorrect Password</p>}
            {isOnlyAdmin && <p className="error-message">Cannot delete account as you are the only admin</p>}
            <button type="button" className="confirm" onClick={deleteAccount} disabled={isOnlyAdmin || !isDeleteAccValid}>Done</button>
          </div>

          {/* Password Check */}
          <div className="card password-check">
            <h2 className="card-title">Password check</h2>
            <p className="info-text">Your new password must have :</p>
            <div className="req-tags">
              {[
                { key: 'length',    label: '8 - 16 characters' },
                { key: 'uppercase', label: 'at least 1 UPPERCASE character' },
                { key: 'lowercase', label: 'at least 1 lowercase character' },
                { key: 'number',    label: 'at least 1 number' },
                { key: 'noSpaces',  label: 'no empty space or period' },
                { key: 'special',   label: 'at least 1 special character' },
              ].map(({ key, label }) => (
                <span key={key} className={`input-field${passReq[key] ? ' valid' : ' invalid'}`}>{label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <h1 id="profile" className="h1profile">Profile Settings</h1>
        <div className="select-avatar">
          <div className="av-row">
            {getAvatars().map((av, i) => (
              <div key={i} className={`slot${!av.src ? ' empty' : ''}${av.isLarge ? ' large' : ''}${av.isSelected ? ' selected' : ''}`}>
                {av.src && <img src={av.src} alt={`Avatar ${av.id}`} />}
              </div>
            ))}
          </div>
          <div className="av-controls">
            <button type="button" className="av-button prev" onClick={() => setCurrAvIdx((i) => (i - 1 + AVATARS.length) % AVATARS.length)} />
            <button type="button" className={`select-button${isCurrAvSelected() ? ' selected' : ''}`} onClick={selectAv}>
              {isCurrAvSelected() ? 'Selected' : 'Select this avatar'}
            </button>
            <button type="button" className="av-button next" onClick={() => setCurrAvIdx((i) => (i + 1) % AVATARS.length)} />
          </div>
        </div>

        <div className="upload-avatar">
          <div className="upload-section">
            <input type="file" id="av-upload" accept=".jpg,.jpeg,.png" onChange={fileUpload} style={{ display: 'none' }} />
            <label htmlFor="av-upload" className="upload-button">Upload my own</label>
            {uploadError && <p className="error-message">{uploadError}</p>}
          </div>
          <div className="preview">
            <p>Preview</p>
            <div className="preview-av">
              {uploadedImage
                ? <img src={uploadedImage} alt="Preview Avatar" />
                : <img src="images/settings/dummy-upload.svg" alt="Preview Avatar" />}
            </div>
            {uploadedImage && (
              <button type="button" className={`select-button${isUploadAvSelected() ? ' selected' : ''}`} onClick={selectUpload}>
                {isUploadAvSelected() ? 'Selected' : 'Select my image'}
              </button>
            )}
          </div>
        </div>

        {/* Preferences */}
        <h1 id="pref">Preferences</h1>
        <div className="preferences">
          {/* Theme */}
          <div className="dropdown">
            <div className="d-placeholder" onClick={() => setDropdowns((d) => ({ ...d, theme: !d.theme }))} tabIndex="0" role="button">
              <span>Change theme</span>
              <span className={`d-arrow${dropdowns.theme ? ' open' : ''}`}>▼</span>
            </div>
            {dropdowns.theme && (
              <div className="d-content show">
                {['light','dark'].map((t) => (
                  <div key={t} className="d-option" onClick={() => selectTheme(t)} tabIndex="0" role="button">
                    <div className={`checkbox circle${selectedTheme === t ? ' checked' : ''}`} />
                    <span className="option-text">{t.charAt(0).toUpperCase() + t.slice(1)} theme</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="dropdown">
            <div className="d-placeholder" onClick={() => setDropdowns((d) => ({ ...d, languages: !d.languages }))} tabIndex="0" role="button">
              <span>Select movie languages</span>
              <span className={`d-arrow${dropdowns.languages ? ' open' : ''}`}>▼</span>
            </div>
            {dropdowns.languages && (
              <div className="d-content show">
                <input type="text" value={searchLang} onChange={(e) => setSearchLang(e.target.value)} className="d-search" placeholder="Search language..." onClick={(e) => e.stopPropagation()} />
                {filterLang.length === 0 && <div className="no-result">No language found</div>}
                <div className="lang-results">
                  {filterLang.map((l) => (
                    <div key={l.id} className="d-option" onClick={() => toggleLanguage(l.id)} tabIndex="0" role="button">
                      <div className={`checkbox${l.selected ? ' checked' : ''}`} />
                      <span className="option-text">{l.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Genres */}
          <div className="dropdown">
            <div className="d-placeholder" onClick={() => setDropdowns((d) => ({ ...d, genres: !d.genres }))} tabIndex="0" role="button">
              <span>Search movie genres</span>
              <span className={`d-arrow${dropdowns.genres ? ' open' : ''}`}>▼</span>
            </div>
            {dropdowns.genres && (
              <div className="d-content genre show">
                {genres.map((g) => (
                  <div key={g.id} className={`d-option${g.selected ? ' selected' : ''}`} onClick={() => toggleGenre(g.id)} tabIndex="0" role="button">
                    <div className={`checkbox${g.selected ? ' checked' : ''}`} />
                    <span className="option-text">{g.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
