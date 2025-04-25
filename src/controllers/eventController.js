const logger = require("../../logger");
const eventService = require("../services/eventService");
const asyncHandler = require("express-async-handler");

exports.eventController = {
  getEventData: asyncHandler(async(req, res, next) => {
    try {
      const eventData = await eventService.getEventData();
      res.status(200).json(eventData);
    } catch (error) {
      next(error);
    }
  }),
  addEvent: asyncHandler(async(req, res, next) => {
    const { eventTypeId, name, description, startDate, lesson, endDate, teamId } = req.body;
    try {
      await eventService.addEvent(eventTypeId, name, description, startDate, lesson, endDate, teamId, req.session);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }),
  editEvent: asyncHandler(async(req, res, next) => {
    const { eventId, eventTypeId, name, description, startDate, lesson, endDate, teamId } = req.body;
    try {
      await eventService.editEvent(eventId, eventTypeId, name, description, startDate, lesson, endDate, teamId, req.session);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }),
  deleteEvent: asyncHandler(async (req, res, next) => {
    const { eventId } = req.body;
    try {
      await eventService.deleteEvent(eventId, req.session);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }),
  getEventTypeData: asyncHandler(async(req, res, next) => {
    try {
      const eventTypeData = await eventService.getEventTypeData();
      res.status(200).json(eventTypeData);
    } catch (error) {
      next(error);
    }
  }),
  setEventTypeData: asyncHandler(async(req, res, next) => {
    const { eventTypes } = req.body;
    try {
      await eventService.setEventTypeData(eventTypes);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }),
  getEventTypeStyles: asyncHandler(async(req, res, next) => {
    try {
      const eventTypeStyles = await eventService.getEventTypeStyles();
      res.setHeader("Content-Type", "text/css");
      res.status(200).send(eventTypeStyles);
    } catch (error) {
      next(error);
    }
  }),
};
