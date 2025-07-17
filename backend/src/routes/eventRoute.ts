import express from "express";
import eventController from "../controllers/eventController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_event_data", checkAccess.checkClass, checkAccess.checkPermissionLevel(1), eventController.getEventData);
router.post("/add_event", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(1), eventController.addEvent);
router.post("/edit_event", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(1), eventController.editEvent);
router.post("/delete_event", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(1), eventController.deleteEvent);
router.get("/get_event_type_data", checkAccess.checkClass, eventController.getEventTypeData);
router.post("/set_event_type_data", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(2), eventController.setEventTypeData);
router.get("/event_type_styles", checkAccess.checkClass, eventController.getEventTypeStyles);

export default router;
