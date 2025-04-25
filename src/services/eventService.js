const logger = require("../../logger");
const { redisClient, cacheExpiration } = require("../config/constant");
const socketIO = require("../config/socket");
const sass = require("sass");

const EventType = require("../models/eventType");
const Event = require("../models/event");

const eventService = {
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

    const data = await Event.findAll({ raw: true, order: [["startDate", "ASC"]]});

    try {
      await redisClient.set("event_data", JSON.stringify(data), { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return data;
  },
  async addEvent(eventTypeId, name, description, startDate, lesson, endDate, teamId, session) {
    if (!(session.account)) {
      let err = new Error("User not logged in");
      err.status = 401;
      err.expected = true;
      throw err;
    }
    try {
      await Event.create({
        eventTypeId: eventTypeId,
        name: name,
        description: description,
        startDate: startDate,
        lesson: lesson,
        endDate: endDate,
        teamId: teamId
      });
    }
    catch {
      let err = new Error("Bad Request");
      err.status = 400;
      err.expected = true;
      throw err;
    }
    const data = await Event.findAll({ raw: true, order: [["startDate", "ASC"]] });
    try {
      await redisClient.set("event_data", JSON.stringify(data), { EX: cacheExpiration });
      const io = socketIO.getIO();
      io.emit("updateEventData");
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
  async editEvent(eventId, eventTypeId, name, description, startDate, lesson, endDate, teamId, session) {
    if (!(session.account)) {
      let err = new Error("User not logged in");
      err.status = 401;
      err.expected = true;
      throw err;
    }
    try {
      await Event.update(
        {
          eventTypeId: eventTypeId,
          name: name,
          description: description,
          startDate: startDate,
          lesson: lesson,
          endDate: endDate,
          teamId: teamId
        },
        {
          where: { eventId: eventId }
        }
      );
    }
    catch {
      let err = new Error("Bad Request");
      err.status = 400;
      err.expected = true;
      throw err;
    }
    
    const data = await Event.findAll({ raw: true, order: [["startDate", "ASC"]] });
    try {
      await redisClient.set("event_data", JSON.stringify(data), { EX: cacheExpiration });
      const io = socketIO.getIO();
      io.emit("updateEventData");
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
  async deleteEvent(eventId, session) {
    if (!(session.account)) {
      let err = new Error("User not logged in");
      err.status = 401;
      err.expected = true;
      throw err;
    }
    if (!eventId) {
      let err = new Error("Bad Request");
      err.status = 400;
      err.expected = true;
      throw err;
    }
    await Event.destroy({
      where: {
        eventId: eventId
      }
    });
    
    const data = await Event.findAll({ raw: true });
    try {
      await redisClient.set("event_data", JSON.stringify(data), { EX: cacheExpiration });
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

    const data = await EventType.findAll({ raw: true });

    try {
      await redisClient.set("event_type_data", JSON.stringify(data), { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return data;
  },
  async setEventTypeData(eventTypes) {
    if (! Array.isArray(eventTypes)) {
      let err = new Error("Bad Request");
      err.status = 400;
      err.expected = true;
      throw err;
    }

    let existingEventTypes = await EventType.findAll({ raw: true });
    await Promise.all(existingEventTypes.map(async (eventType) => {
      if (!eventTypes.some((e) => e.eventTypeId === eventType.eventTypeId)) {
        await EventType.destroy({
          where: { eventTypeId: eventType.eventTypeId }
        });
      }
    }));

    for (let eventType of eventTypes) {
      if (eventType.name.trim() == "") {
        let err = new Error("Bad Request");
        err.status = 400;
        err.expected = true;
        throw err;
      }
      try {
        if (eventType.eventTypeId == "") {
          await EventType.create({
            name: eventType.name,
            color: eventType.color
          })
        }
        else {
          await EventType.update(
            {
              name: eventType.name,
              color: eventType.color
            },
            {
              where: { eventTypeId: eventType.eventTypeId }
            }
          );
        }
      }
      catch {
        let err = new Error("Bad Request");
        err.status = 400;
        err.expected = true;
        throw err;
      }
    }

    const data = await EventType.findAll({ raw: true });
    await redisClient.set("event_type_data", JSON.stringify(data), { EX: cacheExpiration });

    try {
      await redisClient.set("event_type_data", JSON.stringify(data), { EX: cacheExpiration });
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
    let eventTypeData = await this.getEventTypeData();
    let scss = `
      @use "sass:color";

      ${eventTypeData.map((eventType) => {
        return `$event-${eventType.eventTypeId}: ${eventType.color};`
      }).join("")}

      $event-colors: (
        ${eventTypeData.map((eventType) => {
          return `${eventType.eventTypeId}: $event-${eventType.eventTypeId},`
        }).join("")}
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
          span.event-#{"" + $name} {
            color: $color-darker;
          }

          &[data-bs-theme="dark"] {
            span.event-#{"" + $name} {
              color: $color-lighter;
            }
          }
        }
      }`
    let css = sass.compileString(scss).css;

    try {
      await redisClient.set("event_type_styles", css, { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return css;
  }
}

module.exports = eventService;
