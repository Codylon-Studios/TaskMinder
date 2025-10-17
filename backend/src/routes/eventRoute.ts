import express from "express";
import eventController from "../controllers/eventController";
import checkAccess from "../middleware/accessMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { addEventSchema, deleteEventSchema, editEventSchema, setEventTypesSchema } from "../schemas/eventSchema";

const router = express.Router();

router.get("/get_event_data", checkAccess(["CLASS"]), eventController.getEventData);
router.post("/add_event", checkAccess(["CLASS", "EDITOR"]), validate(addEventSchema), eventController.addEvent);
router.post("/edit_event", checkAccess(["CLASS", "EDITOR"]), validate(editEventSchema), eventController.editEvent);
router.post("/delete_event", checkAccess(["CLASS", "EDITOR"]), validate(deleteEventSchema), eventController.deleteEvent);
router.get("/get_event_type_data", checkAccess(["CLASS"]), eventController.getEventTypeData);
router.post("/set_event_type_data", checkAccess(["CLASS", "MANAGER"]), validate(setEventTypesSchema), eventController.setEventTypeData);
router.get("/event_type_styles", eventController.getEventTypeStyles);

export default router;
