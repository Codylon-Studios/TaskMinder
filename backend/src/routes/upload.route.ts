import express from "express";
import uploadController from "../controllers/upload.controller";
import checkAccess from "../middleware/access.middleware";
import uploadMiddleware from "../middleware/upload.middleware";
import { validate } from "../middleware/validation.middleware";
import { 
  deleteUploadSchema, 
  getUploadFileSchema, 
  getUploadMetadataSchema,
  editUploadSchema, 
  uploadFileSchema 
} from "../schemas/upload.schema";

const router = express.Router();

// get metadata of all files
router.get("/metadata", checkAccess(["CLASS", "MEMBER"]), validate(getUploadMetadataSchema), uploadController.getUploadMetadata);
// upload file route - only temp storage and queuing
router.post(
  "/upload", 
  checkAccess(["CLASS", "EDITOR"]),
  validate(uploadFileSchema),
  uploadMiddleware.preflightStorageQuotaCheck,
  uploadMiddleware.handleFileUpload,
  uploadMiddleware.normalizeFiles,
  uploadController.queueFileUpload
);
// get single file (preview or download)
router.get("/:fileId", checkAccess(["CLASS", "MEMBER"]), validate(getUploadFileSchema), uploadController.getUploadFile);
router.post("/edit", checkAccess(["CLASS", "EDITOR"]), validate(editUploadSchema), uploadController.editUpload);
router.post("/delete", checkAccess(["CLASS", "EDITOR"]), validate(deleteUploadSchema), uploadController.deleteUpload);

export default router;