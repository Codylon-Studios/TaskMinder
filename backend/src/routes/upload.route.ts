import express from "express";
import rateLimit from "express-rate-limit";
import uploadController from "../controllers/upload.controller";
import checkAccess from "../middleware/access.middleware";
import uploadMiddleware from "../middleware/upload.middleware";
import { validate } from "../middleware/validation.middleware";
import { 
  deleteUploadSchema, 
  getUploadFileSchema, 
  getUploadMetadataSchema,
  editUploadSchema, 
  uploadFileSchema,
  pinUploadSchema,
  addUploadRequestSchema,
  deleteUploadRequestSchema
} from "../schemas/upload.schema";

// upload rate limiters
const readUploadLimiter = rateLimit({ windowMs: 1000, limit: 30 });
const writeUploadLimiter = rateLimit({ windowMs: 1000, limit: 10 });

const router = express.Router();

// get metadata
router.get("/", readUploadLimiter, checkAccess(["CLASS", "MEMBER"]), validate(getUploadMetadataSchema), uploadController.getUploadMetadata);
// get upload requests
router.get("/requests", readUploadLimiter, checkAccess(["CLASS", "MEMBER"]), uploadController.getUploadRequests);

// upload file: only temp storage and queuing
router.post(
  "/", 
  writeUploadLimiter, 
  checkAccess(["CLASS", "EDITOR"]),
  // installs listeners for errors and fails
  uploadMiddleware.attachUploadCleanupOnFail,
  // check for multer limits
  uploadMiddleware.handleFileUpload,
  uploadMiddleware.normalizeFiles,
  uploadMiddleware.preflightStorageQuotaCheck,
  validate(uploadFileSchema),
  uploadController.queueFileUpload
);
// get single file (preview or download)
router.get("/:id", readUploadLimiter, checkAccess(["CLASS", "MEMBER"]), validate(getUploadFileSchema), uploadController.getUploadFile);
// edit file
router.patch(
  "/:id",
  writeUploadLimiter,
  checkAccess(["CLASS", "EDITOR"]),
  uploadMiddleware.attachUploadCleanupOnFail,
  uploadMiddleware.handleFileUpload,
  validate(editUploadSchema),
  uploadMiddleware.normalizeFilesOptional,
  uploadMiddleware.preflightEditStorageQuotaCheck,
  uploadController.editUpload
);
// delete file
router.delete("/:id", writeUploadLimiter, checkAccess(["CLASS", "EDITOR"]), validate(deleteUploadSchema), uploadController.deleteUpload);
// pin file upload
router.patch("/:id/pin", writeUploadLimiter, checkAccess(["CLASS", "EDITOR"]), validate(pinUploadSchema), uploadController.pinUpload);

// add upload request
router.post(
  "/requests", 
  writeUploadLimiter, 
  checkAccess(["CLASS", "EDITOR"]), 
  validate(addUploadRequestSchema), 
  uploadController.createUploadRequest
);
// delete upload request
router.delete(
  "/requests/:id", 
  writeUploadLimiter, 
  checkAccess(["CLASS", "EDITOR"]), 
  validate(deleteUploadRequestSchema), 
  uploadController.deleteUploadRequest
);

export default router;