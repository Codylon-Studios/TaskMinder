import { Request, Response, NextFunction } from "express";
import eventService from "../services/event.service";

export const getEventData = async (req: Request, res: Response, next: NextFunction): Promise<void>  => {
  try {
    const eventData = await eventService.getEventData(req.session);
    res.status(200).json(eventData);
  }
  catch (error) {
    next(error);
  }
};

export const getEventTypeData = async (req: Request, res: Response, next: NextFunction): Promise<void>  => {
  try {
    const eventTypeData = await eventService.getEventTypeData(req.session);
    res.status(200).json(eventTypeData);
  }
  catch (error) {
    next(error);
  }
};

export const getEventTypeStyles = async (req: Request, res: Response, next: NextFunction): Promise<void>  => {
  try {
    const eventTypeStyles = await eventService.getEventTypeStyles(req.session);
    res.setHeader("Content-Type", "text/css");
    res.status(200).send(eventTypeStyles);
  }
  catch (error) {
    next(error);
  }
};

export const addEvent = async (req: Request, res: Response, next: NextFunction): Promise<void>  => {
  try {
    await eventService.addEvent(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const editEvent = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void>  => {
  try {
    await eventService.editEvent({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void>  => {
  try {
    await eventService.deleteEvent({ id: Number(req.params.id) }, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const pinEvent = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await eventService.pinEvent({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const setEventTypeData = async (req: Request, res: Response, next: NextFunction): Promise<void>  => {
  try {
    await eventService.setEventTypeData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export default {
  getEventData,
  getEventTypeData,
  getEventTypeStyles,
  addEvent,
  editEvent,
  deleteEvent,
  pinEvent,
  setEventTypeData
};
