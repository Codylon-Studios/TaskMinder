import eventService from "../services/eventService";
import asyncHandler from "express-async-handler";
import { z } from "zod";

export const getEventData = asyncHandler(async (req, res, next) => {
  try {
    const eventData = await eventService.getEventData(req.session);
    res.status(200).json(eventData);
  }
  catch (error) {
    next(error);
  }
});

export const addEvent = asyncHandler(async (req, res, next) => {
  const addEventSchema = z.object({
    eventTypeId: z.coerce.number(),
    name: z.string(),
    description: z.string().nullable(),
    startDate: z.coerce.number(),
    lesson: z.string().nullable(),
    endDate: z.preprocess(val => {
      if (val == "") return null;
      return val;
    }, z.coerce.number().nullable()),
    teamId: z.coerce.number()
  });
  const parseResult = addEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          eventTypeId: { type: "number" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          startDate: { type: "number" },
          lesson: { type: ["string", "null"] },
          endDate: { type: ["number", "null"] },
          teamId: { type: "number" }
        },
        required: ["eventTypeId", "name", "startDate", "teamId"]
      }
    });
    return;
  }
  try {
    await eventService.addEvent(parseResult.data, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const editEvent = asyncHandler(async (req, res, next) => {
  const addEventSchema = z.object({
    eventId: z.coerce.number(),
    eventTypeId: z.coerce.number(),
    name: z.string(),
    description: z.string().nullable(),
    startDate: z.coerce.number(),
    lesson: z.string().nullable(),
    endDate: z.coerce.number().nullable(),
    teamId: z.coerce.number()
  });
  const parseResult = addEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          eventId: { type: "number" },
          eventTypeId: { type: "number" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          startDate: { type: "number" },
          lesson: { type: ["string", "null"] },
          endDate: { type: ["number", "null"] },
          teamId: { type: "number" }
        },
        required: ["eventId", "eventTypeId", "name", "startDate", "teamId"]
      }
    });
    return;
  }
  try {
    await eventService.editEvent(parseResult.data, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const deleteEvent = asyncHandler(async (req, res, next) => {
  const deleteEventSchema = z.object({
    eventId: z.coerce.number()
  });
  const parseResult = deleteEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          eventId: { type: "number" }
        },
        required: ["eventId"]
      }
    });
    return;
  }
  try {
    await eventService.deleteEvent(parseResult.data.eventId, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const getEventTypeData = asyncHandler(async (req, res, next) => {
  try {
    const eventTypeData = await eventService.getEventTypeData(req.session);
    res.status(200).json(eventTypeData);
  }
  catch (error) {
    next(error);
  }
});

export const setEventTypeData = asyncHandler(async (req, res, next) => {
  const setEventTypesSchema = z.object({
    eventTypes: z.array(
      z.object({
        eventTypeId: z.union([z.coerce.number(), z.literal("")]),
        name: z.string(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
      })
    )
  });
  const parseResult = setEventTypesSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          eventTypes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                eventTypeId: { anyOf: [{ type: "number" }, { const: "" }] },
                name: { type: "string" },
                color: { type: "string", pattern: "/^#[0-9a-fA-F]{6}$/" }
              },
              required: ["eventTypeId", "name", "color"]
            }
          }
        },
        required: ["eventTypes"]
      }
    });
    return;
  }
  try {
    await eventService.setEventTypeData(parseResult.data.eventTypes, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const getEventTypeStyles = asyncHandler(async (req, res, next) => {
  try {
    const eventTypeStyles = await eventService.getEventTypeStyles(req.session);
    res.setHeader("Content-Type", "text/css");
    res.status(200).send(eventTypeStyles);
  }
  catch (error) {
    next(error);
  }
});

export default {
  getEventData,
  addEvent,
  editEvent,
  deleteEvent,
  getEventTypeData,
  setEventTypeData,
  getEventTypeStyles
};
