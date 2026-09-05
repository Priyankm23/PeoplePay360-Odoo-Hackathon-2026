const authService = require('./auth.service');
const { loginSchema, changePasswordSchema } = require('./auth.validation');
const { ApiResponse } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const config = require('../../config/env');

class AuthController {
  /**
   * POST /api/auth/login
   */
  login = asyncHandler(async (req, res) => {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    const result = await authService.login(validatedData.email, validatedData.password);

    // Set secure HTTP-only cookie
    const isProduction = config.NODE_ENV === 'production';
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.success(res, result, 'Login successful');
  });

  /**
   * GET /api/auth/me
   */
  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);
    return ApiResponse.success(res, user, 'User profile retrieved');
  });

  /**
   * PATCH /api/auth/change-password
   */
  changePassword = asyncHandler(async (req, res) => {
    const validatedData = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.id, validatedData.currentPassword, validatedData.newPassword);
    return ApiResponse.success(res, null, 'Password updated successfully');
  });

  /**
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: config.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    return ApiResponse.success(res, null, 'Logged out successfully');
  });
}

module.exports = new AuthController();
