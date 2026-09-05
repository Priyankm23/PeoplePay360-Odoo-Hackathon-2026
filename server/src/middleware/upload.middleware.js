const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const config = require('../config/env');
const { ApiError } = require('../utils/apiResponse');

const cloudinaryConfigured = config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET;
if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(ApiError.badRequest('Profile image must be JPEG, PNG, or WebP', null, 'INVALID_IMAGE_TYPE'));
    }
    callback(null, true);
  },
});

const uploadEmployeeImage = async (req, res, next) => {
  if (!req.file) return next();
  if (!cloudinaryConfigured) {
    return next(ApiError.internal('Image storage is not configured', null, 'IMAGE_STORAGE_UNAVAILABLE'));
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'peoplepay360/employees', resource_type: 'image', transformation: [{ width: 512, height: 512, crop: 'limit' }] },
        (error, uploaded) => (error ? reject(error) : resolve(uploaded))
      );
      stream.end(req.file.buffer);
    });
    req.body.profileImageUrl = result.secure_url;
    next();
  } catch (error) {
    next(ApiError.internal('Unable to upload profile image', null, 'IMAGE_UPLOAD_FAILED'));
  }
};

module.exports = { uploadEmployeeImage, employeeImageUpload: upload.single('image') };
