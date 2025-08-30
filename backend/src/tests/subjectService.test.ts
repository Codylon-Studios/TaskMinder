import { mock, describe, it, expect, beforeEach } from "bun:test";
import subjectService from "../services/subjectService";
import { Session, SessionData } from "express-session";
import { setSubjectsTypeBody } from "../schemas/subjectSchema";

// Mock Prisma
const mockPrismaClient = {
  subjects: {
    findMany: mock(),
    deleteMany: mock(),
    delete: mock(),
    create: mock(),
    update: mock()
  },
  lesson: {
    deleteMany: mock()
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
mock.module("../config/redis", () => ({
  redisClient: mockRedisClient,
  generateCacheKey: (prefix: string, id: string) => `${prefix}:${id}`,
  CACHE_KEY_PREFIXES: {
    SUBJECT: "subject"
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateCacheData: mock().mockImplementation(async (data: any, key: string) => {
    const { BigIntreplacer } = await import("../utils/validateFunctions");
    const stringified = JSON.stringify(data, BigIntreplacer);
    await mockRedisClient.set(key, stringified);
  })
}));

// Mock logger
const mockLogger = {
  error: mock()
};
mock.module("../utils/logger", () => ({ default: mockLogger }));

// Mock validateFunctions
mock.module("../utils/validateFunctions", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  BigIntreplacer: (key: any, value: any) => (typeof value === "bigint" ? value.toString() : value),
  updateCacheData: mock()
}));

describe("subjectService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPrismaClient.subjects.findMany.mockClear();
    mockPrismaClient.subjects.deleteMany.mockClear();
    mockPrismaClient.subjects.delete.mockClear();
    mockPrismaClient.subjects.create.mockClear();
    mockPrismaClient.subjects.update.mockClear();
    mockPrismaClient.lesson.deleteMany.mockClear();
    mockPrismaClient.$transaction.mockClear();
    mockRedisClient.get.mockClear();
    mockRedisClient.set.mockClear();
    mockRedisClient.del.mockClear();
    mockLogger.error.mockClear();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { updateCacheData } = require("../utils/validateFunctions");
    updateCacheData.mockClear();

    // Default mock implementations
    mockPrismaClient.$transaction.mockImplementation(async callback => callback(mockPrismaClient));
    mockRedisClient.get.mockResolvedValue(null); // Default to cache miss
  });

  describe("getSubjectData", () => {
    it("should return subject data from cache if available", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const cachedData = [{ subjectId: "1", subjectNameLong: "Math" }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await subjectService.getSubjectData(session);

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("subject:1");
      expect(mockPrismaClient.subjects.findMany).not.toHaveBeenCalled();
    });

    it("should fetch subject data from prisma and cache it if not in cache", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const dbData = [{ subjectId: "1", subjectNameLong: "Math" }];
      const { updateCacheData } = await import("../utils/validateFunctions");

      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.subjects.findMany.mockResolvedValue(dbData);

      const result = await subjectService.getSubjectData(session);

      expect(result).toEqual(dbData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("subject:1");
      expect(mockPrismaClient.subjects.findMany).toHaveBeenCalledWith({
        where: { classId: 1 }
      });
      expect(updateCacheData).toHaveBeenCalledWith(dbData, "subject:1");
    });

    it("should throw an error if redis fails to parse data", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      mockRedisClient.get.mockResolvedValue("invalid json");

      expect(subjectService.getSubjectData(session)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("setSubjectData", () => {
    it("should create a new subject", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: setSubjectsTypeBody = {
        subjects: [{
          subjectId: "",
          subjectNameLong: "New Subject",
          subjectNameShort: "NS",
          teacherNameLong: "New Teacher",
          teacherNameShort: "NT", teacherGender: "m",
          subjectNameSubstitution: null,
          teacherNameSubstitution: null
        }]
      };
      mockPrismaClient.subjects.findMany.mockResolvedValue([]);

      await subjectService.setSubjectData(reqData, session);

      expect(mockPrismaClient.subjects.create).toHaveBeenCalledWith({
        data: {
          classId: 1,
          subjectNameLong: "New Subject",
          subjectNameShort: "NS",
          teacherNameLong: "New Teacher",
          teacherNameShort: "NT",
          teacherGender: "m",
          subjectNameSubstitution: [],
          teacherNameSubstitution: []
        }
      });
    });

    it("should update an existing subject", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: setSubjectsTypeBody = {
        subjects: [{
          subjectId: 1,
          subjectNameLong: "Updated Subject",
          subjectNameShort: "US",
          teacherNameLong: "Updated Teacher",
          teacherNameShort: "UT", teacherGender: "w",
          subjectNameSubstitution: null,
          teacherNameSubstitution: null
        }]
      };
      const existingSubjects = [{ 
        subjectId: "1", 
        subjectNameLong: "Old Subject", 
        subjectNameShort: "OS", 
        teacherNameLong: "Old Teacher", 
        teacherNameShort: "OT", 
        teacherGender: "m", 
        subjectNameSubstitution: [], 
        teacherNameSubstitution: [] 
      }];
      mockPrismaClient.subjects.findMany.mockResolvedValue(existingSubjects);

      await subjectService.setSubjectData(reqData, session);

      expect(mockPrismaClient.subjects.update).toHaveBeenCalled();
    });

    it("should delete a subject", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: setSubjectsTypeBody = { subjects: [] };
      const existingSubjects = [{ 
        subjectId: "1", 
        subjectNameLong: "Old Subject", 
        subjectNameShort: "OS", 
        teacherNameLong: "Old Teacher", 
        teacherNameShort: "OT", 
        teacherGender: "m", 
        subjectNameSubstitution: [], 
        teacherNameSubstitution: [] 
      }];
      mockPrismaClient.subjects.findMany.mockResolvedValue(existingSubjects);

      await subjectService.setSubjectData(reqData, session);

      expect(mockPrismaClient.subjects.delete).toHaveBeenCalledWith({ where: { subjectId: "1" } });
      expect(mockPrismaClient.lesson.deleteMany).toHaveBeenCalledWith({ where: { subjectId: "1" } });
    });

    it("should throw an error for invalid data", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: setSubjectsTypeBody = {
        subjects: [{ 
          subjectId: "", 
          subjectNameLong: "", 
          subjectNameShort: "", 
          teacherNameLong: "", 
          teacherNameShort: "", 
          teacherGender: "m", 
          subjectNameSubstitution: [], 
          teacherNameSubstitution: [] 
        }]
      };

      await expect(subjectService.setSubjectData(reqData, session)).rejects.toThrow("Invalid data format");
    });
  });
});
