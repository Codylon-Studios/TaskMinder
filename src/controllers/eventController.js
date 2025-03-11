const logger = require('../../logger');
const eventService = require('../services/eventService');
const asyncHandler = require('express-async-handler');

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
        const { type, name, description, startDate, lesson, endDate, teamId } = req.body;
        try {
            await eventService.addEvent(type, name, description, startDate, lesson, endDate, teamId, req.session);
            res.sendStatus(200);
        } catch (error) {
            next(error);
        }
    }),
    editEvent: asyncHandler(async(req, res, next) => {
        const { eventId, type, name, description, startDate, lesson, endDate, teamId } = req.body;
        try {
            await eventService.editEvent(eventId, type, name, description, startDate, lesson, endDate, teamId, req.session);
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
