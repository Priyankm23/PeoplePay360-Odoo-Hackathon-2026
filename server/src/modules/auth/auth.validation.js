const { z } = require('zod');

const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Please provide a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Current password is required' }).min(1, 'Current password cannot be empty'),
    newPassword: z.string({ required_error: 'New password is required' }).min(8, 'New password must be at least 8 characters long'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password cannot be the same as current password',
    path: ['newPassword'],
  });

module.exports = {
  loginSchema,
  changePasswordSchema,
};
