// Production configuration - VPS specific settings
module.exports = {
  port: process.env.PORT || 3000,
  database: {
    url: process.env.DATABASE_URL || 'postgresql://addypin_user:secure_password_123@localhost:5432/addypin',
    ssl: false // Local PostgreSQL, no SSL required
  },
  email: {
    apiKey: process.env.RESEND_API_KEY
  },
  environment: 'production',
  logging: {
    level: 'info',
    format: 'json'
  }
};