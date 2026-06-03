import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../components/NavBar';
import { API } from '../config/api';
import { ROUTES } from '../config/routes';
import '@styles/index.css';
import '@styles/nav-bar.css';
import '@styles/admin-dash.css';

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

const blankUser = { user_name: '', first_name: '', last_name: '', password: '', role: 'user', profile_picture_url: '/uploads/avatar3.svg' };

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats]               = useState({ totalUsers: 0, totalActive: 0, totalContent: 0, totalVisits: 0 });
  const [users, setUsers]               = useState([]);
  const [loadLimit, setLoadLimit]       = useState(10);
  const [sort, setSort]                 = useState('');
  const [search, setSearch]             = useState('');
  const [filterRoles, setFilterRoles]   = useState([]);
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [isSelectOn, setIsSelectOn]     = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAddUser, setShowAddUser]   = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showSort, setShowSort]         = useState(false);
  const [showFilters, setShowFilters]   = useState(false);
  const [showLoadLimit, setShowLoadLimit] = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [passError, setPassError]       = useState('');
  const [uploadError, setUploadError]   = useState('');
  const [newUser, setNewUser]           = useState({ ...blankUser });
  const [editingUser, setEditingUser]   = useState({ user_id: 0, user_name: '', first_name: '', last_name: '', role: '', profile_picture_url: '', pfpPreview: null });

  const logoutTimer = useRef(null);

  const resetLogoutTimer = () => {
    clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(() => {
      axios.post(API.AUTH.LOGOUT).catch(() => {});
      navigate(ROUTES.HOME);
      alert('You were logged out due to inactivity.');
    }, 180000);
  };

  useEffect(() => {
    resetLogoutTimer();
    document.addEventListener('mousemove', resetLogoutTimer);
    document.addEventListener('keypress', resetLogoutTimer);
    document.addEventListener('click', resetLogoutTimer);
    return () => {
      clearTimeout(logoutTimer.current);
      document.removeEventListener('mousemove', resetLogoutTimer);
      document.removeEventListener('keypress', resetLogoutTimer);
      document.removeEventListener('click', resetLogoutTimer);
    };
  }, []);

  const buildUrl = (page = currentPage) => {
    const params = new URLSearchParams({ page, limit: loadLimit });
    if (sort) params.set('sort', sort + '.asc');
    filterRoles.forEach((r) => params.append('role', r));
    if (search) params.set('username', search);
    return `${API.ADMIN.USERS}?${params}`;
  };

  const fetchUsers = async (url = buildUrl()) => {
    const res = await axios.get(url).then((r) => r.data).catch(() => null);
    if (!res) return;
    setUsers(res.users || []);
    setTotalPages(res.total_pages || 1);
  };

  const fetchStats = async () => {
    const data = await axios.get(API.ADMIN.STATS).then((r) => r.data).catch(() => ({}));
    setStats({
      totalUsers:   data.total_users   || 0,
      totalActive:  data.total_active  || 0,
      totalContent: data.total_movies  || 0,
      totalVisits:  data.total_visits  || 0,
    });
  };

  useEffect(() => { fetchStats(); fetchUsers(API.ADMIN.USERS); }, []);
  useEffect(() => { fetchUsers(); }, [sort, currentPage, loadLimit, filterRoles, search]);

  const toggleRole = (role) => {
    setFilterRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  };

  const toggleSelect = () => {
    setIsSelectOn((v) => !v);
    if (isSelectOn) setSelectedUsers([]);
  };

  const selectUser = (id) => {
    setSelectedUsers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const addUser = async () => {
    if (Object.values(newUser).some((v) => !v)) { alert('Please fill all fields.'); return; }
    const req = validatePass(newUser.password);
    if (!Object.values(req).every(Boolean)) { setPassError('Password did not meet requirements'); return; }
    try {
      const res = await axios.post(API.ADMIN.USERS, {
        username: newUser.user_name, password: newUser.password,
        firstName: newUser.first_name, lastName: newUser.last_name, role: newUser.role,
      });
      setUsers((prev) => [...prev, { user_id: res.data.user_id, ...newUser, registration_date: new Date().toISOString(), last_login: 'Not active' }]);
      setNewUser({ ...blankUser }); setShowAddUser(false); setPassError(''); setUploadError('');
    } catch (e) {
      if (e.response?.status === 409) alert('Username already exists.'); else alert('Failed to add user.');
    }
  };

  const editUser = (user) => {
    setEditingUser({ ...user, pfpPreview: user.profile_picture_url });
    setShowEditUser(true);
  };

  const saveEdits = async () => {
    const orig = users.find((u) => u.user_id === editingUser.user_id);
    if (!orig) return;
    const updates = {};
    if (editingUser.first_name  !== orig.first_name)  updates.firstName           = editingUser.first_name;
    if (editingUser.last_name   !== orig.last_name)   updates.lastName            = editingUser.last_name;
    if (editingUser.user_name   !== orig.user_name)   updates.userName            = editingUser.user_name;
    if (editingUser.role        !== orig.role)        updates.role                = editingUser.role;
    if (editingUser.profile_picture_url !== orig.profile_picture_url) updates.profile_picture_url = editingUser.profile_picture_url;
    const res = await axios.put(`/api/admin/users/${orig.user_id}`, updates).then((r) => r.data).catch(() => ({}));
    if (res.msg === 'User updated') {
      setUsers((prev) => prev.map((u) => u.user_id === orig.user_id ? { ...u, ...updates, first_name: updates.firstName || u.first_name, last_name: updates.lastName || u.last_name, user_name: updates.userName || u.user_name, profile_picture_url: editingUser.profile_picture_url } : u));
    } else { alert('Failed to update user.'); }
    setShowEditUser(false);
  };

  const deleteUsers = async () => {
    if (!selectedUsers.length) { alert('No users selected.'); return; }
    if (!confirm('Delete selected users?')) return;
    const res = await axios.post('/api/admin/users/delete-multiple', { user_ids: selectedUsers }).then((r) => r.data).catch(() => ({}));
    if (res.deleted_ids) {
      setUsers((prev) => prev.filter((u) => !res.deleted_ids.includes(u.user_id)));
      setSelectedUsers([]); setIsSelectOn(false);
    } else alert(res.msg || 'Failed to delete.');
  };

  const imageUpload = async (e, isEditing) => {
    const file = e.target.files[0];
    setUploadError('');
    if (!file) return;
    if (!['image/jpg','image/jpeg','image/png'].includes(file.type)) { setUploadError('Please upload a JPG/JPEG/PNG'); return; }
    if (file.size > 1024 * 1024) { setUploadError('Max 1MB'); return; }
    if (!isEditing) { setUploadError('Upload only available when editing a user.'); return; }
    const form = new FormData();
    form.append('profile_picture', file);
    try {
      const res = await axios.post(`/api/admin/users/${editingUser.user_id}/profile-picture`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditingUser((u) => ({ ...u, pfpPreview: res.data.profile_picture_url, profile_picture_url: res.data.profile_picture_url }));
    } catch { setUploadError('Upload failed.'); }
  };

  const selectAv = (avatar, isEditing) => {
    const url = avatar ? `/uploads/${avatar}.svg` : '/uploads/avatar3.svg';
    if (isEditing) setEditingUser((u) => ({ ...u, profile_picture_url: url, pfpPreview: url }));
    else setNewUser((u) => ({ ...u, profile_picture_url: url }));
  };

  const helperPfp = (url) => {
    if (!url) return 'None';
    return url.includes('avatar') ? `Avatar ${url.match(/\d+/)?.[0] || ''}` : 'Uploaded Image';
  };

  const visiblePages = (() => {
    const pages = [];
    const start = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
    for (let i = start; i < start + 3 && i <= totalPages; i++) pages.push(i);
    return pages;
  })();

  return (
    <>
      <NavBar />
      <main id="admin-dash">
        <h1>Admin Dashboard</h1>

        <div className="stats">
          {[
            { icon: 'images/users-reg.svg', num: stats.totalUsers,   label: 'total users\nregistered',        dark: true },
            { icon: 'images/timeline.svg',  num: stats.totalActive,  label: 'active users in\nlast 24 hours',  dark: false },
            { icon: 'images/movies-saved.svg', num: stats.totalContent, label: 'total movies\nstored',         dark: true },
            { icon: 'images/site-views.svg', num: stats.totalVisits,  label: 'total visits to\nthe site',      dark: false },
          ].map(({ icon, num, label, dark }) => (
            <div key={label} className="stat-card">
              <div className="stat-icon">
                <img src={icon} alt="" />
                <div className={`stat-num${dark ? ' dark' : ''}`}>{num}</div>
              </div>
              <p>{label.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</p>
            </div>
          ))}
        </div>

        <div className="user-section">
          <div className="header-row">
            <h2>User list</h2>
            <div className="controls-row">
              <button type="button" className={`control${isSelectOn ? ' active' : ''}`} onClick={toggleSelect}>
                {isSelectOn ? 'Cancel' : 'Select users'}
              </button>

              <div className="dropdown">
                <button type="button" className="control filter" onClick={() => setShowFilters((v) => !v)}>Add filter</button>
                {showFilters && (
                  <div className="dd-menu" onClick={(e) => e.stopPropagation()}>
                    {['user','admin'].map((role) => (
                      <div key={role} className={`dd-option${filterRoles.includes(role) ? ' selected' : ''}`} onClick={() => toggleRole(role)}>
                        {role === 'user' ? 'Users only' : 'Admins only'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dropdown">
                <button type="button" className="control sort" onClick={() => setShowSort((v) => !v)}>
                  Sort by <span className={`dd-arrow${showSort ? ' open' : ''}`}>▼</span>
                </button>
                {showSort && (
                  <div className="dd-menu" onClick={(e) => e.stopPropagation()}>
                    {[
                      { val: 'user_name',         label: 'Username' },
                      { val: 'first_name',         label: 'First Name' },
                      { val: 'last_name',          label: 'Last Name' },
                      { val: 'registration_date',  label: 'Date Joined' },
                      { val: 'last_login',         label: 'Last Active' },
                    ].map(({ val, label }) => (
                      <div key={val} className={`dd-option${sort === val ? ' selected' : ''}`} onClick={() => { setSort(val); setShowSort(false); }}>
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input className="control search" type="text" placeholder="Search user..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <button type="button" className="control" onClick={() => setShowAddUser(true)}>Add new</button>
            </div>
          </div>

          {/* Add User Card */}
          {showAddUser && (
            <div className="card-overlay">
              <div className="card">
                <h3>Add New User</h3>
                {[
                  { label: 'Username:',   id: 'new-username',  key: 'user_name' },
                  { label: 'First Name:', id: 'new-firstname', key: 'first_name' },
                  { label: 'Last Name:',  id: 'new-lastname',  key: 'last_name' },
                ].map(({ label, id, key }) => (
                  <div key={id} className="form">
                    <label htmlFor={id}>{label}</label>
                    <input type="text" id={id} value={newUser[key]} onChange={(e) => setNewUser((u) => ({ ...u, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="form">
                  <label htmlFor="new-pass">Password:</label>
                  <div className="pass-info">
                    <input type={showPass ? 'text' : 'password'} id="new-pass" value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} />
                    <button type="button" onClick={() => setShowPass((v) => !v)} className={showPass ? 'hide-icon' : 'show-icon'} />
                    <button type="button" className="info-icon" />
                    <div className="tooltip">Password must be 8-16 characters, including a number, an UPPERCASE + a lowercase letter, and a special character.</div>
                  </div>
                  {passError && <p className="error-message">{passError}</p>}
                </div>
                <div className="form">
                  <label htmlFor="new-role">Role:</label>
                  <select id="new-role" value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}>
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="card-controls">
                  <button type="button" className="control" onClick={() => { setNewUser({ ...blankUser }); setShowAddUser(false); setPassError(''); }}>Cancel</button>
                  <button type="button" className="control" onClick={addUser}>Confirm</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit User Card */}
          {showEditUser && (
            <div className="card-overlay">
              <div className="card">
                <h3>Edit User</h3>
                <div className="av-preview">
                  {editingUser.pfpPreview
                    ? <img src={editingUser.pfpPreview} alt="Avatar" />
                    : <img src="./images/settings/dummy-upload.svg" alt="Empty Avatar" />}
                </div>
                {[
                  { label: 'Username:',   id: 'edit-username',  key: 'user_name' },
                  { label: 'First Name:', id: 'edit-firstname', key: 'first_name' },
                  { label: 'Last Name:',  id: 'edit-lastname',  key: 'last_name' },
                ].map(({ label, id, key }) => (
                  <div key={id} className="form">
                    <label htmlFor={id}>{label}</label>
                    <input type="text" id={id} value={editingUser[key]} onChange={(e) => setEditingUser((u) => ({ ...u, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="form">
                  <label htmlFor="edit-role">Role:</label>
                  <select id="edit-role" value={editingUser.role} onChange={(e) => setEditingUser((u) => ({ ...u, role: e.target.value }))}>
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="form">
                  <label>Avatar:</label>
                  <div className="av-options">
                    <input type="file" onChange={(e) => imageUpload(e, true)} />
                    <span>or</span>
                    <select onChange={(e) => selectAv(e.target.value, true)}>
                      <option value="">Select avatar</option>
                      {[1,2,3,4,5].map((n) => <option key={n} value={`avatar${n}`}>Avatar {n}{n === 3 ? ' (default)' : ''}</option>)}
                    </select>
                  </div>
                  {uploadError && <p className="error-message">{uploadError}</p>}
                </div>
                <div className="card-controls">
                  <button type="button" className="control" onClick={() => setShowEditUser(false)}>Cancel</button>
                  <button type="button" className="control" onClick={saveEdits}>Save Changes</button>
                </div>
              </div>
            </div>
          )}

          <table className="user-table">
            <thead>
              <tr>
                <th>Username</th><th>First name</th><th>Last name</th>
                <th>Date joined</th><th>Role</th><th>Last Active</th><th>Profile picture</th>
              </tr>
            </thead>
            <tbody>
              <tr><td /><td /><td /><td /><td /><td /></tr>
              {users.map((u) => (
                <tr key={u.user_name}>
                  <td>
                    <div className="checkbox-col">
                      {isSelectOn && (
                        <input type="checkbox" checked={selectedUsers.includes(u.user_id)} onChange={() => selectUser(u.user_id)} disabled={u.role === 'admin'} />
                      )}
                      <span className="username" onClick={() => editUser(u)}>{u.user_name}</span>
                    </div>
                  </td>
                  <td>{u.first_name}</td>
                  <td>{u.last_name}</td>
                  <td>{new Date(u.registration_date).toLocaleDateString('en-GB')}</td>
                  <td>
                    <span className={`role-pill${u.role === 'admin' ? ' admin' : ' user'}`}>
                      <span className="circle" /> {u.role === 'admin' ? 'Administrator' : 'User'}
                    </span>
                  </td>
                  <td>{new Date(u.last_login).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                  <td><a className="fancy-link" href={u.profile_picture_url} target="_blank" rel="noopener noreferrer">{helperPfp(u.profile_picture_url)}</a></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-footer">
            <div className="load-limit-dd">
              <div className="dropdown">
                <button type="button" className="control load" onClick={() => setShowLoadLimit((v) => !v)}>
                  Load limit = {loadLimit} <span className={`dd-arrow${showLoadLimit ? ' open' : ''}`}>▼</span>
                </button>
                {showLoadLimit && (
                  <div className="dd-menu" onClick={(e) => e.stopPropagation()}>
                    {[10, 25, 50, 100].map((lim) => (
                      <div key={lim} className="dd-option" onClick={() => { setLoadLimit(lim); setShowLoadLimit(false); }}>
                        Load limit = {lim}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="page-controls">
              {isSelectOn && (
                <button type="button" className="control" disabled={selectedUsers.length === 0} onClick={deleteUsers}>Delete Selected</button>
              )}
              <button type="button" className="control" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>←</button>
              {visiblePages.map((p) => (
                <button key={p} type="button" className={`control${p === currentPage ? ' active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
              ))}
              <button type="button" className="control" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>→</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
