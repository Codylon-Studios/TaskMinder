import express from "express";
import eventController from "../controllers/eventController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_event_data", checkAccess(["CLASS"]), eventController.getEventData);
router.post("/add_event", checkAccess(["CLASS", "EDITOR"]), eventController.addEvent);
router.post("/edit_event", checkAccess(["CLASS", "EDITOR"]), eventController.editEvent);
router.post("/delete_event", checkAccess(["CLASS", "EDITOR"]), eventController.deleteEvent);
router.get("/get_event_type_data", checkAccess(["CLASS"]), eventController.getEventTypeData);
router.post("/set_event_type_data", checkAccess(["CLASS", "MANAGER"]), eventController.setEventTypeData);
router.get("/event_type_styles", checkAccess(["CLASS"]), eventController.getEventTypeStyles);

export default router;
