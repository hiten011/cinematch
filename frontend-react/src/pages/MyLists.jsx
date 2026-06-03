import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { API } from '../config/api';
import '@styles/index.css';
import '@styles/nav-bar.css';
import '@styles/footer.css';
import '@styles/mylists.css';

const STATUS_ICON = {
  0: '/images/my-lists/eye-slash-solid.png',
  1: '/images/my-lists/eye.png',
  2: '/images/my-lists/eye-slash-solid.png',
  3: '/images/my-lists/eye.png',
};

const STATUSES = [{ name: 'Watched', id: 3 }, { name: 'Not Watched', id: 2 }];
const AGE_RATINGS = ['NR', 'M', 'PG'];

function loadLimitArray() {
  const arr = [10];
  for (let i = 50; i < 140; i += 50) arr.push(i);
  return arr;
}

function helperDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function range(start, end) {
  const pages = [];
  if (end <= 7) {
    for (let i = start; i <= end; i++) pages.push(i);
  } else {
    pages.push(1);
    if (start > 3) pages.push('...');
    for (let i = Math.max(2, start - 1); i <= Math.min(end - 1, start + 1); i++) pages.push(i);
    if (start < end - 2) pages.push('...');
    pages.push(end);
  }
  return pages;
}

export default function MyLists() {
  const navigate = useNavigate();

  const [movies, setMovies]           = useState([]);
  const [genres, setGenres]           = useState([]);
  const [page, setPage]               = useState(1);
  const [load, setLoad]               = useState(10);
  const [totalPages, setTotalPages]   = useState(1);
  const [sort, setSort]               = useState('');
  const [filter, setFilter]           = useState({ genre: [], status: [], ageRating: [] });
  const [showFilter, setShowFilter]   = useState(false);
  const [showSort, setShowSort]       = useState(false);
  const [showLoadLimit, setShowLoadLimit] = useState(false);
  const [activeAccordion, setAccordion]  = useState(null);

  const filterBtnRef    = useRef(null);
  const filterMenuRef   = useRef(null);
  const sortBtnRef      = useRef(null);
  const sortMenuRef     = useRef(null);
  const loadLimitRef    = useRef(null);

  const buildUrl = (pg = page) => {
    const params = new URLSearchParams({ page: pg, limit: load });
    if (sort) params.set('sort', sort);
    filter.genre.forEach((g) => params.append('genre', g));
    filter.status.forEach((s) => params.append('status', s));
    filter.ageRating.forEach((a) => params.append('certification', a));
    return `${API.MYLIST.ROOT}?${params}`;
  };

  const fetchMovies = async (url) => {
    const res = await axios.get(url).catch(() => null);
    if (!res) return;
    setMovies((res.data.movies || []).map((m) => ({ ...m, hoverRating: 0 })));
    const total = res.data.total || 0;
    setTotalPages(Math.ceil(total / load) || 1);
  };

  useEffect(() => { fetchMovies(buildUrl(1)); setPage(1); }, [load, sort, filter]);
  useEffect(() => { fetchMovies(buildUrl(page)); }, [page]);
  useEffect(() => {
    axios.get(API.GENRES).then((r) => setGenres(r.data)).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!filterBtnRef.current?.contains(e.target) && !filterMenuRef.current?.contains(e.target)) setShowFilter(false);
      if (!sortBtnRef.current?.contains(e.target) && !sortMenuRef.current?.contains(e.target)) setShowSort(false);
      if (!loadLimitRef.current?.contains(e.target)) setShowLoadLimit(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const setUserRating = async (movie, rating) => {
    setMovies((prev) => prev.map((m) => m.movie_id === movie.movie_id ? { ...m, my_rating: rating } : m));
    await axios.post(API.MYLIST.ADD_RATING, { movie_id: movie.movie_id, rating }).catch(() => {});
  };

  const toggleStatus = async (movie) => {
    const next = { 3: 2, 2: 3, 1: 0, 0: 1 }[movie.watch_status] ?? movie.watch_status;
    setMovies((prev) => prev.map((m) => m.movie_id === movie.movie_id ? { ...m, watch_status: next } : m));
    await axios.post(API.MYLIST.ROOT, { movie_id: movie.movie_id, is_liked: 1, watch_status: next }).catch(() => {});
  };

  const toggleBookmark = async (movie) => {
    const next = (movie.watch_status === 2 || movie.watch_status === 3)
      ? movie.watch_status - 2
      : movie.watch_status + 2;
    setMovies((prev) => prev.map((m) => m.movie_id === movie.movie_id ? { ...m, watch_status: next } : m));
    await axios.post(API.MYLIST.ROOT, { movie_id: movie.movie_id, is_liked: 1, watch_status: next }).catch(() => {});
  };

  const resetFilters = () => {
    setFilter({ genre: [], status: [], ageRating: [] });
    setSort('');
    setPage(1);
    setShowFilter(false);
    setShowSort(false);
  };

  const getMouseX = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return (e.clientX - rect.left) / rect.width;
  };

  return (
    <>
      <NavBar />
      <main className="main-mylists">
        <div className="hero-section">
          <div className="heading-text">My Movie List</div>
          <div className="filter-sort-section">
            <button type="button" className="button-reset" onClick={resetFilters}>
              <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 2 24 20" width="1rem" height="1rem" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-8.36L1 10" />
              </svg> Reset Filters
            </button>

            {/* Filter */}
            <button ref={filterBtnRef} type="button" className="filter-button" onClick={() => setShowFilter((v) => !v)}>
              Add Filters
            </button>
            {showFilter && (
              <div ref={filterMenuRef} className="filter-menu-accordion" onClick={(e) => e.stopPropagation()}>
                <div className="accordion-section">
                  <button type="button" className="accordion-header" onClick={() => setAccordion((p) => p === 'genres' ? null : 'genres')}>Genres</button>
                  {activeAccordion === 'genres' && (
                    <div className="accordion-body">
                      <div className="genre-controls">
                        <button type="button" className="genre-btn" onClick={() => setFilter((f) => ({ ...f, genre: genres.map((g) => g.id) }))}>Select All</button>
                        <button type="button" className="genre-btn" onClick={() => setFilter((f) => ({ ...f, genre: [] }))}>Clear All</button>
                      </div>
                      <div className="genre-grid">
                        {genres.map((g) => (
                          <label key={g.id} className="filter-option">
                            <input
                              type="checkbox"
                              checked={filter.genre.includes(g.id)}
                              onChange={() => setFilter((f) => ({
                                ...f,
                                genre: f.genre.includes(g.id) ? f.genre.filter((x) => x !== g.id) : [...f.genre, g.id],
                              }))}
                            /> {g.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="accordion-section">
                  <button type="button" className="accordion-header" onClick={() => setAccordion((p) => p === 'age' ? null : 'age')}>Age Rating</button>
                  {activeAccordion === 'age' && (
                    <div className="accordion-body">
                      {AGE_RATINGS.map((a) => (
                        <label key={a} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filter.ageRating.includes(a)}
                            onChange={() => setFilter((f) => ({
                              ...f,
                              ageRating: f.ageRating.includes(a) ? f.ageRating.filter((x) => x !== a) : [...f.ageRating, a],
                            }))}
                          /> {a}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="accordion-section">
                  <button type="button" className="accordion-header" onClick={() => setAccordion((p) => p === 'status' ? null : 'status')}>Status</button>
                  {activeAccordion === 'status' && (
                    <div className="accordion-body">
                      {STATUSES.map((s) => (
                        <label key={s.id} className="filter-option">
                          <input
                            type="checkbox"
                            checked={filter.status.includes(s.id)}
                            onChange={() => setFilter((f) => ({
                              ...f,
                              status: f.status.includes(s.id) ? f.status.filter((x) => x !== s.id) : [...f.status, s.id],
                            }))}
                          /> {s.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sort */}
            <div className="custom-dropdown">
              <button ref={sortBtnRef} type="button" className="filter-button" onClick={() => setShowSort((v) => !v)}>Sort By</button>
              {showSort && (
                <div ref={sortMenuRef} className="custom-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  {[
                    { label: 'User Rating: High to Low', val: 'my_rating.desc' },
                    { label: 'User Rating: Low to High', val: 'my_rating.asc' },
                    { label: 'IMDB Rating: High to Low', val: 'imdb_rating.desc' },
                    { label: 'IMDB Rating: Low to High', val: 'imdb_rating.asc' },
                  ].map(({ label, val }) => (
                    <div
                      key={val}
                      className={`dropdown-option${sort === val ? ' selected' : ''}`}
                      onClick={() => { setSort(val); setShowSort(false); }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="movie-table">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Genre</th><th>Release Date</th><th>Status</th>
                <th>Age rating</th><th>IMDb Rating</th><th>User Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr><td /><td /><td /><td /><td /><td /><td /></tr>
              {movies.map((movie) => (
                <tr key={movie.movie_id}>
                  <td className="movie-title movie-name" data-label="Name">
                    <div className="title-with-icon">
                      <img
                        className="bookmark-icon"
                        src={(movie.watch_status === 1 || movie.watch_status === 0)
                          ? '/images/my-lists/unbookmarked.svg'
                          : '/images/my-lists/bookmarked.svg'}
                        alt="Bookmark"
                        onClick={() => toggleBookmark(movie)}
                      />
                      <span onClick={() => navigate(`/movie/${movie.movie_id}`)}>
                        {movie.title || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td data-label="Genre">
                    <div className="genre-cell">
                      {movie.genres?.map((g) => (
                        <span key={g.name} className={`genre-badge genre-${g.name.toLowerCase().replace(/\s+/g, '-')}`}>
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="release-date" data-label="Release Date">{helperDate(movie.release_date)}</td>
                  <td data-label="Status">
                    <img
                      src={STATUS_ICON[movie.watch_status] || ''}
                      alt={String(movie.watch_status)}
                      className="status-icon"
                      onClick={() => toggleStatus(movie)}
                    />
                  </td>
                  <td className="age-rating" data-label="Age Rating">{movie.certification || 'N/A'}</td>
                  <td className="imdb-rating" data-label="IMDb Rating">{movie.imdb_rating ? `${movie.imdb_rating}/10` : 'N/A'}</td>
                  <td className="rating-cell" data-label="Your Rating">
                    <div className="star-rating" onMouseLeave={() => setMovies((p) => p.map((m) => m.movie_id === movie.movie_id ? { ...m, hoverRating: 0 } : m))}>
                      {[1,2,3,4,5].map((i) => (
                        <div
                          key={i}
                          className="star-container"
                          onMouseMove={(e) => setMovies((p) => p.map((m) => m.movie_id === movie.movie_id ? { ...m, hoverRating: getMouseX(e) < 0.5 ? i - 0.5 : i } : m))}
                          onClick={(e) => setUserRating(movie, getMouseX(e) < 0.5 ? i - 0.5 : i)}
                        >
                          <svg viewBox="0 0 24 24" className={`star${(movie.hoverRating || movie.my_rating) >= i ? ' filled' : ''}${(movie.hoverRating || movie.my_rating) === i - 0.5 ? ' half' : ''}`}>
                            <defs>
                              <linearGradient id="half-grad" x1="0" x2="1" y1="0" y2="0">
                                <stop offset="50%" stopColor="gold" />
                                <stop offset="50%" stopColor="#444" />
                              </linearGradient>
                            </defs>
                            <polygon
                              points="12,2 15,10 23,10 17,14 19,22 12,17 5,22 7,14 1,10 9,10"
                              fill={
                                (movie.hoverRating || movie.my_rating) >= i
                                  ? 'gold'
                                  : (movie.hoverRating || movie.my_rating) === i - 0.5
                                  ? 'url(#half-grad)'
                                  : '#444'
                              }
                            />
                          </svg>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-footer">
            <div className="custom-dropdown" ref={loadLimitRef}>
              <button type="button" className="load-button" onClick={() => setShowLoadLimit((v) => !v)}>
                Load Limit{load ? ` = ${load}` : ''} <span className="arrow">&#9662;</span>
              </button>
              {showLoadLimit && (
                <div className="custom-dropdown-menu">
                  {loadLimitArray().map((lim) => (
                    <div
                      key={lim}
                      className="dropdown-option"
                      onClick={() => { setLoad(lim); setShowLoadLimit(false); }}
                    >
                      Load Limit = {lim}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pagination-controls">
            <button type="button" className="page-arrow" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
            {range(1, totalPages).map((n, idx) => (
              <button
                key={idx}
                type="button"
                disabled={n === '...'}
                className={`page-number${n === page ? ' active' : ''}${n === '...' ? ' ellipsis' : ''}`}
                onClick={() => typeof n === 'number' && setPage(n)}
              >
                {n}
              </button>
            ))}
            <button type="button" className="page-arrow" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
