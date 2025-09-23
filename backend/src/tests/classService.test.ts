import { mock, describe, it, expect, beforeEach } from "bun:test";
import classService from "../services/classService";
import { Session, SessionData } from "express-session";
import { 
  changeClassNameTypeBody,
  changeDefaultPermissionTypeBody, 
  createClassTypeBody, 
  joinClassTypeBody, 
  kickClassMembersTypeBody, 
  setClassMembersPermissionsTypeBody, 
  setUsersLoggedOutRoleTypeBody, 
  updateDSBMobileDataTypeBody 
} from "../schemas/classSchema";

// Mock Prisma
const mockPrismaClient = {
  class: {
    findUnique: mock(),
    create: mock(),
    update: mock(),
    delete: mock(),
    findMany: mock(),
    deleteMany: mock(),
    updateMany: mock()
  },
  joinedClass: {
    findUnique: mock(),
    create: mock(),
    delete: mock(),
    findMany: mock(),
    updateMany: mock(),
    deleteMany: mock(),
    findFirst: mock()
  },
  joinedTeams: {
    deleteMany: mock()
  },
  homeworkCheck: {
    deleteMany: mock()
  },
  $transaction: mock()
};
mock.module("../config/prisma", () => ({ default: mockPrismaClient }));

// Mock Redis
const mockRedisClient = {
  del: mock()
};
mock.module("../config/redis", () => ({ redisClient: mockRedisClient }));

// Mock PG
const mockSessionPool = {
  query: mock()
};
mock.module("../config/pg", () => ({ sessionPool: mockSessionPool }));


describe("classService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPrismaClient.class.findUnique.mockClear();
    mockPrismaClient.class.create.mockClear();
    mockPrismaClient.class.update.mockClear();
    mockPrismaClient.class.delete.mockClear();
    mockPrismaClient.joinedClass.findUnique.mockClear();
    mockPrismaClient.joinedClass.create.mockClear();
    mockPrismaClient.joinedClass.delete.mockClear();
    mockPrismaClient.joinedClass.findMany.mockClear();
    mockPrismaClient.joinedClass.updateMany.mockClear();
    mockPrismaClient.joinedClass.deleteMany.mockClear();
    mockPrismaClient.joinedClass.findFirst.mockClear();
    mockPrismaClient.joinedTeams.deleteMany.mockClear();
    mockPrismaClient.homeworkCheck.deleteMany.mockClear();
    mockPrismaClient.$transaction.mockClear();
    mockRedisClient.del.mockClear();
    mockSessionPool.query.mockClear();

    // Default mock implementations
    mockPrismaClient.$transaction.mockImplementation(async callback => callback(mockPrismaClient));
  });

  describe("createClass", () => {
    it("should create a new class and return its code", async () => {
      const reqData: createClassTypeBody = { classDisplayName: "Test Class", isTestClass: false };
      const session = { account: { accountId: 1 } } as Session & Partial<SessionData>;
      const createdClass = { classId: 1, classCode: "random-code" };

      mockPrismaClient.class.create.mockResolvedValue(createdClass);

      const result = await classService.createClass(reqData, session);

      expect(result).toBe("random-code");
      expect(session.classId).toBe("1");
      expect(mockPrismaClient.joinedClass.create).toHaveBeenCalledWith({
        data: {
          accountId: 1,
          classId: 1,
          permissionLevel: 3
        }
      });
    });

    it("should throw an error if the user is already in a class", async () => {
      const reqData = { classDisplayName: "Test Class", isTestClass: false };
      const session = { classId: "1", account: { accountId: 1 } } as Session & Partial<SessionData>;

      expect(classService.createClass(reqData, session)).rejects.toThrow(
        "User logged in into class"
      );
    });
  });

  describe("getClassInfo", () => {
    it("should return class info if found", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const classInfo = { classId: 1, className: "Test Class" };
      mockPrismaClient.class.findUnique.mockResolvedValue(classInfo);

      const result = await classService.getClassInfo(session);

      expect(result).toEqual(classInfo);
    });

    it("should throw a 404 error if class not found", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      mockPrismaClient.class.findUnique.mockResolvedValue(null);

      expect(classService.getClassInfo(session)).rejects.toThrow(
        "Can not find class"
      );
    });
  });

  describe("joinClass", () => {
    it("should allow a user to join a class", async () => {
      const reqData: joinClassTypeBody = { classCode: "valid-code" };
      const session = { account: { accountId: 1 } } as Session & Partial<SessionData>;
      const targetClass = { classId: 1, className: "Test Class", defaultPermissionLevel: 1 };

      mockPrismaClient.class.findUnique.mockResolvedValue(targetClass);
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue(null);

      const result = await classService.joinClass(reqData, session);

      expect(result).toBe("Test Class");
      expect(session.classId).toBe("1");
      expect(mockPrismaClient.joinedClass.create).toHaveBeenCalledWith({
        data: {
          accountId: 1,
          classId: 1,
          permissionLevel: 1
        }
      });
    });

    it("should throw an error if already in a class", async () => {
      const reqData = { classCode: "valid-code" };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      expect(classService.joinClass(reqData, session)).rejects.toThrow(
        "Already in a class"
      );
    });
  });

  describe("leaveClass", () => {
    it("should allow a user to leave a class", async () => {
      const session = { classId: "1", account: { accountId: 1 } } as Session & Partial<SessionData>;
      const allMembers = [
        { accountId: 1, permissionLevel: 1 },
        { accountId: 2, permissionLevel: 3 }
      ];

      mockPrismaClient.joinedClass.findMany.mockResolvedValue(allMembers);

      await classService.leaveClass(session);

      expect(session.classId).toBeUndefined();
      expect(mockPrismaClient.joinedClass.delete).toHaveBeenCalledWith({
        where: { accountId: 1 }
      });
    });

    it("should throw an error if the last admin tries to leave", async () => {
      const session = { classId: "1", account: { accountId: 1 } } as Session & Partial<SessionData>;
      const allMembers = [{ accountId: 1, permissionLevel: 3 }];

      mockPrismaClient.joinedClass.findMany.mockResolvedValue(allMembers);

      expect(classService.leaveClass(session)).rejects.toThrow(
        "You are the only admin. Please promote another member before leaving or delete the class."
      );
    });
  });

  describe("deleteClass", () => {
    it("should delete the class and all associated data", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      await classService.deleteClass(session);

      expect(mockPrismaClient.joinedClass.deleteMany).toHaveBeenCalledWith({ where: { classId: 1 } });
      expect(mockPrismaClient.class.delete).toHaveBeenCalledWith({ where: { classId: 1 } });
      expect(mockRedisClient.del).toHaveBeenCalledWith("auth_class:1");
      expect(session.classId).toBeUndefined();
    });
  });

  describe("kickClassMember", () => {
    it("should allow an admin to kick a class member", async () => {
      const reqData: kickClassMembersTypeBody = { classMembers: [{ accountId: 2 }] };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.joinedClass.findFirst.mockResolvedValue({ accountId: 1, permissionLevel: 3 }); // Admin exists

      await classService.kickClassMember(reqData, session);

      expect(mockPrismaClient.joinedClass.deleteMany).toHaveBeenCalledWith({
        where: { accountId: 2, classId: 1 }
      });
    });

    it("should throw an error if the last admin is kicked", async () => {
      const reqData: kickClassMembersTypeBody = { classMembers: [{ accountId: 1 }] };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.joinedClass.findFirst.mockResolvedValue(null); // No admin left

      expect(classService.kickClassMember(reqData, session)).rejects.toThrow(
        "At least one logged in admin must be remaining after this action."
      );
    });
  });

  describe("updateDSBMobileData", () => {
    it("should update DSB mobile data", async () => {
      const reqData: updateDSBMobileDataTypeBody = { 
        dsbMobileActivated: true, 
        dsbMobileUser: "user", 
        dsbMobilePassword: "password", 
        dsbMobileClass: "class" 
      };
      const session = { classId: "1" } as Session & Partial<SessionData>;
      await classService.updateDSBMobileData(reqData, session);
      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 1 },
        data: reqData
      });
    });
  });

  describe("changeDefaultPermission", () => {
    it("should change the default permission level", async () => {
      const reqData: changeDefaultPermissionTypeBody = { defaultPermission: 2 };
      const session = { classId: "1" } as Session & Partial<SessionData>;
      await classService.changeDefaultPermission(reqData, session);
      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 1 },
        data: { defaultPermissionLevel: 2 }
      });
    });
  });

  describe("setClassMembersPermissions", () => {
    it("should set permissions for class members", async () => {
      const reqData: setClassMembersPermissionsTypeBody = { classMembers: [{ accountId: 1, permissionLevel: 2 }] };
      const session = { classId: "1" } as Session & Partial<SessionData>;
      mockPrismaClient.joinedClass.findFirst.mockResolvedValue({ accountId: 2, permissionLevel: 3 }); // Admin exists
      await classService.setClassMembersPermissions(reqData, session);
      expect(mockPrismaClient.joinedClass.updateMany).toHaveBeenCalledWith({
        where: { accountId: 1, classId: 1 },
        data: { permissionLevel: 2 }
      });
    });
  });

  describe("getClassMembers", () => {
    it("should return a list of class members", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      const members = [{ Account: { username: "test", accountId: 1 }, permissionLevel: 1 }];
      mockPrismaClient.joinedClass.findMany.mockResolvedValue(members);
      const result = await classService.getClassMembers(session);
      expect(result).toEqual([{ username: "test", accountId: 1, permissionLevel: 1 }]);
    });
  });

  describe("getUsersLoggedOutRole", () => {
    it("should return the default permission level for logged out users", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      mockPrismaClient.class.findUnique.mockResolvedValue({ defaultPermissionLevel: 1 });
      const result = await classService.getUsersLoggedOutRole(session);
      expect(result).toBe(1);
    });
  });

  describe("setUsersLoggedOutRole", () => {
    it("should set the default permission level for logged out users", async () => {
      const reqData: setUsersLoggedOutRoleTypeBody = { role: 2 };
      const session = { classId: "1" } as Session & Partial<SessionData>;
      await classService.setUsersLoggedOutRole(reqData, session);
      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 1 },
        data: { defaultPermissionLevel: 2 }
      });
    });
  });

  describe("kickLoggedOutUsers", () => {
    it("should kick logged out users", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;
      mockSessionPool.query.mockResolvedValue({ rowCount: 1 });
      await classService.kickLoggedOutUsers(session);
      expect(mockSessionPool.query).toHaveBeenCalled();
    });
  });

  describe("changeClassName", () => {
    it("should successfully change the class name", async () => {
      const reqData: changeClassNameTypeBody = { classDisplayName: "New Class Name" };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      await classService.changeClassName(reqData, session);

      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 1 },
        data: { className: "New Class Name" }
      });
    });

    it("should handle empty class name by trimming (validation handled by schema)", async () => {
      const reqData: changeClassNameTypeBody = { classDisplayName: "   Updated Name   " };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      await classService.changeClassName(reqData, session);

      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 1 },
        data: { className: "   Updated Name   " }
      });
    });

    it("should handle database errors gracefully", async () => {
      const reqData: changeClassNameTypeBody = { classDisplayName: "New Name" };
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.class.update.mockRejectedValue(new Error("Database error"));

      expect(classService.changeClassName(reqData, session)).rejects.toThrow("Database error");
    });
  });

  describe("changeClassCode", () => {
    it("should successfully generate and update a new class code", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      // Mock that the first generated code is unique
      mockPrismaClient.class.findUnique.mockResolvedValue(null);
      mockPrismaClient.class.update.mockResolvedValue({ classCode: "new-unique-code" });

      const result = await classService.changeClassCode(session);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBe(20); // Default length from generateRandomBase62String
      expect(mockPrismaClient.class.findUnique).toHaveBeenCalledWith({
        where: { classCode: result }
      });
      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 1 },
        data: { classCode: result }
      });
    });

    it("should retry when generated code already exists", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      // Mock that first code exists, second doesn't
      mockPrismaClient.class.findUnique
        .mockResolvedValueOnce({ classId: 2, classCode: "existing-code" }) // First call - code exists
        .mockResolvedValueOnce(null); // Second call - code is unique

      const result = await classService.changeClassCode(session);

      expect(result).toBeDefined();
      expect(mockPrismaClient.class.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 1 },
        data: { classCode: result }
      });
    });

    it("should throw error after maximum attempts with non-unique codes", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      // Mock that all generated codes already exist
      mockPrismaClient.class.findUnique.mockResolvedValue({ classId: 2, classCode: "existing-code" });

      expect(classService.changeClassCode(session)).rejects.toMatchObject({
        name: "Server Error",
        status: 500,
        message: "Could not generate unique class code",
        additionalInformation: "All randomly generated class codes were already in use, please try again",
        expected: false
      });

      expect(mockPrismaClient.class.findUnique).toHaveBeenCalledTimes(10); // maxAttempts
      expect(mockPrismaClient.class.update).not.toHaveBeenCalled();
    });

    it("should handle database update errors", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.class.findUnique.mockResolvedValue(null);
      mockPrismaClient.class.update.mockRejectedValue(new Error("Database update failed"));

      expect(classService.changeClassCode(session)).rejects.toThrow("Database update failed");
    });

    it("should handle database lookup errors", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.class.findUnique.mockRejectedValue(new Error("Database lookup failed"));

      expect(classService.changeClassCode(session)).rejects.toThrow("Database lookup failed");
    });

    it("should generate base62 string with correct character set", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.class.findUnique.mockResolvedValue(null);
      mockPrismaClient.class.update.mockResolvedValue({ classCode: "test-code" });

      const result = await classService.changeClassCode(session);

      // Check that result contains only valid base62 characters (0-9, A-Z, a-z)
      const base62Regex = /^[0-9A-Za-z]+$/;
      expect(base62Regex.test(result)).toBe(true);
    });
  });

  describe("upgradeTestClass", () => {
    it("should successfully upgrade a test class to a regular class", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      await classService.upgradeTestClass(session);

      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 1 },
        data: { isTestClass: false }
      });
    });

    it("should handle database errors gracefully", async () => {
      const session = { classId: "1" } as Session & Partial<SessionData>;

      mockPrismaClient.class.update.mockRejectedValue(new Error("Database error"));

      expect(classService.upgradeTestClass(session)).rejects.toThrow("Database error");
    });

    it("should work with different class IDs", async () => {
      const session = { classId: "42" } as Session & Partial<SessionData>;

      // Reset the mock to resolve successfully for this test
      mockPrismaClient.class.update.mockResolvedValue({ classId: 42, isTestClass: false });

      await classService.upgradeTestClass(session);

      expect(mockPrismaClient.class.update).toHaveBeenCalledWith({
        where: { classId: 42 },
        data: { isTestClass: false }
      });
    });
  });
});
