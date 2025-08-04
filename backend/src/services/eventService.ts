import logger from "../utils/logger";
import { redisClient, cacheExpiration, CACHE_KEY_PREFIXES, generateCacheKey } from "../config/redis";
import socketIO from "../config/socket";
import sass from "sass";

import prisma from "../config/prisma";
import {
  isValidColor,
  isValidTeamId,
  lessonDateEventAtLeastOneNull,
  updateCacheData,
  BigIntreplacer
} from "../utils/validateFunctions";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";

export const eventService = {
  async getEventData(session: Session & Partial<SessionData>) {

    const getEventDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENT, session.classId!);

    const cachedEventData = await redisClient.get(getEventDataCacheKey);

    if (cachedEventData) {
      try {
        return JSON.parse(cachedEventData);
      }
      catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const eventData = await prisma.event.findMany({
      where: { 
        classId: parseInt(session.classId!)
      },
      orderBy: {
        startDate: "asc"
      }
    });

    try {
      await updateCacheData(eventData, getEventDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    const stringified = JSON.stringify(eventData, BigIntreplacer);
    return JSON.parse(stringified);
  },

  async addEvent(
    reqData: {
      eventTypeId: number;
      name: string;
      description: string | null;
      startDate: number;
      lesson: string | null;
      endDate: number | null;
      teamId: number;
    },
    session: Session & Partial<SessionData>
  ) {
    const { eventTypeId, name, description, startDate, lesson, endDate, teamId } = reqData;
    lessonDateEventAtLeastOneNull(endDate, lesson);
    isValidTeamId(teamId);
    try {
      await prisma.event.create({
        data: {
          eventTypeId: eventTypeId,
          classId: parseInt(session.classId!),
          name: name,
          description: description,
          startDate: startDate,
          lesson: lesson,
          endDate: endDate,
          teamId: teamId
        }
      });
    }
    catch {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }
    const eventData = await prisma.event.findMany({
      where : {
        classId: parseInt(session.classId!)
      },
      orderBy: {
        startDate: "asc"
      }
    });
    const addEventDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENT, session.classId!);

    try {
      await updateCacheData(eventData, addEventDataCacheKey);
      const io = socketIO.getIO();
      io.emit("updateEventData");
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },

  async editEvent(
    reqData: {
      eventId: number;
      eventTypeId: number;
      name: string;
      description: string | null;
      startDate: number;
      lesson: string | null;
      endDate: number | null;
      teamId: number;
    },
    session: Session & Partial<SessionData>
  ) {
    const { eventId, eventTypeId, name, description, startDate, lesson, endDate, teamId } = reqData;
    lessonDateEventAtLeastOneNull(endDate, lesson);
    isValidTeamId(teamId);
    try {
      await prisma.event.update({
        where: { 
          eventId: eventId, 
          classId: parseInt(session.classId!)
        },
        data: {
          eventTypeId: eventTypeId,
          name: name,
          description: description,
          startDate: startDate,
          lesson: lesson,
          endDate: endDate,
          teamId: teamId
        }
      });
    }
    catch {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }

    const eventData = await prisma.event.findMany({
      where: {
        classId: parseInt(session.classId!)
      },
      orderBy: {
        startDate: "asc"
      }
    });
    const editEventDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENT, session.classId!);
    try {
      await updateCacheData(eventData, editEventDataCacheKey);
      const io = socketIO.getIO();
      io.emit("updateEventData");
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },

  async deleteEvent(eventId: number, session: Session & Partial<SessionData>) {
    if (!eventId) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }
    await prisma.event.delete({
      where: {
        eventId: eventId,
        classId: parseInt(session.classId!)
      }
    });

    const eventData = await prisma.event.findMany({
      where: {
        classId: parseInt(session.classId!)
      },
      orderBy: {
        startDate: "asc"
      }
    });
    const deleteEventDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENT, session.classId!);
    try {
      await updateCacheData(eventData, deleteEventDataCacheKey);
      const io = socketIO.getIO();
      io.emit("updateEventData");
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },

  async getEventTypeData(session: Session & Partial<SessionData>) {
    const getEventTypeDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENTTYPE, session.classId!);
    const cachedEventTypeData = await redisClient.get(getEventTypeDataCacheKey);

    if (cachedEventTypeData) {
      try {
        return JSON.parse(cachedEventTypeData);
      }
      catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const eventTypeData = await prisma.eventType.findMany({
      where: {
        classId: parseInt(session.classId!)
      }
    });

    try {
      await updateCacheData(eventTypeData, getEventTypeDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return eventTypeData;
  },

  async setEventTypeData(eventTypes: { eventTypeId: number | ""; name: string; color: string }[], session: Session & Partial<SessionData>) {

    const classId = parseInt(session.classId!);

    await prisma.$transaction(async tx => {
      const existingEventTypes = await tx.eventType.findMany({
        where: { classId }
      });

      // Delete removed event types
      for (const existing of existingEventTypes) {
        if (!eventTypes.some(e => e.eventTypeId === existing.eventTypeId)) {
          await tx.eventType.delete({
            where: { eventTypeId: existing.eventTypeId }
          });
        }
      }

      // Create or update event types
      for (const eventType of eventTypes) {
        isValidColor(eventType.color);
        if (eventType.name.trim() === "") {
          const err: RequestError =  {
            name: "Bad Request",
            status: 400,
            message: "Invalid data format",
            expected: true
          };
          throw err;
        }

        console.log("HIERRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR", eventType.eventTypeId);
        if (eventType.eventTypeId === "") {
          await tx.eventType.create({
            data: {
              classId,
              name: eventType.name,
              color: eventType.color
            }
          });
        }
        else {
          await tx.eventType.update({
            where: { eventTypeId: eventType.eventTypeId },
            data: {
              classId,
              name: eventType.name,
              color: eventType.color
            }
          });
        }
      }
    });


    const eventTypeData = await prisma.eventType.findMany({
      where: {
        classId: parseInt(session.classId!)
      }
    });

    const setEventTypeDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENTTYPE, session.classId!);

    try {
      await updateCacheData(eventTypeData, setEventTypeDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
    this.updateEventTypeStyles(session);
  },

  async getEventTypeStyles(session: Session & Partial<SessionData>) {

    const setEventTypeStylesCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENTTYPESTYLE, session.classId!);

    const cachedEventTypeStyles = await redisClient.get(setEventTypeStylesCacheKey);

    if (cachedEventTypeStyles) {
      try {
        return cachedEventTypeStyles;
      }
      catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const eventTypeStyles = await this.updateEventTypeStyles(session);

    return eventTypeStyles;
  },

  async updateEventTypeStyles(session: Session & Partial<SessionData>) {
    // needed for updateEventTypeStylesCacheKey generation (actually redundant)
    // to avoid type errors
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    const eventTypeData = await this.getEventTypeData(session);
    const scss = `
      @use "sass:color";

      ${eventTypeData
    .map((eventType: { eventTypeId: string; name: string; color: string }) => {
      return `$event-${eventType.eventTypeId}: ${eventType.color};`;
    })
    .join("")}

      $event-colors: (
        ${eventTypeData
    .map((eventType: { eventTypeId: string; name: string; color: string }) => {
      return `${eventType.eventTypeId}: $event-${eventType.eventTypeId},`;
    })
    .join("")}
      );

      @each $name, $color in $event-colors {
        $bg-transparent: color.change($color: $color, $alpha: 0.4);
        $color-darker: color.adjust($color, $lightness: -30%);
        $color-lighter: color.adjust($color, $lightness: 20%);

        .card.event-#{"" + $name} {
          border-color: $color;
          background-color: $bg-transparent;
        }

        .days-overview-day .event-#{"" + $name} {
          background-color: $color;
        }

        body {
          span.event-#{"" + $name}, a.event-#{"" + $name}, i.event-#{"" + $name} {
            color: $color-darker;
          }

          &[data-bs-theme="dark"] {
            span.event-#{"" + $name}, a.event-#{"" + $name}, i.event-#{"" + $name} {
              color: $color-lighter;
            }
          }
        }
      }`;
    const css = sass.compileString(scss).css;

    const updateEventTypeStylesCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENTTYPESTYLE, session.classId);

    try {
      await redisClient.set(updateEventTypeStylesCacheKey, css, { EX: cacheExpiration });
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return css;
  }
};

export default eventService;
