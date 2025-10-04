# Setup Guide - Real TMDB Integration

## 🎯 Features Included
- Real movie data from The Movie Database (TMDB)
- User authentication with JWT
- Favorite movies system
- Live search functionality
- MongoDB integration
- Responsive design

## 🔑 Required API Keys

### 1. TMDB API Key (Free)
1. Visit https://www.themoviedb.org/
2. Create an account
3. Go to Settings → API
4. Request an API key (free for developers)
5. Copy your API key

### 2. MongoDB Atlas (Free)
1. Visit https://www.mongodb.com/atlas
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Replace in backend/.env file

## 🚀 Quick Deployment

### Backend to Render
1. Connect GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically

### Frontend to Netlify
1. Build: `npm run build`
2. Drag build folder to Netlify
3. Set environment variables

### Database to MongoDB Atlas
1. Use free tier (512MB)
2. Whitelist IP addresses
3. Get connection string

## 📊 Real Data Sources
- **Movies**: The Movie Database (TMDB)
- **Images**: TMDB CDN
- **User Data**: Your MongoDB database
- **Authentication**: JWT tokens

## 🔒 Security Features
- Password hashing with bcrypt
- JWT token authentication
- CORS configuration
- Environment variable protection
