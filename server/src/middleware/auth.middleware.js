const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/prisma');
const { ApiError } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authenticate JWT token from Authorization Header or Cookies
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  // Check Authorization Bearer header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    // Check HTTP-only cookie
    token = req.cookies.token;
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication token is required', 'UNAUTHENTICATED');
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists', 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Authentication token has expired', 'TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
  }
});

/**
 * Role-Based Access Control (RBAC) authorization middleware
 * @param  {...string} allowedRoles
 */
const authorize = (...allowedRoles) => {
  const flattenedRoles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User context missing. Authenticate first.', 'UNAUTHENTICATED'));
    }

    if (!flattenedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Middleware for Employee role scoping: forces employeeId to req.user.employeeId
 */
const scopeToSelf = (req, res, next) => {
  if (req.user && req.user.role === 'EMPLOYEE') {
    if (!req.user.employeeId) {
      return next(ApiError.forbidden('Employee profile not linked to this account.', 'NO_LINKED_EMPLOYEE'));
    }
    // Inject self scoping into query and body
    req.query.employeeId = req.user.employeeId;
    if (req.body && typeof req.body === 'object') {
      req.body.employeeId = req.user.employeeId;
    }
  }
  next();
};

/**
 * Security Rule: Anti-Self-Elevation
 * Prevents any user (including Admin) from changing their own role via API
 */
const preventSelfRoleElevation = (req, res, next) => {
  const targetUserId = req.params.id || req.params.userId;
  if (req.user && targetUserId && req.user.id === targetUserId) {
    if (req.body && req.body.role && req.body.role !== req.user.role) {
      return next(
        ApiError.forbidden('You cannot change your own role.', 'FORBIDDEN_SELF_ELEVATION')
      );
    }
  }
  next();
};

module.exports = {
  authenticate,
  authorize,
  scopeToSelf,
  preventSelfRoleElevation,
};
