import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function imageFileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, or WEBP images are allowed'));
  }
  cb(null, true);
}

/** Storage for employee profile photos: uploads/employee-photos/<code>-<timestamp>.<ext> */
export const employeePhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'employee-photos');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const code = req.params.code || 'unknown';
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${code}-${Date.now()}${ext}`);
  },
});

/** Storage for the company logo: uploads/company/logo-<timestamp>.<ext> */
export const companyLogoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'company');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

export const uploadEmployeePhotoMulter = multer({
  storage: employeePhotoStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});

export const uploadCompanyLogoMulter = multer({
  storage: companyLogoStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});
