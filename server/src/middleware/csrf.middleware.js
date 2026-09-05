const crypto = require('crypto');
const { ApiError } = require('../utils/apiResponse');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const csrfProtection = (req, res, next) => {
  let token = req.cookies?.csrfToken;
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  if (SAFE_METHODS.has(req.method) || !req.cookies?.token) return next();
  const submittedToken = req.get('x-csrf-token');
  const submittedBuffer = submittedToken ? Buffer.from(submittedToken) : null;
  const expectedBuffer = Buffer.from(token);
  if (!submittedBuffer || submittedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(submittedBuffer, expectedBuffer)) {
    return next(ApiError.forbidden('CSRF token is missing or invalid', 'CSRF_INVALID'));
  }
  next();
};

module.exports = { csrfProtection };
