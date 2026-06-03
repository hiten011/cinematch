import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../components/NavBar';
import { API } from '../config/api';
import { ROUTES } from '../config/routes';
import '@styles/index.css';
import '@styles/nav-bar.css';
import '@styles/footer.css';
import '@styles/personalise.css';
import '@styles/personaliselang.css';

export default function Personalise() {
  const [showGenreGrid, setShowGenreGrid]       = useState(true);
  const [genres, setGenres]                     = useState([]);
  const [selectedGenres, setSelectedGenres]     = useState([]);
  const [languages, setLanguages]               = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [dropdownVisible, setDropdownVisible]   = useState(false);
  const [searchLang, setSearchLang]             = useState('');
  const [checking, setChecking]                 = useState(true);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Check if user already has a vector — if so, go straight to swipe
    axios.get(API.PERSONALISE.HAS_VECTOR)
      .then((r) => {
        if (r.data?.hasVector) navigate('/personalise/swipe', { replace: true });
        else setChecking(false);
      })
      .catch(() => setChecking(false));

    axios.get(API.GENRES).then((r) => setGenres(r.data)).catch(() => {});
    axios.get(API.LANGUAGES).then((r) => setLanguages(r.data)).catch(() => {});
  }, [navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownVisible(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const removeLanguage = (code) => {
    setSelectedLanguages((prev) => prev.filter((l) => l.code !== code));
  };

  const filterLang = searchLang
    ? languages.filter((l) => l.name.toLowerCase().includes(searchLang.toLowerCase()))
    : languages;

  const toggleLanguage = (lang) => {
    setSelectedLanguages((prev) =>
      prev.find((l) => l.code === lang.code)
        ? prev.filter((l) => l.code !== lang.code)
        : [...prev, lang]
    );
  };

  const swipePage = async () => {
    await axios.post(API.PERSONALISE.GENRES_ID, selectedGenres.map((g) => g.id));
    await axios.post(API.PERSONALISE.LANGUAGES_ID, selectedLanguages.map((l) => l.id));
    await axios.post(API.PERSONALISE.CREATE_VECTOR);
    navigate('/personalise/swipe');
  };

  if (checking) return null;

  return (
    <>
      <NavBar />
      <main className="personalise-main" id="personalise-main">
        <div>
          <section className="intro-section">
            <div className="main-title">✨YOUR MOVIE MATCHMAKER! ✨</div>
            <div className="main-subtitle">
              Swipe, match, and discover your next favorite films and shows with our personalized recommendation engine.
            </div>
          </section>
        </div>

        <section className="genreform-section">
          <div className="form-title">GETTING STARTED</div>
          <div>
            <svg width="100%" height="30" viewBox="0 10 800 20" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              <polygon points="10,10 15,15 10,20 5,15" fill="white" />
              <line x1="10" y1="15" x2="790" y2="15" stroke="white" strokeWidth="1" />
              <polygon points="790,10 795,15 790,20 785,15" fill="white" />
            </svg>
          </div>
          <div className="form-subtitle">With your CINEMATCH Experience</div>

          {showGenreGrid && (
            <section className="buttonform-section">
              <div className="genre-title">FAVOURITE GENRES</div>
              <div className="genre-grid">
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    className={`pill${selectedGenres.includes(genre) ? ' selected' : ''}`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="next-btn"
                onClick={() => setShowGenreGrid(false)}
                disabled={selectedGenres.length === 0}
              >
                Next
              </button>
            </section>
          )}

          {!showGenreGrid && (
            <section className="lang-section">
              <div className="language-select-wrapper">
                <div className="lang-title">LANGUAGES</div>
                <div className="language-label">Choose one or more languages you enjoy watching movies in</div>

                <div className="chip-list" id="chip-list">
                  {selectedLanguages.map((lang) => (
                    <div key={lang.code} className="chip">
                      {lang.name}
                      <span className="remove" onClick={() => removeLanguage(lang.code)}>&times;</span>
                    </div>
                  ))}
                </div>

                <div className="custom-dropdown" ref={dropdownRef}>
                  <div
                    className="dropdown-toggle"
                    id="dropdown-toggle"
                    onClick={() => setDropdownVisible((v) => !v)}
                  >
                    Select Languages
                  </div>

                  {dropdownVisible && (
                    <div className="dropdown-menu" id="dropdown-menu">
                      <input
                        type="text"
                        className="d-search"
                        placeholder="Search language..."
                        value={searchLang}
                        onChange={(e) => setSearchLang(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {filterLang.length === 0 && <div className="no-result">No language found</div>}
                      {filterLang.map((lang) => (
                        <label key={lang.code}>
                          <input
                            type="checkbox"
                            checked={!!selectedLanguages.find((l) => l.code === lang.code)}
                            onChange={() => toggleLanguage(lang)}
                          />
                          {lang.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="next-backbtn-styling">
                <button type="button" className="back-btn" onClick={() => setShowGenreGrid(true)}>Back</button>
                <button
                  type="button"
                  className="next-btn"
                  onClick={swipePage}
                  disabled={selectedLanguages.length === 0}
                >
                  Next
                </button>
              </div>
            </section>
          )}
        </section>
      </main>
    </>
  );
}
