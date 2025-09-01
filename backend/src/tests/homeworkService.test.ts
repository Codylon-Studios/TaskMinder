import { mock, describe, it, expect, beforeEach } from "bun:test";
import homeworkService from "../services/homeworkService";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import { addHomeworkTypeBody, checkHomeworkTypeBody, deleteHomeworkTypeBody, editHomeworkTypeBody } from "../schemas/homeworkSchema";

// Mock Prisma
const mockPrismaClient = {
  homework: {
    create: mock(),
    findMany: mock(),
    delete: mock(),
    update: mock()
  },
  homeworkCheck: {
    upsert: mock(),
    deleteMany: mock(),
    findMany: mock()
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
  connectRedis: () => { },
  CACHE_KEY_PREFIXES: {
    HOMEWORK: "homework"
  },
  generateCacheKey: (prefix: string, id: string) => `${prefix}:${id}`
}));

// Mock Socket.IO
const mockSocketIO = {
  getIO: mock(),
  emit: mock()
};
mock.module("../config/socket", () => ({ default: { getIO: () => mockSocketIO } }));


// Mock validateFunctions
const mockValidateFunctions = {
  isValidTeamId: mock(),
  isValidSubjectId: mock(),
  updateCacheData: mock(),
  BigIntreplacer: mock()
};
mock.module("../utils/validateFunctions", () => mockValidateFunctions);

describe("homeworkService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPrismaClient.homework.create.mockClear();
    mockPrismaClient.homework.findMany.mockClear();
    mockPrismaClient.homework.delete.mockClear();
    mockPrismaClient.homework.update.mockClear();
    mockPrismaClient.homeworkCheck.upsert.mockClear();
    mockPrismaClient.homeworkCheck.deleteMany.mockClear();
    mockPrismaClient.homeworkCheck.findMany.mockClear();
    mockPrismaClient.$transaction.mockClear();
    mockRedisClient.get.mockClear();
    mockRedisClient.set.mockClear();
    mockSocketIO.getIO.mockClear();
    mockSocketIO.emit.mockClear();
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
    mockPrismaClient.$transaction.mockImplementation(async callback => callback(mockPrismaClient));
    mockSocketIO.getIO.mockReturnValue(mockSocketIO);
  });

  describe("addHomework", () => {
    it("should add a new homework and update cache", async () => {
      const reqData: addHomeworkTypeBody = {
        subjectId: 1,
        content: "Add Homework Test homework",
        assignmentDate: new Date().getTime(),
        submissionDate: new Date().getTime(),
        teamId: -1
      };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.homework.create.mockResolvedValue(true);
      mockPrismaClient.homework.findMany.mockResolvedValue([]);

      await homeworkService.addHomework(reqData, session);

      expect(mockValidateFunctions.isValidSubjectId).toHaveBeenCalledWith(reqData.subjectId, session);
      expect(mockValidateFunctions.isValidTeamId).toHaveBeenCalledWith(reqData.teamId, session);
      expect(mockPrismaClient.homework.create).toHaveBeenCalledWith({
        data: {
          classId: 1,
          content: reqData.content,
          subjectId: reqData.subjectId,
          assignmentDate: reqData.assignmentDate,
          submissionDate: reqData.submissionDate,
          teamId: reqData.teamId
        }
      });
      expect(mockValidateFunctions.updateCacheData).toHaveBeenCalled();
      expect(mockSocketIO.emit).toHaveBeenCalledWith("updateHomeworkData");
    });

    it("should throw a 400 error for invalid data", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reqData = {} as any;
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.homework.create.mockRejectedValue(new Error("Invalid data"));

      const expectedError: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };

      expect(homeworkService.addHomework(reqData, session)).rejects.toThrow(expectedError);
    });
  });

  describe("checkHomework", () => {
    it("should check a homework item", async () => {
      const reqData: checkHomeworkTypeBody = { homeworkId: 1, checkStatus: "true" };
      const session = { account: { accountId: 1 } } as Session & Partial<SessionData>;

      await homeworkService.checkHomework(reqData, session);

      expect(mockPrismaClient.homeworkCheck.upsert).toHaveBeenCalledWith({
        where: { accountId_homeworkId: { accountId: 1, homeworkId: 1 } },
        update: {},
        create: { accountId: 1, homeworkId: 1 }
      });
      expect(mockSocketIO.emit).toHaveBeenCalledWith("updateHomeworkData");
    });

    it("should uncheck a homework item", async () => {
      const reqData: checkHomeworkTypeBody = { homeworkId: 1, checkStatus: "false" };
      const session = { account: { accountId: 1 } } as Session & Partial<SessionData>;

      await homeworkService.checkHomework(reqData, session);

      expect(mockPrismaClient.homeworkCheck.deleteMany).toHaveBeenCalledWith({
        where: { accountId: 1, homeworkId: 1 }
      });
      expect(mockSocketIO.emit).toHaveBeenCalledWith("updateHomeworkData");
    });
  });

  describe("deleteHomework", () => {
    it("should delete a homework item and update cache", async () => {
      const reqData: deleteHomeworkTypeBody = { homeworkId: 1 };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.homework.delete.mockResolvedValue(true);
      mockPrismaClient.homework.findMany.mockResolvedValue([]);

      await homeworkService.deleteHomework(reqData, session);

      expect(mockPrismaClient.homework.delete).toHaveBeenCalledWith({
        where: { homeworkId: 1, classId: 1 }
      });
      expect(mockValidateFunctions.updateCacheData).toHaveBeenCalled();
      expect(mockSocketIO.emit).toHaveBeenCalledWith("updateHomeworkData");
    });

    it("should throw an error if homeworkId is missing", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reqData = {} as any;
      const session = { classId: "1" } as Session & Partial<SessionData>;

      const expectedError: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };

      expect(homeworkService.deleteHomework(reqData, session)).rejects.toThrow(expectedError);
    });
  });

  describe("editHomework", () => {
    it("should edit a homework item and update cache", async () => {
      const reqData: editHomeworkTypeBody = {
        homeworkId: 1,
        subjectId: 1,
        content: "Edit Homework Update Cache",
        assignmentDate: new Date().getTime(),
        submissionDate: new Date().getTime(),
        teamId: -1
      };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.homework.update.mockResolvedValue(true);
      mockPrismaClient.homework.findMany.mockResolvedValue([]);

      await homeworkService.editHomework(reqData, session);

      expect(mockValidateFunctions.isValidSubjectId).toHaveBeenCalledWith(reqData.subjectId, session);
      expect(mockValidateFunctions.isValidTeamId).toHaveBeenCalledWith(reqData.teamId, session);
      expect(mockPrismaClient.homework.update).toHaveBeenCalledWith({
        where: { homeworkId: 1 },
        data: {
          classId: 1,
          content: reqData.content,
          subjectId: reqData.subjectId,
          assignmentDate: reqData.assignmentDate,
          submissionDate: reqData.submissionDate,
          teamId: reqData.teamId
        }
      });
      expect(mockValidateFunctions.updateCacheData).toHaveBeenCalled();
      expect(mockSocketIO.emit).toHaveBeenCalledWith("updateHomeworkData");
    });

    it("should throw a 400 error for invalid data", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reqData = {} as any;
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.homework.update.mockRejectedValue(new Error("Invalid data"));

      const expectedError: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };

      expect(homeworkService.editHomework(reqData, session)).rejects.toThrow(expectedError);
    });
  });

  describe("getHomeworkData", () => {
    it("should return cached data if available", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const cachedData = [{ id: 1, content: "Cached homework" }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await homeworkService.getHomeworkData(session);

      expect(result).toEqual(cachedData);
      expect(mockPrismaClient.homework.findMany).not.toHaveBeenCalled();
    });

    it("should fetch data from DB if cache is empty and update cache", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const dbData = [{ id: 1, content: "DB homework" }];
      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.homework.findMany.mockResolvedValue(dbData);

      const result = await homeworkService.getHomeworkData(session);

      expect(result).toEqual(dbData);
      expect(mockPrismaClient.homework.findMany).toHaveBeenCalledWith({
        where: { classId: 1 },
        orderBy: { submissionDate: "asc" }
      });
      expect(mockValidateFunctions.updateCacheData).toHaveBeenCalled();
    });
  });

  describe("getHomeworkCheckedData", () => {
    it("should return a list of checked homework IDs", async () => {
      const session = { account: { accountId: 1 } } as Session & Partial<SessionData>;
      const checkedData = [{ homeworkId: 1 }, { homeworkId: 2 }];
      mockPrismaClient.homeworkCheck.findMany.mockResolvedValue(checkedData);

      const result = await homeworkService.getHomeworkCheckedData(session);

      expect(result).toEqual([1, 2]);
      expect(mockPrismaClient.homeworkCheck.findMany).toHaveBeenCalledWith({
        where: { accountId: 1 },
        select: { homeworkId: true }
      });
    });
  });
});
