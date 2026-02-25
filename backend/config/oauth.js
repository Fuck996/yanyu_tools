import 'dotenv/config'

export const githubOAuthConfig = {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
  scope: ['user:email', 'read:user'],
}

export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dev_secret_key_change_in_production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}

export const corsConfig = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}
