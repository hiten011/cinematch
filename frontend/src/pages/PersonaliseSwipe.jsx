import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import Spinner from '../components/Spinner';
import { API } from '../config/api';
import '@styles/index.css';
import '@styles/nav-bar.css';
import '@styles/personaliseswipe.css';

function formatRuntime(mins) {
  if (!mins) return 'N/A';
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`;
}
function formatGenres(genres) {
  if (!genres?.length) return 'N/A';
  return genres.map((g) => g.name).join(' · ');
}
function formatImdbRating(r) { return r ? `${r} / 10` : 'N/A'; }
function formatRottenRating(r) { return r ? `${r}%` : 'N/A'; }
function formatTitle(title) {
  if (!title) return 'N/A';
  return title.length > 18 ? title.substring(0, 15) + '...' : title;
}

export default function PersonaliseSwipe() {
  const [movies, setMovies]       = useState([]);
  const [movie, setMovie]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved]     = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const middleBoxRef = useRef(null);

  const topProvider = (() => {
    const providers = movie?.watch_providers || [];
    if (!providers.length) return [];
    return [...providers].sort((a, b) => a.display_priority - b.display_priority).slice(0, 2);
  })();

  const hasProvider = topProvider.length > 0;

  const appendMovie = async () => {
    try {
      const res = await axios.get(API.PERSONALISE.MOVIES);
      const ids = Array.isArray(res.data?.movieIds) ? res.data.movieIds : [];
      if (!ids.length) return;
      const results = await Promise.allSettled(
        ids.map((id) => axios.get(API.MOVIES.DETAIL(id)).then((r) => r.data).catch(() => null))
      );
      const newMovies = results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
      setMovies((prev) => [...prev, ...newMovies]);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    appendMovie().then(() => {
      setMovies((prev) => {
        if (prev.length > 0) {
          setMovie(prev[0]);
          return prev.slice(1);
        }
        return prev;
      });
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (movies.length <= 3) appendMovie();
  }, [movies.length]);

  const calculateWatchStatus = () => {
    let s = 0;
    if (isWatched) s += 1;
    if (isSaved) s += 2;
    return s;
  };

  const nextMovie = async (isLiked) => {
    const box = middleBoxRef.current;
    if (box) box.classList.add(isLiked ? 'curr-swiped-r' : 'curr-swiped-l');
    await new Promise((res) => setTimeout(res, 300));

    axios.post(API.PERSONALISE.MOVIE, {
      movie_id: movie?.id,
      is_liked: isLiked,
      watch_status: calculateWatchStatus(),
    }).catch(() => {});

    if (box) box.classList.remove('curr-swiped-l', 'curr-swiped-r');

    setMovies((prev) => {
      setMovie(prev[0] || null);
      return prev.slice(1);
    });
    setIsSaved(false);
    setIsWatched(false);

    if (box) {
      box.classList.add('next-fade-in');
      setTimeout(() => box.classList.remove('next-fade-in'), 300);
    }
  };

  if (isLoading) return <Spinner />;

  if (!movie) return (
    <>
      <NavBar />
      <div id="personalise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '1rem' }}>
        <h2 style={{ color: 'var(--text-color)', textAlign: 'center' }}>No more movies to show!</h2>
        <p style={{ color: 'var(--text-color)', opacity: 0.7, textAlign: 'center' }}>Check back later for new recommendations.</p>
      </div>
    </>
  );

  return (
    <>
      <NavBar />
      <div id="personalise">
        <main>
          {/* Left panel */}
          <div className="side-box box">
            <section className="left-box">
              <div>
                <div className="heading">
                  <span>MORE INFO</span>
                  <div className="heading-underline" />
                </div>
                <div className="info-line">
                  <span className="tag">{movie?.release_date?.split('-')[0]}</span>
                  <span className="tag">{formatRuntime(movie?.runtime)}</span>
                  <span className="tag">{movie?.certification || 'NR'}</span>
                </div>
              </div>
              <div className="ratings">
                <strong className="gradient-text">Ratings:</strong>
                <div>
                  <div className="rating-styling-imdb">
                    <img src="./images/IMDB-icon.png" alt="IMDb" className="rating-icon-IMDB" />
                    <span>{formatImdbRating(movie?.imdb_rating)}</span>
                  </div>
                  <div className="rating-styling-tomato">
                    <img src="./images/Rotten_Tomatoes.png" alt="Rotten Tomatoes" className="rating-icon-tomato" />
                    <span>{formatRottenRating(movie?.rotten_rating)}</span>
                  </div>
                </div>
              </div>
              <div className="cast-info">
                <p><strong className="gradient-text">Genres:</strong> {formatGenres(movie?.genres)}</p>
                <p><strong className="gradient-text">Director:</strong> {movie?.director || 'N/A'}</p>
                <p><strong className="gradient-text">Casting:</strong> {movie?.cast || 'N/A'}</p>
              </div>
            </section>
          </div>

          {/* Middle card */}
          <div className="middle-box-section">
            <div className="middle-box-bg box" />
            <div className="middle-box box" ref={middleBoxRef}>
              <img
                src={movie?.poster_path
                  ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
                  : '/images/unavailable-poster.svg'}
                alt={movie?.title}
              />
            </div>
          </div>

          {/* Right panel */}
          <div className="side-box box">
            <section className="right-box">
              <div className="heading">
                <span className="title" data-title={movie?.title}>{formatTitle(movie?.title)}</span>
                <div className="heading-underline" />
              </div>
              <div className="description">{movie?.overview || 'N/A'}</div>
              <div className="stream-info">
                <div className="watch-trailer">
                  <button
                    type="button"
                    className={movie?.trailer ? '' : 'disabled'}
                    disabled={!movie?.trailer}
                    onClick={() => movie?.trailer && window.open(movie.trailer)}
                  >
                    Watch trailer
                  </button>
                  <div className="icon-bar">
                    <img
                      src={isSaved ? '/images/saved.svg' : '/images/not-saved.svg'}
                      alt="Mark saved"
                      onClick={() => setIsSaved((v) => !v)}
                      className="icon"
                    />
                    <img
                      src={isWatched ? '/images/watched.svg' : '/images/not-watched.svg'}
                      alt="Mark watched"
                      onClick={() => setIsWatched((v) => !v)}
                      className="icon"
                    />
                  </div>
                </div>
                <div className="stream-button">
                  <span>Stream here</span>
                  <div className="icon-bar">
                    {topProvider.map((p) => (
                      <div key={p.provider_id || p.provider_name}>
                        <img
                          src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
                          alt={p.provider_name}
                          className="stream-icon"
                        />
                      </div>
                    ))}
                    {!hasProvider && <span>No providers</span>}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        <div className="action-buttons">
          <button type="button" className="tickcross-button cross" onClick={() => nextMovie(false)} />
          <button type="button" className="tickcross-button tick"  onClick={() => nextMovie(true)} />
        </div>
      </div>
    </>
  );
}
