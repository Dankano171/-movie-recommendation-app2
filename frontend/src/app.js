import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TMDB_IMAGE_BASE_URL = process.env.REACT_APP_TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '' });

  useEffect(() => {
    checkBackendConnection();
    loadPopularMovies();
    checkExistingAuth();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      
      setBackendStatus('connected');
      setMessage(data.message);
      console.log('✅ Backend connection successful:', data);
    } catch (error) {
      setBackendStatus('failed');
      setMessage('Cannot connect to backend server. Make sure it is running on port 5000.');
      console.error('❌ Backend connection failed:', error);
    }
  };

  const checkExistingAuth = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  };

  const loadPopularMovies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/movies/popular`);
      const data = await response.json();
      
      if (data.success) {
        setMovies(data.results);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/movies/search?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.success) {
        setMovies(data.results);
      }
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setShowLogin(false);
        setRegisterData({ username: '', email: '', password: '' });
        alert('Registration successful!');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setShowLogin(false);
        setLoginData({ email: '', password: '' });
        alert('Login successful!');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const addToFavorites = async (movieId) => {
    if (!user) {
      alert('Please login to add favorites');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ movieId }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Added to favorites!');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Favorite error:', error);
      alert('Error adding to favorites');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="container">
          {/* Navigation */}
          <nav className="nav">
            <div className="nav-brand">
              <h1>🎬 MovieDB</h1>
              <span>Real Movie Data from TMDB</span>
            </div>
            <div className="nav-actions">
              {user ? (
                <div className="user-info">
                  <span>Welcome, {user.username}</span>
                  <button onClick={handleLogout} className="logout-btn">
                    Logout
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowLogin(!showLogin)} className="auth-btn">
                  {showLogin ? 'Cancel' : 'Login/Register'}
                </button>
              )}
            </div>
          </nav>

          {/* Auth Forms */}
          {showLogin && (
            <div className="auth-forms">
              <div className="auth-section">
                <h3>Register</h3>
                <form onSubmit={handleRegister} className="auth-form">
                  <input
                    type="text"
                    placeholder="Username"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    required
                  />
                  <button type="submit">Register</button>
                </form>
              </div>

              <div className="auth-section">
                <h3>Login</h3>
                <form onSubmit={handleLogin} className="auth-form">
                  <input
                    type="email"
                    placeholder="Email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    required
                  />
                  <button type="submit">Login</button>
                </form>
              </div>
            </div>
          )}

          {/* Backend Status */}
          <div className={`status-box ${backendStatus}`}>
            <h3>Backend Connection Status:</h3>
            <div className="status-indicator">
              {backendStatus === 'checking' && '🔄 Checking...'}
              {backendStatus === 'connected' && '✅ Connected Successfully'}
              {backendStatus === 'failed' && '❌ Connection Failed'}
            </div>
            <p>{message}</p>
          </div>

          {/* Search Bar */}
          <div className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Search real movies from TMDB..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">
                🔍 Search
              </button>
              <button 
                type="button" 
                onClick={loadPopularMovies}
                className="secondary-button"
              >
                📊 Popular Movies
              </button>
            </form>
          </div>

          {/* Movies Display */}
          <div className="movies-section">
            <h2>{searchQuery ? `Search Results for "${searchQuery}"` : '🔥 Popular Movies'}</h2>
            
            {loading ? (
              <div className="loading">Loading real movie data from TMDB...</div>
            ) : (
              <div className="movies-grid">
                {movies.length > 0 ? (
                  movies.map(movie => (
                    <div key={movie.id} className="movie-card">
                      <div className="movie-poster">
                        {movie.poster_path ? (
                          <img 
                            src={`${TMDB_IMAGE_BASE_URL}/w300${movie.poster_path}`}
                            alt={movie.title}
                            loading="lazy"
                          />
                        ) : (
                          <div className="poster-placeholder">
                            🎬
                          </div>
                        )}
                        <div className="movie-overlay">
                          <button 
                            onClick={() => addToFavorites(movie.id)}
                            className="favorite-btn"
                            title="Add to favorites"
                          >
                            ❤️
                          </button>
                        </div>
                      </div>
                      <div className="movie-info">
                        <h3>{movie.title}</h3>
                        <p className="movie-year">
                          {movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'}
                        </p>
                        <p className="movie-rating">
                          ⭐ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                        </p>
                        <p className="movie-description">
                          {movie.overview ? (
                            movie.overview.length > 120 
                              ? `${movie.overview.substring(0, 120)}...` 
                              : movie.overview
                          ) : 'No description available.'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-movies">
                    {searchQuery ? 'No movies found. Try another search.' : 'Loading real movie data...'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Demo Info */}
          <div className="demo-info">
            <h3>🎯 Real Movie Data Powered by TMDB</h3>
            <p>This app uses real movie data from The Movie Database (TMDB) API.</p>
            <div className="features-grid">
              <div className="feature-item">
                <h4>🎬 Real Movies</h4>
                <p>Actual movie data from TMDB</p>
              </div>
              <div className="feature-item">
                <h4>🔍 Live Search</h4>
                <p>Search real-time movie database</p>
              </div>
              <div className="feature-item">
                <h4>❤️ Favorites</h4>
                <p>Save your favorite movies</p>
              </div>
              <div className="feature-item">
                <h4>👤 User Accounts</h4>
                <p>Secure authentication system</p>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
