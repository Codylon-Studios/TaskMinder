import { mock, describe, it, expect, beforeEach } from "bun:test";
import eventService from "../services/eventService";
import { Session, SessionData } from "express-session";
import { addEventTypeBody, deleteEventTypeBody, editEventTypeBody, setEventTypesTypeBody } from "../schemas/eventSchema";

// Mock Prisma
const mockPrismaClient = {
  event: {
    findMany: mock(),
    create: mock(),
    update: mock(),
    delete: mock()
  },
  eventType: {
    findMany: mock(),
    create: mock(),
    update: mock(),
    delete: mock()
  },
  $transaction: mock()
};
mock.module("../config/prisma", () => ({ default: mockPrismaClient }));

// Mock Redis
const mockRedisClient = {
  get: mock(),
  set: mock(),
  del: mock()
};
// also mock the named exports
mock.module("../config/redis", () => ({
  redisClient: mockRedisClient,
  cacheExpiration: 3600,
  CACHE_KEY_PREFIXES: {
    EVENT: "event",
    EVENTTYPE: "eventtype",
    EVENTTYPESTYLE: "eventtypestyle"
  },
  generateCacheKey: (prefix: string, classId: string | number) => `${prefix}:${classId}`
}));

// Mock Socket.IO
const mockSocketIO = {
  getIO: mock()
};
const mockIO = {
  emit: mock()
};
mock.module("../config/socket", () => ({ default: mockSocketIO }));

// Mock Logger
const mockLogger = {
  info: mock(),
  warn: mock(),
  error: mock(),
  debug: mock()
};
mock.module("../utils/logger", () => ({ default: mockLogger }));


// Mock sass
const mockSass = {
  compileString: mock()
};
mock.module("sass", () => ({ default: mockSass }));

// Mock validateFunctions
const mockValidateFunctions = {
  isValidTeamId: mock(),
  isValidColor: mock(),
  isValidSubjectId: mock(),
  updateCacheData: mock(),
  BigIntreplacer: mock(),
  lessonDateEventAtLeastOneNull: mock()
};
mock.module("../utils/validateFunctions", () => mockValidateFunctions);

describe("eventService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPrismaClient.event.findMany.mockClear();
    mockPrismaClient.event.create.mockClear();
    mockPrismaClient.event.update.mockClear();
    mockPrismaClient.event.delete.mockClear();
    mockPrismaClient.eventType.findMany.mockClear();
    mockPrismaClient.eventType.create.mockClear();
    mockPrismaClient.eventType.update.mockClear();
    mockPrismaClient.eventType.delete.mockClear();
    mockPrismaClient.$transaction.mockClear();

    mockRedisClient.get.mockClear();
    mockRedisClient.set.mockClear();
    mockRedisClient.del.mockClear();

    mockSocketIO.getIO.mockClear();
    mockIO.emit.mockClear();

    mockLogger.error.mockClear();

    mockSass.compileString.mockClear();

    mockValidateFunctions.isValidColor.mockClear();
    mockValidateFunctions.isValidSubjectId.mockClear();
    mockValidateFunctions.isValidTeamId.mockClear();
    mockValidateFunctions.updateCacheData.mockClear();
    mockValidateFunctions.BigIntreplacer.mockClear();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockValidateFunctions.BigIntreplacer.mockImplementation((key: any, value: any) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    });

    // Default mock implementations
    mockPrismaClient.$transaction.mockImplementation(async callback => await callback(mockPrismaClient));
    mockSocketIO.getIO.mockReturnValue(mockIO);
    mockRedisClient.get.mockResolvedValue(null); // Default to cache miss
    mockSass.compileString.mockReturnValue({ css: "/* compiled css */" });
  });

  describe("getEventData", () => {
    it("should return cached event data if available", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const cachedData = [{ eventId: 1, name: "Test Event" }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await eventService.getEventData(session);

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("event:1");
      expect(mockPrismaClient.event.findMany).not.toHaveBeenCalled();
    });

    it("should fetch event data from prisma and cache it if not cached", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const dbData = [{ eventId: 1n, name: "Test Event From DB" }];
      const expectedData = [{ eventId: "1", name: "Test Event From DB" }];
      const { updateCacheData } = await import("../utils/validateFunctions");

      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.event.findMany.mockResolvedValue(dbData);

      const result = await eventService.getEventData(session);

      expect(result).toEqual(expectedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("event:1");
      expect(mockPrismaClient.event.findMany).toHaveBeenCalledWith({
        where: { classId: 1 },
        orderBy: { startDate: "asc" }
      });
      expect(updateCacheData).toHaveBeenCalledWith(dbData, "event:1");
    });

    it("should throw an error if redis data is malformed", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      mockRedisClient.get.mockResolvedValue("malformed json");

      expect(eventService.getEventData(session)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith("Error parsing Redis data:", expect.any(Error));
    });
  });

  describe("addEvent", () => {
    it("should add a new event and update cache", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: addEventTypeBody = {
        eventTypeId: 1,
        name: "Add New Event",
        description: "Event Description",
        startDate: new Date().getTime(),
        lesson: "1-2",
        endDate: null,
        teamId: -1
      };
      
      mockPrismaClient.event.create.mockResolvedValue(true);
      mockPrismaClient.event.findMany.mockResolvedValue([]);

      await eventService.addEvent(reqData, session);

      expect(mockValidateFunctions.lessonDateEventAtLeastOneNull).toHaveBeenCalledWith(reqData.endDate, reqData.lesson);
      expect(mockValidateFunctions.isValidTeamId).toHaveBeenCalledWith(reqData.teamId, session);
      expect(mockPrismaClient.event.create).toHaveBeenCalledWith({
        data: {
          classId: 1,
          ...reqData
        }
      });
      expect(mockPrismaClient.event.findMany).toHaveBeenCalledWith({
        where: { classId: 1 },
        orderBy: { startDate: "asc" }
      });
      expect(mockValidateFunctions.updateCacheData).toHaveBeenCalled();
      expect(mockIO.emit).toHaveBeenCalledWith("updateEventData");
    });

    it("should throw an error for invalid data", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData = {
        eventTypeId: 1,
        name: "New Event",
        description: "Event Description",
        startDate: new Date().getTime(),
        lesson: "1-2",
        endDate: null,
        teamId: null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any; // should be wrong data on purpose
      mockPrismaClient.event.create.mockRejectedValue(new Error("DB error"));

      expect(eventService.addEvent(reqData, session)).rejects.toThrow("Invalid data format");
    });
  });

  describe("editEvent", () => {
    it("should edit an existing event and update cache", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: editEventTypeBody = {
        eventId: 1,
        eventTypeId: 1,
        name: "Edit Updated Event",
        description: "Updated Description",
        startDate: new Date().getTime(),
        lesson: "3-4",
        endDate: null,
        teamId: -1
      };

      await eventService.editEvent(reqData, session);

      expect(mockValidateFunctions.lessonDateEventAtLeastOneNull).toHaveBeenCalledWith(reqData.endDate, reqData.lesson);
      expect(mockValidateFunctions.isValidTeamId).toHaveBeenCalledWith(reqData.teamId, session);
      expect(mockPrismaClient.event.update).toHaveBeenCalledWith({
        where: { eventId: reqData.eventId, classId: 1 },
        data: {
          eventTypeId: reqData.eventTypeId,
          name: reqData.name,
          description: reqData.description,
          startDate: reqData.startDate,
          lesson: reqData.lesson,
          endDate: reqData.endDate,
          teamId: reqData.teamId
        }
      });
      expect(mockPrismaClient.event.findMany).toHaveBeenCalledWith({
        where: { classId: 1 },
        orderBy: { startDate: "asc" }
      });
      expect(mockValidateFunctions.updateCacheData).toHaveBeenCalled();
      expect(mockIO.emit).toHaveBeenCalledWith("updateEventData");
    });

    it("should throw an error for invalid data", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData = {
        eventId: 1,
        eventTypeId: 1,
        name: "Updated Event",
        description: "Updated Description",
        startDate: new Date().getTime(),
        lesson: "3-4",
        endDate: null,
        teamId: null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any; // should be wrong data on purpose
      mockPrismaClient.event.update.mockRejectedValue(new Error("DB error"));

      expect(eventService.editEvent(reqData, session)).rejects.toThrow("Invalid data format");
    });
  });

  describe("deleteEvent", () => {
    it("should delete an event and update cache", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: deleteEventTypeBody = { eventId: 1 };
      const { updateCacheData } = await import("../utils/validateFunctions");

      await eventService.deleteEvent(reqData, session);

      expect(mockPrismaClient.event.delete).toHaveBeenCalledWith({
        where: { eventId: reqData.eventId, classId: 1 }
      });
      expect(mockPrismaClient.event.findMany).toHaveBeenCalledWith({
        where: { classId: 1 },
        orderBy: { startDate: "asc" }
      });
      expect(updateCacheData).toHaveBeenCalled();
      expect(mockIO.emit).toHaveBeenCalledWith("updateEventData");
    });

    it("should throw an error if eventId is missing", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reqData = { eventId: undefined } as any; // should be wrong data on purpose

      expect(eventService.deleteEvent(reqData, session)).rejects.toThrow("Invalid data format");
    });
  });

  describe("getEventTypeData", () => {
    it("should return cached event type data if available", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const cachedData = [{ eventTypeId: "1", name: "Exam", color: "#ff0000" }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await eventService.getEventTypeData(session);

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("eventtype:1");
      expect(mockPrismaClient.eventType.findMany).not.toHaveBeenCalled();
    });

    it("should fetch event type data from prisma and cache it if not cached", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const dbData = [{ eventTypeId: "1", name: "Exam", color: "#ff0000" }];
      const { updateCacheData } = await import("../utils/validateFunctions");
      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.eventType.findMany.mockResolvedValue(dbData);

      const result = await eventService.getEventTypeData(session);

      expect(result).toEqual(dbData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("eventtype:1");
      expect(mockPrismaClient.eventType.findMany).toHaveBeenCalledWith({
        where: { classId: 1 }
      });
      expect(updateCacheData).toHaveBeenCalledWith(dbData, "eventtype:1");
    });
  });

  describe("setEventTypeData", () => {
    const session = { classId: "1" } as Session & Partial<SessionData>;

    it("should create a new event type", async () => {
      const reqData: setEventTypesTypeBody = {
        eventTypes: [{ eventTypeId: "", name: "New Type", color: "#123456" }]
      };

      mockPrismaClient.eventType.findMany.mockResolvedValue([]);

      await eventService.setEventTypeData(reqData, session);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(mockValidateFunctions.isValidColor).toHaveBeenCalledWith("#123456");
      expect(mockPrismaClient.eventType.create).toHaveBeenCalledWith({
        data: { classId: 1, name: "New Type", color: "#123456" }
      });
    });

    it("should update an existing event type", async () => {
      const reqData: setEventTypesTypeBody = {
        eventTypes: [{ eventTypeId: 1, name: "Updated Type", color: "#654321" }]
      };
      const existingTypes = [{ eventTypeId: 1, name: "Old Type", color: "#000000" }];

      mockPrismaClient.eventType.findMany.mockResolvedValue(existingTypes);

      await eventService.setEventTypeData(reqData, session);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(mockValidateFunctions.isValidColor).toHaveBeenCalledWith("#654321");
      expect(mockPrismaClient.eventType.update).toHaveBeenCalledWith({
        where: { eventTypeId: 1 },
        data: { classId: 1, name: "Updated Type", color: "#654321" }
      });
    });

    it("should delete an event type not present in the request", async () => {
      const reqData = {
        eventTypes: []
      };
      const existingTypes = [{ eventTypeId: "", name: "Old Type", color: "#000000" }];
      // a mock resolved value must be set for the first call to findMany, and another for the second
      mockPrismaClient.eventType.findMany
        .mockResolvedValueOnce(existingTypes)
        .mockResolvedValueOnce([]);

      await eventService.setEventTypeData(reqData, session);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(mockPrismaClient.eventType.delete).toHaveBeenCalledWith({
        where: { eventTypeId: "" }
      });
    });

    it("should perform a mix of create, update, and delete operations", async () => {
      const reqData: setEventTypesTypeBody = {
        eventTypes: [
          { eventTypeId: 1, name: "Updated", color: "#ffffff" },
          { eventTypeId: "", name: "New", color: "#111111" }
        ]
      };
      const existingTypes = [
        { eventTypeId: 1, name: "Old Update", color: "#000000" },
        { eventTypeId: 3, name: "Old Delete", color: "#222222" }
      ];
      mockPrismaClient.eventType.findMany.mockResolvedValue(existingTypes);

      await eventService.setEventTypeData(reqData, session);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      // Check update
      expect(mockPrismaClient.eventType.update).toHaveBeenCalledWith({
        where: { eventTypeId: 1 },
        data: { classId: 1, name: "Updated", color: "#ffffff" }
      });
      // Check create
      expect(mockPrismaClient.eventType.create).toHaveBeenCalledWith({
        data: { classId: 1, name: "New", color: "#111111" }
      });
      // Check delete
      expect(mockPrismaClient.eventType.delete).toHaveBeenCalledWith({
        where: { eventTypeId: 3 }
      });
    });

    it("should throw an error for event types with an empty name", async () => {
      const reqData: setEventTypesTypeBody = {
        eventTypes: [{ eventTypeId: "", name: " ", color: "#123456" }]
      };
      mockPrismaClient.eventType.findMany.mockResolvedValue([]);

      expect(eventService.setEventTypeData(reqData, session)).rejects.toThrow("Invalid data format");
    });

    it("should update cache and styles after successful transaction", async () => {
      const reqData = { eventTypes: [] };
      const { updateCacheData } = await import("../utils/validateFunctions");

      const originalUpdateStyles = eventService.updateEventTypeStyles;
      const updateStylesSpy = mock().mockResolvedValue("");
      eventService.updateEventTypeStyles = updateStylesSpy;

      await eventService.setEventTypeData(reqData, session);

      expect(mockPrismaClient.eventType.findMany).toHaveBeenCalledTimes(2); // Once in transaction, once after
      expect(updateCacheData).toHaveBeenCalled();
      expect(updateStylesSpy).toHaveBeenCalled();

      eventService.updateEventTypeStyles = originalUpdateStyles; // Clean up spy
    });
  });

  describe("getEventTypeStyles", () => {
    const session = { classId: "1" } as Session & Partial<SessionData>;

    it("should return cached event type styles if available", async () => {
      const cachedStyles = ".event { color: red; }";
      mockRedisClient.get.mockResolvedValue(cachedStyles);

      const result = await eventService.getEventTypeStyles(session);

      expect(result).toBe(cachedStyles);
      expect(mockRedisClient.get).toHaveBeenCalledWith("eventtypestyle:1");
    });

    it("should generate and return styles if not cached", async () => {
      const generatedStyles = ".event-new { color: blue; }";
      mockRedisClient.get.mockResolvedValue(null);

      const originalUpdateStyles = eventService.updateEventTypeStyles;
      const updateStylesSpy = mock().mockResolvedValue(generatedStyles);
      eventService.updateEventTypeStyles = updateStylesSpy;

      const result = await eventService.getEventTypeStyles(session);

      expect(result).toBe(generatedStyles);
      expect(mockRedisClient.get).toHaveBeenCalledWith("eventtypestyle:1");
      expect(updateStylesSpy).toHaveBeenCalledWith(session);

      eventService.updateEventTypeStyles = originalUpdateStyles; // Clean up spy
    });
  });

  describe("updateEventTypeStyles", () => {
    it("should generate CSS and cache it", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const eventTypes = [{ eventTypeId: "exam", name: "Exam", color: "#ff0000" }];
      const expectedCss = ".event-exam { color: red; }";

      const originalGetData = eventService.getEventTypeData;
      const getDataSpy = mock().mockResolvedValue(eventTypes);
      eventService.getEventTypeData = getDataSpy;
      mockSass.compileString.mockReturnValue({ css: expectedCss });

      const result = await eventService.updateEventTypeStyles(session);

      expect(result).toBe(expectedCss);
      expect(getDataSpy).toHaveBeenCalledWith(session);
      expect(mockSass.compileString).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith("eventtypestyle:1", expectedCss, { EX: expect.any(Number) });

      eventService.getEventTypeData = originalGetData;
    });

    it("should throw an error if session.classId is missing", async () => {
      const session = {} as Session & Partial<SessionData>;

      expect(eventService.updateEventTypeStyles(session)).rejects.toThrow("User not logged into class");
    });
  });
});
