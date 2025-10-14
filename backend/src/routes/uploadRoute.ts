import express from "express";
import uploadController from "../controllers/uploadController";
import checkAccess from "../middleware/accessMiddleware";
import uploadMiddleware from "../middleware/uploadMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { deleteUploadFileSchema, getUploadFileSchema, renameUploadFileSchema, setUploadFileSchema } from "../schemas/uploadSchema";
import { deleteUploadFileGroupSchema, renameUploadFileGroupSchema } from "../schemas/uploadSchema";

const router = express.Router();

// gets pagination list of file data
router.get("/get_upload_files", checkAccess(["CLASS", "MEMBER"]), uploadController.getUploadDataList);
// upload file route
router.post(
  "/set_upload_file", 
  checkAccess(["CLASS", "EDITOR"]),
  validate(setUploadFileSchema),
  uploadMiddleware.preflightStorageQuotaCheck,
  uploadMiddleware.secureUpload.array("upload_file", 20),
  uploadMiddleware.normalizeFiles,
  uploadMiddleware.verifyFileType,
  uploadMiddleware.antivirusScan,
  uploadMiddleware.sanitizeImage,
  uploadMiddleware.sanitizePDF,
  uploadController.setUploadFile
);
// get single file (preview or download)
router.get("/get_single_file/:fileId", checkAccess(["CLASS", "MEMBER"]), validate(getUploadFileSchema), uploadController.getUploadFile);

router.post("/rename_upload_file", checkAccess(["CLASS", "EDITOR"]), validate(renameUploadFileSchema), uploadController.renameUploadFile);
router.post("/delete_upload_file", checkAccess(["CLASS", "EDITOR"]), validate(deleteUploadFileSchema), uploadController.deleteUploadFile);

router.post(
  "/rename_upload_file_group", 
  checkAccess(["CLASS", "EDITOR"]), 
  validate(renameUploadFileGroupSchema), 
  uploadController.renameUploadFileGroup
);
router.post(
  "/delete_upload_file_group", 
  checkAccess(["CLASS", "EDITOR"]),
  validate(deleteUploadFileGroupSchema), 
  uploadController.deleteUploadFileGroup
);

export default router;