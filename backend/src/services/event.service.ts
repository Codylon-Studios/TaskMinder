import logger from "../config/logger";
import { redisClient, cacheExpiration, CACHE_KEY_PREFIXES, generateCacheKey } from "../config/redis";
import socketIO, { SOCKET_EVENTS } from "../config/socket";
import sass from "sass";
import { default as prisma } from "../config/prisma";
import {
  isValidColor,
  isValidTeamId,
  lessonDateEventAtLeastOneNull,
  updateCacheData,
  BigIntreplacer,
  invalidateCache,
  isValidEventTypeId
} from "../utils/validate.functions";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import { addEventTypeBody, deleteEventTypeBody, editEventTypeBody, setEventTypesTypeBody, pinEventTypeBody } from "../schemas/event.schema";

const MAX_PINNED_EVENT = 3;

const inFlightStyleBuild = new Map<number, Promise<string>>();

export const eventService = {
  async getEventData(session: Session & Partial<SessionData>) {
    // get cache key from class to fetch from cache
    const getEventDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENT, session.classId!);

    const cachedEventData = await redisClient.get(getEventDataCacheKey);

    if (cachedEventData) {
      try {
        return JSON.parse(cachedEventData);
      }
      catch (error) {
        logger.error(`Error parsing Redis data: ${error}`);
        throw new Error();
      }
    }
    // no cache data available, fetch from database and update cache
    const eventData = await prisma.event.findMany({
      where: {
        classId: parseInt(session.classId!)
      },
      orderBy: [
        { startDate: "asc" },
        { endDate: "asc" },
        { name: "asc" },
        { description: "asc" }
      ]
    });

    try {
      await updateCacheData(eventData, getEventDataCacheKey);
    }
    catch (err) {
      logger.error(`Error updating Redis cache: ${err}`);
      throw new Error();
    }

    const stringified = JSON.stringify(eventData, BigIntreplacer);
    return JSON.parse(stringified);
  },

  async pinEvent(reqData: pinEventTypeBody, session: Session & Partial<SessionData>) {
    const { eventId, pinStatus } = reqData;

    // look if there are more than 3 simultaneously pinned events
    const countPinned = await prisma.event.count({
      where: {
        classId: parseInt(session.classId!, 10),
        isPinned: true
      }
    });

    if (countPinned >= MAX_PINNED_EVENT && pinStatus === true) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: `Cannot pin event: maximum of ${MAX_PINNED_EVENT} pinned event items reached. 
        Please unpin an existing event item first.`,
        expected: true
      };
      throw err;
    }

    const updated = await prisma.event.updateMany({
      where: {
        eventId: eventId,
        classId: parseInt(session.classId!, 10)
      },
      data: {
        isPinned: pinStatus
      }
    });

    if (updated.count === 0) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Event not found",
        expected: true
      };
      throw err;
    }

    await invalidateCache("EVENT", session.classId!);
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.EVENTS);
  },

  async addEvent(
    reqData: addEventTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { eventTypeId, name, description, startDate, lesson, endDate, teamId } = reqData;
    lessonDateEventAtLeastOneNull(endDate, lesson);
    await isValidTeamId(teamId, session);
    await isValidEventTypeId(eventTypeId, session);
    try {
      await prisma.event.create({
        data: {
          eventTypeId: eventTypeId,
          classId: parseInt(session.classId!, 10),
          isPinned: false,
          name: name,
          description: description,
          startDate: startDate,
          lesson: lesson,
          endDate: endDate,
          teamId: teamId,
          createdAt: Date.now()
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

    // invalidate cache
    await invalidateCache("EVENT", session.classId!);
    // send socket event
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.EVENTS);
  },

  async editEvent(
    reqData: editEventTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { eventId, eventTypeId, name, description, startDate, lesson, endDate, teamId } = reqData;
    lessonDateEventAtLeastOneNull(endDate, lesson);
    await isValidTeamId(teamId, session);
    await isValidEventTypeId(eventTypeId, session);
    try {
      const updated = await prisma.event.updateMany({
        where: {
          eventId: eventId,
          classId: parseInt(session.classId!, 10)
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
      // if affected rows is 0 -> throw error
      if (updated.count === 0) {
        const err: RequestError = {
          name: "Not Found",
          status: 404,
          message: "Event not found for update",
          expected: true
        };
        throw err;
      }
    }
    catch (e) {
      if ((e as RequestError)?.expected) throw e;

      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }

    // invalidate cache
    await invalidateCache("EVENT", session.classId!);
    // send socket event
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.EVENTS);
  },

  async deleteEvent(reqData: deleteEventTypeBody, session: Session & Partial<SessionData>) {
    const { eventId } = reqData;

    const deleted = await prisma.event.deleteMany({
      where: {
        eventId: eventId,
        classId: parseInt(session.classId!, 10)
      }
    });

    if (deleted.count === 0) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Event not found",
        expected: true
      };
      throw err;
    }

    // invalidate cache
    await invalidateCache("EVENT", session.classId!);
    // send socket event
    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.EVENTS);
  },

  async getEventTypeData(session: Session & Partial<SessionData>) {
    const getEventTypeDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENTTYPE, session.classId!);
    const cachedEventTypeData = await redisClient.get(getEventTypeDataCacheKey);

    if (cachedEventTypeData) {
      try {
        return JSON.parse(cachedEventTypeData);
      }
      catch (error) {
        logger.error(`Error parsing Redis data: ${error}`);
        throw new Error();
      }
    }

    const eventTypeData = await prisma.eventType.findMany({
      where: {
        classId: parseInt(session.classId!, 10)
      },
      orderBy: {
        name: "asc"
      }
    });

    try {
      await updateCacheData(eventTypeData, getEventTypeDataCacheKey);
    }
    catch (err) {
      logger.error(`Error updating Redis cache: ${err}`);
      throw new Error();
    }

    return eventTypeData;
  },

  async setEventTypeData(
    reqData: setEventTypesTypeBody,
    session: Session & Partial<SessionData>) {
    const { eventTypes } = reqData;
    const classId = parseInt(session.classId!, 10);

    await prisma.$transaction(async tx => {
      const existingEventTypes = await tx.eventType.findMany({
        where: { classId }
      });

      // Delete removed event types (scoped)
      for (const existing of existingEventTypes) {
        if (!eventTypes.some(e => e.eventTypeId === existing.eventTypeId)) {
          await tx.eventType.deleteMany({
            where: { eventTypeId: existing.eventTypeId, classId }
          });
          await tx.event.deleteMany({
            where: { eventTypeId: existing.eventTypeId, classId }
          });
        }
      }

      // Create or update event types
      for (const eventType of eventTypes) {
        isValidColor(eventType.color);
        if (eventType.name.trim() === "") {
          const err: RequestError = {
            name: "Bad Request",
            status: 400,
            message: "Invalid data format",
            expected: true
          };
          throw err;
        }

        if (eventType.eventTypeId === "") {
          await tx.eventType.create({
            data: {
              classId,
              name: eventType.name,
              color: eventType.color,
              createdAt: Date.now()
            }
          });
        }
        else {
          const updated = await tx.eventType.updateMany({
            where: { eventTypeId: eventType.eventTypeId, classId },
            data: {
              name: eventType.name,
              color: eventType.color
            }
          });

          if (updated.count === 0) {
            const err: RequestError = {
              name: "Not Found",
              status: 404,
              message: "Event type not found for update",
              expected: true
            };
            throw err;
          }
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
      const io = socketIO.getIO();
      io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.EVENT_TYPES);
    }
    catch (err) {
      logger.error(`Error updating Redis cache: ${err}`);
      throw new Error();
    }

    try {
      await this.updateEventTypeStyles(session);
    }
    catch (e) {
      logger.error(String(e));
    }
  },

  async getEventTypeStyles(session: Session & Partial<SessionData>) {
    if (!session.classId) {
      return "";
    }

    const setEventTypeStylesCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENTTYPESTYLE, session.classId);

    const cachedEventTypeStyles = await redisClient.get(setEventTypeStylesCacheKey);

    if (cachedEventTypeStyles) {
      try {
        return cachedEventTypeStyles;
      }
      catch (error) {
        logger.error(`Error parsing Redis data: ${error}`);
        throw new Error();
      }
    }

    const eventTypeStyles = await this.updateEventTypeStyles(session);

    return eventTypeStyles;
  },

  async updateEventTypeStyles(session: Session & Partial<SessionData>) {
    // session.classId certainly exists here
    // this function is called by getEventTypeStyles(), 
    // which returns "", if no class is in session
    const classId = parseInt(session.classId!, 10);

    // “singleflight” deduplication: 
    // spamming the endpoint doesn’t spawn many concurrent Sass compiles (prevents CPU spikes)
    const existing = inFlightStyleBuild.get(classId);
    if (existing) return existing;

    const buildPromise = (async () => {
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
        $color-more-darker: color.adjust($color, $lightness: -60%);
        $color-more-lighter: color.adjust($color, $lightness: 40%);
        $bg-select: color.change($color: $color, $alpha: 0.6);

        .card.event-#{"" + $name} {
          border-color: $color;
          background-color: $bg-transparent;
        }

        .days-overview-day .event-#{"" + $name} {
          background-color: $color;
        }

        span.event-#{"" + $name}, a.event-#{"" + $name}, i.event-#{"" + $name} {
          color: $color-darker;
        }

        .color-display.event-#{"" + $name} {
          background-color: $color;
        }

        :not([data-high-contrast="true"]) {
          .event-#{"" + $name}::selection, .event-#{"" + $name} ::selection {
            background-color: $bg-select;
          }
        }

        [data-bs-theme="dark"] {
          span.event-#{"" + $name}, a.event-#{"" + $name}, i.event-#{"" + $name} {
            color: $color-lighter;
          }
        }

        [data-high-contrast="true"] {
          span.event-#{"" + $name}, a.event-#{"" + $name}, i.event-#{"" + $name} {
            color: $color-more-darker;
          }

          &[data-bs-theme="dark"] {
            span.event-#{"" + $name}, a.event-#{"" + $name}, i.event-#{"" + $name} {
              color: $color-more-lighter;
            }
          }
        }
      }`;
      const css = sass.compileString(scss).css;

      const updateEventTypeStylesCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENTTYPESTYLE, session.classId!);

      try {
        await redisClient.set(updateEventTypeStylesCacheKey, css, { EX: cacheExpiration });
      }
      catch (err) {
        logger.error(`Error updating Redis cache: ${err}`);
        throw new Error();
      }

      return css;
    })().finally(() => {
      inFlightStyleBuild.delete(classId);
    });

    inFlightStyleBuild.set(classId, buildPromise);
    return buildPromise;
  }
};

export default eventService;
