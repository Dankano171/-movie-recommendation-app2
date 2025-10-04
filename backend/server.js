require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// TMDB API Configuration
const TMDB_CONFIG = {
  apiKey: process.env.TMDB_API_KEY,
  baseURL: process.env.TMDB_BASE_URL,
  imageBaseURL: process.env.TMDB_IMAGE_BASE_URL
};

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favorites: [{ movieId: Number, addedAt: { type: Date, default: Date.now } }],
  watchlists: [{
    name: String,
    movies: [{ movieId: Number, addedAt: Date }],
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// TMDB API Helper
const tmdbAPI = axios.create({
  baseURL: TMDB_CONFIG.baseURL,
  params: {
    api_key: TMDB_CONFIG.apiKey,
    language: 'en-US'
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 Backend server is running with real TMDB API integration!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: ['Real movie data', 'User authentication', 'Favorites system', 'TMDB integration']
  });
});

// Get popular movies from TMDB
app.get('/api/movies/popular', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    
    const response = await tmdbAPI.get('/movie/popular', {
      params: { page }
    });

    const movies = response.data.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      genre_ids: movie.genre_ids
    }));

    res.json({
      success: true,
      results: movies,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
      page: response.data.page
    });
  } catch (error) {
    console.error('TMDB API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching movies from TMDB',
      error: error.response?.data?.status_message || error.message
    });
  }
});

// Search movies from TMDB
app.get('/api/movies/search', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const response = await tmdbAPI.get('/search/movie', {
      params: { query, page }
    });

    const movies = response.data.results.map(movie => ({
      id: movie.id,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
      vote_average: movie.vote_average
    }));

    res.json({
      success: true,
      results: movies,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
      page: response.data.page,
      query: query
    });
  } catch (error) {
    console.error('TMDB Search Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Error searching movies',
      error: error.response?.data?.status_message || error.message
    });
  }
});

// Get movie details from TMDB
app.get('/api/movies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await tmdbAPI.get(`/movie/${id}`, {
      params: { append_to_response: 'credits,videos,similar' }
    });

    const movie = {
      id: response.data.id,
      title: response.data.title,
      overview: response.data.overview,
      poster_path: response.data.poster_path,
      backdrop_path: response.data.backdrop_path,
      release_date: response.data.release_date,
      runtime: response.data.runtime,
      vote_average: response.data.vote_average,
      vote_count: response.data.vote_count,
      genres: response.data.genres,
      production_companies: response.data.production_companies,
      cast: response.data.credits?.cast.slice(0, 10) || [],
      crew: response.data.credits?.crew.slice(0, 5) || [],
      videos: response.data.videos?.results || [],
      similar: response.data.similar?.results.slice(0, 6) || []
    };

    res.json({
      success: true,
      data: movie
    });
  } catch (error) {
    console.error('TMDB Movie Details Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching movie details',
      error: error.response?.data?.status_message || error.message
    });
  }
});

// Get movie genres from TMDB
app.get('/api/movies/genres/list', async (req, res) => {
  try {
    const response = await tmdbAPI.get('/genre/movie/list');
    
    res.json({
      success: true,
      genres: response.data.genres
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching genres'
    });
  }
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create user
    const user = new User({ username, email, password });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Get user favorites
app.get('/api/users/favorites', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    
    // Get details for each favorite movie from TMDB
    const favoriteMovies = await Promise.all(
      user.favorites.map(async (fav) => {
        try {
          const response = await tmdbAPI.get(`/movie/${fav.movieId}`);
          return {
            id: response.data.id,
            title: response.data.title,
            overview: response.data.overview,
            poster_path: response.data.poster_path,
            release_date: response.data.release_date,
            vote_average: response.data.vote_average,
            addedAt: fav.addedAt
          };
        } catch (error) {
          return null;
        }
      })
    );

    res.json({
      success: true,
      favorites: favoriteMovies.filter(Boolean)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching favorites'
    });
  }
});

// Add to favorites
app.post('/api/users/favorites', authenticateToken, async (req, res) => {
  try {
    const { movieId } = req.body;
    
    if (!movieId) {
      return res.status(400).json({
        success: false,
        message: 'Movie ID is required'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Check if already in favorites
    const alreadyFavorite = user.favorites.some(fav => fav.movieId === movieId);
    if (alreadyFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Movie already in favorites'
      });
    }

    user.favorites.push({ movieId });
    await user.save();

    res.json({
      success: true,
      message: 'Movie added to favorites'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding to favorites'
    });
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.log('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎬 Movie Recommendation Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 TMDB API: ${process.env.TMDB_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
  console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
});
