import logger from "../utils/logger";
import {
  redisClient,
  cacheExpiration,
  cacheKeyEventData,
  cacheKeyEventTypeData,
} from "../config/redis";
import socketIO from "../config/socket";
import sass from "sass";

import prisma from "../config/prisma";
import {
  isValidColor,
  isValidTeamId,
  lessonDateEventAtLeastOneNull,
  updateCacheData,
  BigIntreplacer,
} from "../utils/validateFunctions";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";

export const eventService = {
  async getEventData() {
    const cachedEventData = await redisClient.get("event_data");

    if (cachedEventData) {
      try {
        return JSON.parse(cachedEventData);
      } catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const eventData = await prisma.event.findMany({
      orderBy: {
        startDate: "asc",
      },
    });

    try {
      await updateCacheData(eventData, cacheKeyEventData);
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return JSON.stringify(eventData, BigIntreplacer);
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
    const {
      eventTypeId,
      name,
      description,
      startDate,
      lesson,
      endDate,
      teamId,
    } = reqData;
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true,
      };
      throw err;
    }
    lessonDateEventAtLeastOneNull(endDate, lesson);
    isValidTeamId(teamId);
    try {
      await prisma.event.create({
        data: {
          eventTypeId: eventTypeId,
          name: name,
          description: description,
          startDate: startDate,
          lesson: lesson,
          endDate: endDate,
          teamId: teamId,
        },
      });
    } catch {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true,
      };
      throw err;
    }
    const eventData = await prisma.event.findMany({
      orderBy: {
        startDate: "asc",
      },
    });
    try {
      await updateCacheData(eventData, cacheKeyEventData);
      const io = socketIO.getIO();
      io.emit("updateEventData");
    } catch (err) {
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
    const {
      eventId,
      eventTypeId,
      name,
      description,
      startDate,
      lesson,
      endDate,
      teamId,
    } = reqData;
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true,
      };
      throw err;
    }
    lessonDateEventAtLeastOneNull(endDate, lesson);
    isValidTeamId(teamId);
    try {
      await prisma.event.update({
        where: { eventId: eventId },
        data: {
          eventTypeId: eventTypeId,
          name: name,
          description: description,
          startDate: startDate,
          lesson: lesson,
          endDate: endDate,
          teamId: teamId,
        },
      });
    } catch {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true,
      };
      throw err;
    }

    const eventData = await prisma.event.findMany({
      orderBy: {
        startDate: "asc",
      },
    });
    try {
      await updateCacheData(eventData, cacheKeyEventData);
      const io = socketIO.getIO();
      io.emit("updateEventData");
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
  async deleteEvent(eventId: number, session: Session & Partial<SessionData>) {
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true,
      };
      throw err;
    }
    if (!eventId) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true,
      };
      throw err;
    }
    await prisma.event.delete({
      where: {
        eventId: eventId,
      },
    });

    const eventData = await prisma.event.findMany({
      orderBy: {
        startDate: "asc",
      },
    });
    try {
      await updateCacheData(eventData, cacheKeyEventData);
      const io = socketIO.getIO();
      io.emit("updateEventData");
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
  async getEventTypeData() {
    const cachedEventTypeData = await redisClient.get("event_type_data");

    if (cachedEventTypeData) {
      try {
        return JSON.parse(cachedEventTypeData);
      } catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const eventTypeData = await prisma.eventType.findMany();

    try {
      await updateCacheData(eventTypeData, cacheKeyEventTypeData);
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return eventTypeData;
  },
  async setEventTypeData(
    eventTypes: { eventTypeId: number | ""; name: string; color: string }[]
  ) {
    const existingEventTypes = await prisma.eventType.findMany();
    await Promise.all(
      existingEventTypes.map(async eventType => {
        if (!eventTypes.some(e => e.eventTypeId === eventType.eventTypeId)) {
          await prisma.eventType.delete({
            where: { eventTypeId: eventType.eventTypeId },
          });
        }
      })
    );

    for (const eventType of eventTypes) {
      isValidColor(eventType.color);
      if (eventType.name.trim() == "") {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data format",
          expected: true,
        };
        throw err;
      }
      try {
        if (eventType.eventTypeId == "") {
          await prisma.eventType.create({
            data: {
              name: eventType.name,
              color: eventType.color,
            },
          });
        } else {
          await prisma.eventType.update({
            where: { eventTypeId: eventType.eventTypeId },
            data: {
              name: eventType.name,
              color: eventType.color,
            },
          });
        }
      } catch {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data format",
          expected: true,
        };
        throw err;
      }
    }

    const eventTypeData = await prisma.eventType.findMany();

    try {
      await updateCacheData(eventTypeData, cacheKeyEventTypeData);
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
    this.updateEventTypeStyles();
  },
  async getEventTypeStyles() {
    const cachedEventTypeStyles = await redisClient.get("event_type_styles");

    if (cachedEventTypeStyles) {
      try {
        return cachedEventTypeStyles;
      } catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const eventTypeStyles = await this.updateEventTypeStyles();

    return eventTypeStyles;
  },
  async updateEventTypeStyles() {
    const eventTypeData = await this.getEventTypeData();
    const scss = `
      @use "sass:color";

      ${eventTypeData
        .map(
          (eventType: { eventTypeId: string; name: string; color: string }) => {
            return `$event-${eventType.eventTypeId}: ${eventType.color};`;
          }
        )
        .join("")}

      $event-colors: (
        ${eventTypeData
          .map(
            (eventType: {
              eventTypeId: string;
              name: string;
              color: string;
            }) => {
              return `${eventType.eventTypeId}: $event-${eventType.eventTypeId},`;
            }
          )
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

    try {
      await redisClient.set("event_type_styles", css, { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return css;
  },
};

export default eventService;
