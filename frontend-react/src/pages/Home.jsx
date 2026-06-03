import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import Spinner from '../components/Spinner';
import { API, API_BASE } from '../config/api';
import { ROUTES } from '../config/routes';
import '@styles/index.css';
import '@styles/nav-bar.css';
import '@styles/footer.css';
import '@styles/homepage.css';

const VISIBLE = 5;
const mod = (n, m) => ((n % m) + m) % m;

function Carousel({ items, color }) {
  const [si, setSi] = useState(0);
  const navigate    = useNavigate();
  const isTVRef     = useRef(null);

  const getSlice = () => {
    if (!items.length) return [];
    const end = mod(si + VISIBLE, items.length);
    return si < end
      ? items.slice(si, end)
      : items.slice(si).concat(items.slice(0, end));
  };

  return (
    <div className="boxes">
      <button
        type="button"
        className={color}
        onClick={() => setSi((p) => mod(p - 1, items.length))}
      >
        <svg width="53" height="52"><use xlinkHref="#arrow-left" /></svg>
      </button>

      {getSlice().map((t) => (
        <div key={t.id} onClick={() => navigate(`${t._type === 'tv' ? '/tv/' : '/movie/'}${t.id}`)}>
          <img
            src={`https://image.tmdb.org/t/p/w500/${t.poster_path}`}
            alt={t.title || t.name}
          />
          <span>{t.title || t.name}</span>
        </div>
      ))}

      <button
        type="button"
        className={color}
        onClick={() => setSi((p) => mod(p + 1, items.length))}
      >
        <svg width="53" height="52"><use xlinkHref="#arrow-right" /></svg>
      </button>
    </div>
  );
}

export default function Home() {
  const [isTVShows, setIsTVShows]         = useState(false);
  const [trending, setTrending]           = useState([]);
  const [nowPlaying, setNowPlaying]       = useState([]);
  const [topRated, setTopRated]           = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch]       = useState(false);
  const [isLoading, setIsLoading]         = useState(true);
  const navigate = useNavigate();

  const fetchAll = useCallback(async (tv) => {
    const [t, n, r] = await Promise.all([
      axios.get(tv ? API.TV.TRENDING   : API.MOVIES.TRENDING).then((r) => r.data).catch(() => []),
      axios.get(tv ? API.TV.NOW_AIRING  : API.MOVIES.NOW_PLAYING).then((r) => r.data).catch(() => []),
      axios.get(tv ? API.TV.TOP_RATED   : API.MOVIES.TOP_RATED).then((r) => r.data).catch(() => []),
    ]);
    const tag = tv ? 'tv' : 'movie';
    setTrending(t.map((x) => ({ ...x, _type: tag })));
    setNowPlaying(n.map((x) => ({ ...x, _type: tag })));
    setTopRated(r.map((x) => ({ ...x, _type: tag })));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchAll(isTVShows).finally(() => setIsLoading(false));
  }, [isTVShows, fetchAll]);

  const searchMovies = async (q) => {
    if (q.length <= 3) { setShowSearch(false); return; }
    const url = isTVShows ? API.TV.SEARCH(q) : API.MOVIES.SEARCH(q);
    const res = await axios.get(url).then((r) => r.data).catch(() => []);
    setSearchResults(res);
    setShowSearch(res.length > 0);
  };

  const focusOut = () => setTimeout(() => setShowSearch(false), 300);

  const goToMovie = (id) => {
    navigate(isTVShows ? `/tv/${id}` : `/movie/${id}`);
  };

  return (
    <>
      <NavBar />
      <div id="homepage">
        {isLoading && <Spinner />}
        {!isLoading && (
          <main>
            <section className="poster-personalise-page">
              <div className="banner">
                <div className="bg-blur" />
                <div className="text-content">
                  <h1>
                    Personalise your<br />
                    <span className="highlight-images">
                      {['W','A','T','C','H','I','N','G'].map((l) => (
                        <img key={l} src={`images/letters/${l}.png`} alt={l} />
                      ))}
                    </span><br />
                    experience today
                  </h1>
                  <a href={ROUTES.PERSONALISE} className="start-button">Start now</a>
                </div>
                <div className="characters">
                  <img src="images/chars.png" alt="harry & joe" />
                </div>
              </div>
            </section>

            <section className="middle-section">
              <span className="heading1">OR</span><br /><br />
              <span className="heading2">Browse through our collection of movies &amp; TV shows</span><br />
              <span className="heading3"><em>(Click on the thumbnails to see more details)</em></span><br /><br />
            </section>

            <section className="heading-div">
              <span className="heading1">TRENDING</span>

              <label className="switch">
                <input type="checkbox" checked={isTVShows} onChange={(e) => setIsTVShows(e.target.checked)} />
                <span className="slider">
                  <span className="toggle-text">Movies</span>
                  <span className="toggle-text">TV Shows</span>
                </span>
              </label>

              <div className="search-container" tabIndex="0" onBlur={focusOut}>
                <div className="search-container-div">
                  <img src="./images/search.png" alt="Search Icon" className="search-icon" />
                </div>
                <div className="search-container-div">
                  <input
                    type="text"
                    id="searchInput"
                    autoComplete="off"
                    onChange={(e) => searchMovies(e.target.value)}
                    placeholder="Search here..."
                  />
                </div>
                {showSearch && (
                  <div className="search-results">
                    {searchResults.map((sr) => (
                      <div key={sr.id} onClick={() => goToMovie(sr.id)}>{sr.title || sr.name}</div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <Carousel items={trending}   color="purple" />

            <div className="heading1 heading-div">TOP RATED</div>
            <Carousel items={topRated}   color="blue" />

            <div className="heading1 heading-div">{isTVShows ? 'NOW AIRING' : 'NOW PLAYING IN CINEMAS'}</div>
            <Carousel items={nowPlaying} color="green" />
          </main>
        )}
        {!isLoading && <Footer />}
      </div>

      {/* Arrow SVG symbols */}
      <svg style={{ display: 'none' }}>
        <symbol id="arrow-left" viewBox="0 0 53 52">
          <path d="M26.5 2.5C39.8 2.5 50.5 13.066 50.5 26C50.5 38.934 39.8 49.5 26.5 49.5C13.2 49.5 2.5 38.934 2.5 26C2.5 13.066 13.2 2.5 26.5 2.5Z" stroke="currentColor" strokeWidth="5" />
          <path d="M21 26.61L32.8 37.115" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <path d="M21.07 26.555L31.77 15" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </symbol>
        <symbol id="arrow-right" viewBox="0 0 53 52">
          <path d="M26.5 49.5C13.2 49.5 2.5 38.934 2.5 26C2.5 13.066 13.2 2.5 26.5 2.5C39.8 2.5 50.5 13.066 50.5 26C50.5 38.934 39.8 49.5 26.5 49.5Z" stroke="currentColor" strokeWidth="5" />
          <path d="M35.6 25.212L23.83 14.707" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <path d="M35.54 25.267L24.83 36.822" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </symbol>
      </svg>
    </>
  );
}
