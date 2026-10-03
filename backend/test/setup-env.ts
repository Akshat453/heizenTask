process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'phase-1-e2e-only-secret-at-least-32-characters';
process.env.JWT_EXPIRES_IN = '3600';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.AUTH_COOKIE_SAME_SITE = 'lax';
