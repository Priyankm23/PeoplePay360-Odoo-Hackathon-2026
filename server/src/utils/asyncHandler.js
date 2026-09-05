/**
 * Higher-order function to wrap async Express route handlers
 * and automatically forward unhandled promise rejections to the next(error) middleware.
 *
 * @param {Function} fn - Async route handler or middleware
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
