import express from "express";
import uploadController from "../controllers/uploadController";
import checkAccess from "../middleware/accessMiddleware";
import uploadMiddleware from "../middleware/uploadMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { 
  deleteUploadSchema, 
  getUploadFileSchema, 
  getUploadMetadataSchema,
  editUploadSchema, 
  uploadFileSchema 
} from "../schemas/uploadSchema";

const router = express.Router();

// get metadata of all files
router.get("/upload/metadata", checkAccess(["CLASS", "MEMBER"]), validate(getUploadMetadataSchema), uploadController.getUploadMetadata);
// upload file route - only temp storage and queuing
router.post(
  "/upload", 
  checkAccess(["CLASS", "EDITOR"]),
  validate(uploadFileSchema),
  uploadMiddleware.preflightStorageQuotaCheck,
  uploadMiddleware.secureUpload.array("files", 20),
  uploadMiddleware.normalizeFiles,
  uploadController.queueFileUpload
);
// get single file (preview or download)
router.get("/upload/:fileId", checkAccess(["CLASS", "MEMBER"]), validate(getUploadFileSchema), uploadController.getUploadFile);
router.post("/upload/edit", checkAccess(["CLASS", "EDITOR"]), validate(editUploadSchema), uploadController.editUpload);
router.post("/upload/delete", checkAccess(["CLASS", "EDITOR"]), validate(deleteUploadSchema), uploadController.deleteUpload);

export default router;