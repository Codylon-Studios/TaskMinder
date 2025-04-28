import express from "express";
import eventController from "../controllers/eventController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_event_data", checkAccess.elseUnauthorized, eventController.getEventData);
router.post("/add_event", checkAccess.elseUnauthorized, eventController.addEvent);
router.post("/edit_event", checkAccess.elseUnauthorized, eventController.editEvent);
router.post("/delete_event", checkAccess.elseUnauthorized, eventController.deleteEvent);
router.get("/get_event_type_data", checkAccess.elseUnauthorized, eventController.getEventTypeData);
router.post("/set_event_type_data", checkAccess.elseUnauthorized, eventController.setEventTypeData);
router.get("/event_type_styles", checkAccess.elseUnauthorized, eventController.getEventTypeStyles);

export default router;
