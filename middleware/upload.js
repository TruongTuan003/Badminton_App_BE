const multer = require('multer');
const path = require('path');

// Cấu hình storage: lưu file tạm thời trong memory
const storage = multer.memoryStorage();

// File filter: chỉ chấp nhận image và video
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|webm|ogg|mov|avi/;
  
  const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
                  allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh (jpeg, jpg, png, gif, webp) hoặc video (mp4, webm, ogg, mov, avi)'));
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: fileFilter,
});

// Middleware để upload image và video riêng biệt
const uploadFiles = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

module.exports = uploadFiles;

