import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../components/Spinner';
import { API } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import '@styles/index.css';
import '@styles/moviepage.css';

function formatRuntime(mins) {
  if (!mins) return 'N/A';
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`;
}
function formatGenres(genres) {
  if (!genres?.length) return 'N/A';
  return genres.map((g) => g.name).join(' · ');
}
function formatProviders(providers) {
  if (!providers?.length) return ['No data available'];
  return providers.map((p) => p.provider_name);
}
function formatImdbRating(r) { return r ? `${r} / 10` : 'N/A'; }
function formatRottenRating(r) { return r ? `${r}%` : 'N/A'; }

export default function MoviePage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { isLogin } = useAuth();

  // Determine type from URL path (/movie/id or /tv/id)
  const contentType = window.location.pathname.split('/')[1];

  const [movie, setMovie]               = useState({});
  const [isLoading, setIsLoading]       = useState(true);
  const [isSaved, setIsSaved]           = useState(false);
  const [isWatched, setIsWatched]       = useState(false);
  const [selectedRating, setSelected]   = useState(0);
  const [hoverRating, setHoverRating]   = useState(0);
  const [isDescExpanded, setDescExpanded] = useState(false);
  const [fullTitle, setFullTitle]       = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true);
        const detailsEp = contentType === 'tv' ? API.TV.DETAIL(id)   : API.MOVIES.DETAIL(id);
        const prefEp    = contentType === 'tv' ? API.TV.USER_PREFS(id): API.MOVIES.USER_PREFS(id);
        const [details, prefs] = await Promise.all([
          axios.get(detailsEp).then((r) => r.data).catch(() => ({})),
          axios.get(prefEp).then((r) => r.data).catch(() => ({})),
        ]);
        const merged = { ...details, ...prefs };
        setMovie(merged);
        setFullTitle(merged.title || '');
        setSelected(merged.user_rating || 0);
        setIsWatched([1, 3].includes(merged.watch_status));
        setIsSaved([2, 3].includes(merged.watch_status));
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetch();
  }, [id, contentType]);

  const calcWatchStatus = () => {
    let s = 0;
    if (isWatched) s += 1;
    if (isSaved)   s += 2;
    return s;
  };

  const sendMovieData = (isLiked, watchStatus) => {
    if (contentType === 'tv') return;
    axios.post(API.MYLIST.ROOT, { movie_id: id, is_liked: isLiked, watch_status: watchStatus }).catch(() => {});
  };

  const toggleSaved = () => {
    if (!isLogin) { alert('Please log in to perform this action.'); return; }
    if (contentType === 'tv') { alert('Currently unavailable for TV shows.'); return; }
    setIsSaved((v) => { sendMovieData(true, calcWatchStatus() ^ 2); return !v; });
  };

  const toggleWatched = () => {
    if (!isLogin) { alert('Please log in to perform this action.'); return; }
    if (contentType === 'tv') { alert('Currently unavailable for TV shows.'); return; }
    setIsWatched((v) => { sendMovieData(true, calcWatchStatus() ^ 1); return !v; });
  };

  const getStarImage = (index) => {
    const r = hoverRating || selectedRating;
    if (r >= index + 1) return '/images/full-star.svg';
    if (r >= index + 0.5) return '/images/half-star.svg';
    return '/images/hollow-star.svg';
  };

  const onHover = (index, e) => {
    const left = e.clientX - e.target.getBoundingClientRect().left < e.target.offsetWidth / 2;
    setHoverRating(index + (left ? 0.5 : 1));
  };

  const selectRating = async (index, e) => {
    if (!isLogin) { alert('Please log in to perform this action.'); return; }
    if (contentType === 'tv') { alert('Currently unavailable for TV shows.'); return; }
    const left = e.clientX - e.target.getBoundingClientRect().left < e.target.offsetWidth / 2;
    const rating = index + (left ? 0.5 : 1);
    setSelected(rating);
    await axios.post(API.MYLIST.ADD_RATING, { movie_id: id, rating }).catch(() => {});
  };

  const formatTitle = (title) => {
    if (!title) return 'N/A';
    return title.length > 18 ? title.substring(0, 15) + '...' : title;
  };

  const formatDescription = (desc) => {
    if (!desc) return 'N/A';
    return isDescExpanded || desc.length <= 215 ? desc : desc.substring(0, 212) + '...';
  };

  const bgImage = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : '/images/dummy-banner.svg';

  return (
    <div id="movie">
      {isLoading && <Spinner />}

      {!isLoading && (
        <div
          className="background"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}

      {!isLoading && (
        <div className="container fade-in">
          <button type="button" className="back-button" onClick={() => navigate(-1)} />

          <div className="poster-section">
            {movie.trailer && <div className="dim-overlay" />}
            <img
              src={movie.backdrop_path
                ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
                : '/images/dummy-poster.svg'}
              alt={movie.title}
            />
            <div className="overlay-blur" />
            {movie.trailer && (
              <button type="button" className="play-button" onClick={() => window.open(movie.trailer)} />
            )}
          </div>

          <div className="info">
            <div className="first-row">
              <h1 className="title" data-title={fullTitle}>{formatTitle(movie.title)}</h1>
              <div className="stream-info pill-style">
                <p className="streaming">
                  <span>STREAM ON</span> {formatProviders(movie.watch_providers).join(', ')}
                </p>
              </div>
            </div>

            <div className="second-row">
              <div className="numeric-row">
                <span className="pill-style">{movie.release_date?.split('-')[0]}</span>
                <span className="pill-style">
                  {contentType === 'tv'
                    ? `${movie.number_of_seasons} season(s)`
                    : formatRuntime(movie.runtime)}
                </span>
                <span className="pill-style">{movie.certification || 'NR'}</span>
              </div>
              <div className="user-options-row">
                <img src={isSaved   ? '/images/saved.svg'   : '/images/not-saved.svg'}   alt="Mark saved"    width="32" height="32" onClick={toggleSaved} />
                <img src={isWatched ? '/images/watched.svg' : '/images/not-watched.svg'} alt="Mark watched" width="32" height="32" onClick={toggleWatched} />
              </div>
            </div>
            <hr />

            <div>
              <p className="description">{formatDescription(movie.overview)}</p>
              {movie.overview?.length > 215 && (
                <button type="button" className="desc-expand" onClick={() => setDescExpanded((v) => !v)}>
                  {isDescExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            <div className="third-row">
              <div className="cast-info">
                <p><strong>Genres:</strong> {formatGenres(movie.genres)}</p>
                <p><strong>Director:</strong> {movie.director || 'N/A'}</p>
                <p><strong>Casting:</strong> {movie.cast || 'N/A'}</p>
              </div>
              <div className="ratings">
                <div className="online-ratings">
                  <p>RATINGS</p>
                  <div className="rating-block">
                    <img src="https://www.cdnlogo.com/logos/i/79/imdb.svg" alt="imdb" className="icon" />
                    <span>{formatImdbRating(movie.imdb_rating)}</span>
                  </div>
                  <div className="rating-block">
                    <img src="https://www.rottentomatoes.com/assets/pizza-pie/images/rottentomatoes_logo_40.336d6fe66ff.png" alt="rt" className="icon" />
                    <span>{formatRottenRating(movie.rotten_rating)}</span>
                  </div>
                </div>
                <div className="user-ratings">
                  <p>YOUR<br />RATING</p>
                  <div className="stars">
                    {[0,1,2,3,4].map((index) => (
                      <img
                        key={index}
                        src={getStarImage(index)}
                        className="star"
                        alt="star"
                        onMouseMove={(e) => onHover(index, e)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={(e) => selectRating(index, e)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
