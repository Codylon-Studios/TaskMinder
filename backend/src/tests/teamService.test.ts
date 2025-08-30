import { mock, describe, it, expect, beforeEach } from "bun:test";
import teamService from "../services/teamService";
import { Session, SessionData } from "express-session";
import { setJoinedTeamsTypeBody, setTeamsTypeBody } from "../schemas/teamSchema";

// Mock Prisma
const mockPrismaClient = {
  team: {
    findMany: mock(),
    create: mock(),
    update: mock(),
    delete: mock()
  },
  homework: {
    deleteMany: mock()
  },
  event: {
    deleteMany: mock()
  },
  lesson: {
    deleteMany: mock()
  },
  joinedTeams: {
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
  set: mock(),
  del: mock()
};
mock.module("../config/redis", () => ({
  redisClient: mockRedisClient,
  generateCacheKey: (prefix: string, id: string) => `${prefix}:${id}`,
  CACHE_KEY_PREFIXES: {
    TEAMS: "teams_data"
  }
}));

// Mock logger
const mockLogger = {
  error: mock(),
  info: mock(),
  warn: mock(),
  debug: mock()
};
mock.module("../utils/logger", () => ({ default: mockLogger }));

// Mock validateFunctions
mock.module("../utils/validateFunctions", () => ({
  updateCacheData: mock()
}));

describe("teamService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPrismaClient.team.findMany.mockClear();
    mockPrismaClient.team.create.mockClear();
    mockPrismaClient.team.update.mockClear();
    mockPrismaClient.team.delete.mockClear();
    mockPrismaClient.homework.deleteMany.mockClear();
    mockPrismaClient.event.deleteMany.mockClear();
    mockPrismaClient.lesson.deleteMany.mockClear();
    mockPrismaClient.joinedTeams.findMany.mockClear();
    mockPrismaClient.joinedTeams.create.mockClear();
    mockPrismaClient.joinedTeams.deleteMany.mockClear();
    mockPrismaClient.$transaction.mockClear();
    mockRedisClient.get.mockClear();
    mockRedisClient.set.mockClear();
    mockRedisClient.del.mockClear();
    mockLogger.error.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../utils/validateFunctions").updateCacheData.mockClear();

    // Default mock implementations
    mockPrismaClient.$transaction.mockImplementation(async callback => callback(mockPrismaClient));
  });

  describe("getTeamsData", () => {
    it("should return teams from cache if available", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const cachedData = [{ teamId: 1, name: "Team A" }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await teamService.getTeamsData(session);

      expect(result).toEqual(cachedData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("teams_data:1");
      expect(mockPrismaClient.team.findMany).not.toHaveBeenCalled();
    });

    it("should fetch teams from db and update cache if not in cache", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const dbData = [{ teamId: 1, name: "Team A" }];
      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.team.findMany.mockResolvedValue(dbData);

      const result = await teamService.getTeamsData(session);

      expect(result).toEqual(dbData);
      expect(mockRedisClient.get).toHaveBeenCalledWith("teams_data:1");
      expect(mockPrismaClient.team.findMany).toHaveBeenCalledWith({ where: { classId: 1 } });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateCacheData } = require("../utils/validateFunctions");
      expect(updateCacheData).toHaveBeenCalledWith(dbData, "teams_data:1");
    });
  });

  describe("setTeamsData", () => {
    it("should create, update, and delete teams", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: setTeamsTypeBody = {
        teams: [
          { teamId: 1, name: "Team A updated" }, // update
          { teamId: "", name: "Team C" } // create
        ]
      };
      const existingTeams = [
        { teamId: 1, name: "Team A" },
        { teamId: 2, name: "Team B" }
      ];
      mockPrismaClient.team.findMany.mockResolvedValueOnce(existingTeams); // Initial fetch
      mockPrismaClient.team.findMany.mockResolvedValueOnce([]); // After transaction

      await teamService.setTeamsData(reqData, session);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      // Team B (id: 2) should be deleted
      expect(mockPrismaClient.homework.deleteMany).toHaveBeenCalledWith({ where: { teamId: 2 } });
      expect(mockPrismaClient.event.deleteMany).toHaveBeenCalledWith({ where: { teamId: 2 } });
      expect(mockPrismaClient.lesson.deleteMany).toHaveBeenCalledWith({ where: { teamId: 2 } });
      expect(mockPrismaClient.team.delete).toHaveBeenCalledWith({ where: { teamId: 2 } });

      // Team A (id: 1) should be updated
      expect(mockPrismaClient.team.update).toHaveBeenCalledWith({
        where: { teamId: 1 },
        data: { classId: 1, name: "Team A updated" }
      });

      // Team C should be created
      expect(mockPrismaClient.team.create).toHaveBeenCalledWith({
        data: { classId: 1, name: "Team C" }
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateCacheData } = require("../utils/validateFunctions");
      expect(updateCacheData).toHaveBeenCalledWith(expect.any(Array), "teams_data:1");
    });

    it("should throw an error for empty team name", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const reqData: setTeamsTypeBody = {
        teams: [{ teamId: 1, name: " " }]
      };
      mockPrismaClient.team.findMany.mockResolvedValue([]);
      expect(teamService.setTeamsData(reqData, session)).rejects.toThrow("Invalid data (Team name cannot be empty)");
    });
  });

  describe("getJoinedTeamsData", () => {
    it("should return joined teams for the current user", async () => {
      const session = { account: { accountId: 1 } } as Session & Partial<SessionData>;
      const dbData = [
        { accountId: 1, teamId: 101 },
        { accountId: 1, teamId: 102 }
      ];
      mockPrismaClient.joinedTeams.findMany.mockResolvedValue(dbData);

      const result = await teamService.getJoinedTeamsData(session);

      expect(result).toEqual([101, 102]);
      expect(mockPrismaClient.joinedTeams.findMany).toHaveBeenCalledWith({ where: { accountId: 1 } });
    });
  });

  describe("setJoinedTeamsData", () => {
    it("should update the joined teams for the current user", async () => {
      const session = { account: { accountId: 1 } } as Session & Partial<SessionData>;
      const reqData: setJoinedTeamsTypeBody = {
        teams: [102, 103]
      };

      await teamService.setJoinedTeamsData(reqData, session);

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
      expect(mockPrismaClient.joinedTeams.deleteMany).toHaveBeenCalledWith({ where: { accountId: 1 } });
      expect(mockPrismaClient.joinedTeams.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.joinedTeams.create).toHaveBeenCalledWith({ data: { accountId: 1, teamId: 102 } });
      expect(mockPrismaClient.joinedTeams.create).toHaveBeenCalledWith({ data: { accountId: 1, teamId: 103 } });
    });

    it("should throw an error for invalid data format", async () => {
      const session = { account: { accountId: 1 } } as Session & Partial<SessionData>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reqData: any = { teams: "not-an-array" };

      expect(teamService.setJoinedTeamsData(reqData, session)).rejects.toThrow("Invalid data format");
    });
  });
});
