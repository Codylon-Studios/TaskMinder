import eventService from "../services/event.service";
import asyncHandler from "express-async-handler";

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
  try {
    await eventService.addEvent(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const editEvent = asyncHandler(async (req, res, next) => {
  try {
    await eventService.editEvent(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const deleteEvent = asyncHandler(async (req, res, next) => {
  try {
    await eventService.deleteEvent(req.body, req.session);
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
  try {
    await eventService.setEventTypeData(req.body, req.session);
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
