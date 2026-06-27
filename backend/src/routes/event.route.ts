import express from "express";
import rateLimit from "express-rate-limit";
import eventController from "../controllers/event.controller.js";
import checkAccess from "../middleware/access.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { addEventSchema, deleteEventSchema, editEventSchema, setEventTypesSchema, pinEventSchema } from "../schemas/event.schema.js";

// event rate limiters
const readEventLimiter = rateLimit({ windowMs: 1000, limit: 30 });
const writeEventLimiter = rateLimit({ windowMs: 1000, limit: 10 });

const router = express.Router();

router.get("/", readEventLimiter, checkAccess(["CLASS"]), eventController.getEventData);
router.get("/types", readEventLimiter, checkAccess(["CLASS"]), eventController.getEventTypeData);
router.get("/types/styles", readEventLimiter, eventController.getEventTypeStyles);

// write routes only require class access at the route level; the service decides
// shared vs personal: shared items still require EDITOR, personal items only require
// a logged-in account (enforced via assertPermissionLevel inside event.service)
router.post("/", writeEventLimiter, checkAccess(["CLASS"]), validate(addEventSchema), eventController.addEvent);
router.patch("/:id", writeEventLimiter, checkAccess(["CLASS"]), validate(editEventSchema), eventController.editEvent);
router.delete("/:id", writeEventLimiter, checkAccess(["CLASS"]), validate(deleteEventSchema), eventController.deleteEvent);

router.patch("/:id/pin", writeEventLimiter, checkAccess(["CLASS"]), validate(pinEventSchema), eventController.pinEvent);
router.put("/types", writeEventLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setEventTypesSchema), eventController.setEventTypeData);

export default router;
