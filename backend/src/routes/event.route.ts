import express from "express";
import rateLimit from "express-rate-limit";
import eventController from "../controllers/event.controller";
import checkAccess from "../middleware/access.middleware";
import { validate } from "../middleware/validation.middleware";
import { addEventSchema, deleteEventSchema, editEventSchema, setEventTypesSchema } from "../schemas/event.schema";

// rate limiter
const eventLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});


const router = express.Router();

router.get("/get_event_data", eventLimiter, checkAccess(["CLASS"]), eventController.getEventData);
router.post("/add_event", eventLimiter, checkAccess(["CLASS", "EDITOR"]), validate(addEventSchema), eventController.addEvent);
router.post("/edit_event", eventLimiter, checkAccess(["CLASS", "EDITOR"]), validate(editEventSchema), eventController.editEvent);
router.post("/delete_event", eventLimiter, checkAccess(["CLASS", "EDITOR"]), validate(deleteEventSchema), eventController.deleteEvent);
router.get("/get_event_type_data", eventLimiter, checkAccess(["CLASS"]), eventController.getEventTypeData);
router.post("/set_event_type_data", eventLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setEventTypesSchema), eventController.setEventTypeData);
router.get("/event_type_styles", eventLimiter, eventController.getEventTypeStyles);

export default router;
