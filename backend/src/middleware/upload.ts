import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) =>{
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) =>{
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

// File filter - allow only specific file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) =>{
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'));
  }
};

// Create multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string) =>upload.single(fieldName);

// Middleware for multiple file uploads
export const uploadMultiple = (fieldName: string, maxCount: number = 5) =>
  upload.array(fieldName, maxCount);

// Error handling middleware for multer
export const handleUploadError = (err: any, req: any, res: any, next: any) =>{
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
  next();
};

// Company Logo Upload Configuration
const companyLogosDir = path.join(__dirname, '../../uploads/company-logos');
if (!fs.existsSync(companyLogosDir)) {
  fs.mkdirSync(companyLogosDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) =>{
    cb(null, companyLogosDir);
  },
  filename: (req, file, cb) =>{
    const companyId = req.params.companyId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${companyId}-${timestamp}${ext}`);
  },
});

const logoFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) =>{
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG and PNG images are allowed.'));
  }
};

export const uploadCompanyLogo = multer({
  storage: logoStorage,
  fileFilter: logoFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size
  },
});

/**
 * Delete old logo file
 */
export const deleteOldLogo = (logoUrl: string): void =>{
  try {
    // Extract filename from URL (e.g., /uploads/company-logos/abc-123.png ->abc-123.png)
    const filename = path.basename(logoUrl);
    const filePath = path.join(companyLogosDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('Old logo deleted:', filename);
    }
  } catch (error) {
    console.error('Error deleting old logo:', error);
  }
};
