const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const config = require('../../config/env');
const { ApiError } = require('../../utils/apiResponse');
const { recordAudit } = require('../../utils/audit');

class AuthService {
  /**
   * Authenticate user credentials and generate JWT
   */
  async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
            jobPosition: { select: { id: true, title: true } },
            status: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!user) {
      // Return generic 401 message to prevent email enumeration
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    await recordAudit({ actorId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        employee: user.employee || null,
      },
    };
  }

  /**
   * Retrieve current authenticated user profile
   */
  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            department: { select: { id: true, name: true } },
            jobPosition: { select: { id: true, title: true } },
            workingSchedule: { select: { id: true, name: true, type: true } },
            status: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User profile not found', 'USER_NOT_FOUND');
    }

    return user;
  }

  /**
   * Update password for the currently authenticated user
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect', null, 'INVALID_CURRENT_PASSWORD');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await recordAudit({ actorId: userId, action: 'CHANGE_PASSWORD', entity: 'User', entityId: userId });

    return { success: true };
  }
}

module.exports = new AuthService();
