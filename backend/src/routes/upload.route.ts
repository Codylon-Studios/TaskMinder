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
  addUploadRequestSchema,
  deleteUploadRequestSchema
} from "../schemas/upload.schema";

// rate limiter
const uploadLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

// get metadata of all files
router.get("/metadata", uploadLimiter, checkAccess(["CLASS", "MEMBER"]), validate(getUploadMetadataSchema), uploadController.getUploadMetadata);
// upload file route - only temp storage and queuing
router.post(
  "/upload", 
  uploadLimiter, 
  checkAccess(["CLASS", "EDITOR"]),
  uploadMiddleware.preflightStorageQuotaCheck,
  uploadMiddleware.attachUploadCleanupOnFail,
  uploadMiddleware.handleFileUpload,
  uploadMiddleware.normalizeFiles,
  validate(uploadFileSchema),
  uploadController.queueFileUpload
);
// get single file (preview or download)
router.get("/:fileId", uploadLimiter, checkAccess(["CLASS", "MEMBER"]), validate(getUploadFileSchema), uploadController.getUploadFile);
router.post(
  "/edit",
  uploadLimiter,
  checkAccess(["CLASS", "EDITOR"]),
  uploadMiddleware.attachUploadCleanupOnFail,
  uploadMiddleware.handleFileUpload,
  validate(editUploadSchema),
  uploadController.editUpload
);
router.post("/delete", uploadLimiter, checkAccess(["CLASS", "EDITOR"]), validate(deleteUploadSchema), uploadController.deleteUpload);
router.post("/add_request", uploadLimiter, checkAccess(["CLASS", "EDITOR"]), validate(addUploadRequestSchema), uploadController.createUploadRequest);
router.get("/get_request_data", uploadLimiter, checkAccess(["CLASS", "MEMBER"]), uploadController.getUploadRequests);
router.post(
  "/delete_request", 
  uploadLimiter, 
  checkAccess(["CLASS", "EDITOR"]), 
  validate(deleteUploadRequestSchema), 
  uploadController.deleteUploadRequest
);

export default router;