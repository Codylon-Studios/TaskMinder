import { mock, describe, it, expect, beforeEach } from "bun:test";
import lessonService from "../services/lessonService";
import { Session, SessionData } from "express-session";
import { setLessonDataTypeBody } from "../schemas/lessonSchema";

// Mock Prisma
const mockPrismaClient = {
  lesson: {
    findMany: mock(),
    create: mock(),
    deleteMany: mock()
  },
  $transaction: mock()
};
mock.module("../config/prisma", () => ({ default: mockPrismaClient }));

// Mock Redis
const mockRedisClient = {
  get: mock(),
  set: mock()
};
mock.module("../config/redis", () => ({
  redisClient: mockRedisClient,
  CACHE_KEY_PREFIXES: {
    LESSON: "lesson"
  },
  generateCacheKey: (prefix: string, classId: string | number) => `${prefix}:${classId}`,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateCacheData: mock().mockImplementation(async (data: any, key: string) => {
    const { BigIntreplacer } = await import("../utils/validateFunctions");
    const stringified = JSON.stringify(data, BigIntreplacer);
    await mockRedisClient.set(key, stringified);
  })
}));

// Mock Logger
const mockLogger = {
  info: mock(),
  warn: mock(),
  error: mock(),
  debug: mock()
};
mock.module("../utils/logger", () => ({ default: mockLogger }));

// Mock validateFunctions
mock.module("../utils/validateFunctions", () => ({
  isValidweekDay: mock(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BigIntreplacer: (key: any, value: any) => (typeof value === "bigint" ? value.toString() : value),
  updateCacheData: mock()
}));


describe("lessonService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPrismaClient.lesson.findMany.mockClear();
    mockPrismaClient.lesson.create.mockClear();
    mockPrismaClient.lesson.deleteMany.mockClear();
    mockPrismaClient.$transaction.mockClear();

    mockRedisClient.get.mockClear();
    mockRedisClient.set.mockClear();

    mockLogger.error.mockClear();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isValidweekDay, updateCacheData } = require("../utils/validateFunctions");
    isValidweekDay.mockClear();
    updateCacheData.mockClear();

    // Default mock implementations
    mockPrismaClient.$transaction.mockImplementation(async callback => await callback(mockPrismaClient));
    mockRedisClient.get.mockResolvedValue(null); // Default to cache miss
  });

  describe("setLessonData", () => {
    const session = { classId: "1" } as Session & Partial<SessionData>;
    const lesson = {
      lessonNumber: 1,
      weekDay: 1,
      teamId: -1,
      subjectId: 1,
      room: "101",
      startTime: new Date().getTime(),
      endTime: new Date().getTime()
    };

    it("should successfully set lesson data", async () => {
      const reqData: setLessonDataTypeBody = { lessons: [lesson] };
      const { isValidweekDay, updateCacheData } = await import("../utils/validateFunctions");

      await lessonService.setLessonData(reqData, session);

      expect(isValidweekDay).toHaveBeenCalledWith(1);
      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(mockPrismaClient.lesson.deleteMany).toHaveBeenCalledWith({ where: { classId: 1 } });
      expect(mockPrismaClient.lesson.create).toHaveBeenCalled();
      expect(mockPrismaClient.lesson.findMany).toHaveBeenCalledWith({ where: { classId: 1 } });
      expect(updateCacheData).toHaveBeenCalled();
    });

    it("should throw an error for invalid classId in session", async () => {
      const invalidSession = { classId: "invalid" } as Session & Partial<SessionData>;
      const reqData = { lessons: [lesson] };

      expect(lessonService.setLessonData(reqData, invalidSession)).rejects.toThrow("Invalid classId in session");
    });

    it("should throw an error for invalid lesson data", async () => {
      const reqData = { lessons: [lesson] };
      mockPrismaClient.lesson.create.mockRejectedValue(new Error("DB error"));

      expect(lessonService.setLessonData(reqData, session)).rejects.toThrow("Invalid data format");
    });
  });

  describe("getLessonData", () => {
    const session = { classId: "1" } as Session & Partial<SessionData>;

    it("should return cached lesson data if available", async () => {
      const cachedData = [{ lessonNumber: 1, room: "101" }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await lessonService.getLessonData(session);

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("lesson:1");
      expect(mockPrismaClient.lesson.findMany).not.toHaveBeenCalled();
    });

    it("should fetch lesson data from prisma and cache it if not cached", async () => {
      const dbData = [{ lessonId: 1, lessonNumber: 1, room: "102" }];
      const expectedData = [{ lessonId: 1, lessonNumber: 1, room: "102" }];
      const { updateCacheData } = await import("../utils/validateFunctions");

      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.lesson.findMany.mockResolvedValue(dbData);

      const result = await lessonService.getLessonData(session);

      expect(result).toEqual(expectedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("lesson:1");
      expect(mockPrismaClient.lesson.findMany).toHaveBeenCalledWith({
        where: { classId: 1 }
      });
      expect(updateCacheData).toHaveBeenCalledWith(dbData, "lesson:1");
    });

    it("should throw an error if redis data is malformed", async () => {
      mockRedisClient.get.mockResolvedValue("malformed json");

      expect(lessonService.getLessonData(session)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith("Error parsing Redis data:", expect.any(Error));
    });
  });
});
