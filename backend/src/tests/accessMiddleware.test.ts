import { mock, describe, it, expect, beforeEach } from "bun:test";
import { Request, Response, NextFunction } from "express";
import checkAccess from "../middleware/accessMiddleware";
import { RequestError } from "../@types/requestError";

// Mock Prisma
const mockPrismaClient = {
  account: {
    findUnique: mock()
  },
  class: {
    findUnique: mock()
  },
  joinedClass: {
    findUnique: mock()
  }
};
mock.module("../config/prisma", () => ({ default: mockPrismaClient }));

// Mock Redis
const mockRedisClient = {
  get: mock(),
  set: mock()
};
mock.module("../config/redis", () => ({ redisClient: mockRedisClient }));

describe("accessMiddleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks before each test
    mockPrismaClient.account.findUnique.mockClear();
    mockPrismaClient.class.findUnique.mockClear();
    mockPrismaClient.joinedClass.findUnique.mockClear();
    mockRedisClient.get.mockClear();
    mockRedisClient.set.mockClear();

    // Setup mock request/response
    mockReq = {
      session: {} as any
    };
    mockRes = {
      redirect: mock(),
      headersSent: false
    };
    mockNext = mock();
  });

  describe("ACCOUNT access requirement", () => {
    it("should pass when user is logged in and account exists in Redis", async () => {
      mockReq.session = { account: { accountId: 1, username: "testuser" } } as any;
      mockRedisClient.get.mockResolvedValue("true");

      const middleware = checkAccess(["ACCOUNT"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRedisClient.get).toHaveBeenCalledWith("auth_user:1");
      expect(mockPrismaClient.account.findUnique).not.toHaveBeenCalled();
    });

    it("should pass when user is logged in and account exists in database", async () => {
      mockReq.session = { account: { accountId: 1, username: "testuser" } } as any;
      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 1, username: "testuser" });

      const middleware = checkAccess(["ACCOUNT"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockPrismaClient.account.findUnique).toHaveBeenCalledWith({
        where: { accountId: 1 }
      });
      expect(mockRedisClient.set).toHaveBeenCalledWith("auth_user:1", "true");
    });

    it("should throw error when user is not logged in", async () => {
      mockReq.session = {} as any;

      const middleware = checkAccess(["ACCOUNT"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };

      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });

    it("should throw error and log out user when account not found in database", async () => {
      mockReq.session = { account: { accountId: 1, username: "testuser" } } as any;
      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.account.findUnique.mockResolvedValue(null);

      const middleware = checkAccess(["ACCOUNT"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "Account not found. You have been logged out",
        expected: true
      };

      expect(mockReq.session!.account).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });
  });

  describe("CLASS access requirement", () => {
    it("should redirect when user is not in a class", async () => {
      mockReq.session = {} as any;

      const middleware = checkAccess(["CLASS"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);
    });

    it("should pass when class exists in Redis", async () => {
      mockReq.session = { classId: "1" } as any;
      mockRedisClient.get.mockResolvedValue("true");

      const middleware = checkAccess(["CLASS"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRedisClient.get).toHaveBeenCalledWith("auth_class:1");
      expect(mockPrismaClient.class.findUnique).not.toHaveBeenCalled();
    });

    it("should pass when class exists in database", async () => {
      mockReq.session = { classId: "1" } as any;
      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.class.findUnique.mockResolvedValue({ classId: 1, className: "Test Class" });

      const middleware = checkAccess(["CLASS"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockPrismaClient.class.findUnique).toHaveBeenCalledWith({
        where: { classId: 1 }
      });
      expect(mockRedisClient.set).toHaveBeenCalledWith("auth_class:1", "true");
    });

    it("should throw error when class not found in database", async () => {
      mockReq.session = { classId: "1" } as any;
      mockRedisClient.get.mockResolvedValue(null);
      mockPrismaClient.class.findUnique.mockResolvedValue(null);

      const middleware = checkAccess(["CLASS"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Not Found",
        status: 404,
        message: "The selected class no longer exists. Please select another class",
        expected: true
      };

      expect(mockReq.session!.classId).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });

    it("should not call next when headers are already sent", async () => {
      mockReq.session = {} as any;
      mockRes.headersSent = true;

      const middleware = checkAccess(["CLASS"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(302, "/join");
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Permission level requirements", () => {
    it("should pass when logged-in user has sufficient permission", async () => {
      mockReq.session = { 
        account: { accountId: 1, username: "testuser" },
        classId: "1"
      } as any;
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue({ permissionLevel: 2 });

      const middleware = checkAccess(["EDITOR"]); // EDITOR = 1
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockPrismaClient.joinedClass.findUnique).toHaveBeenCalledWith({
        where: { accountId: 1 },
        select: { permissionLevel: true }
      });
    });

    it("should pass when logged-out user has sufficient default permission", async () => {
      mockReq.session = { classId: "1" } as any;
      mockPrismaClient.class.findUnique.mockResolvedValue({ defaultPermissionLevel: 2 });

      const middleware = checkAccess(["EDITOR"]); // EDITOR = 1
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockPrismaClient.class.findUnique).toHaveBeenCalledWith({
        where: { classId: 1 },
        select: { defaultPermissionLevel: true }
      });
    });

    it("should throw error when logged-in user has insufficient permission", async () => {
      mockReq.session = { 
        account: { accountId: 1, username: "testuser" },
        classId: "1"
      } as any;
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue({ permissionLevel: 0 });

      const middleware = checkAccess(["ADMIN"]); // ADMIN = 3
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "The permission level is not sufficient to perform this action",
        expected: true
      };

      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });

    it("should throw error when logged-out user has insufficient default permission", async () => {
      mockReq.session = { classId: "1" } as any;
      mockPrismaClient.class.findUnique.mockResolvedValue({ defaultPermissionLevel: 0 });

      const middleware = checkAccess(["MANAGER"]); // MANAGER = 2
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "The permission level is not sufficient to perform this action",
        expected: true
      };

      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });

    it("should use highest permission level when multiple roles required", async () => {
      mockReq.session = { 
        account: { accountId: 1, username: "testuser" },
        classId: "1"
      } as any;
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue({ permissionLevel: 2 });

      const middleware = checkAccess(["EDITOR", "ADMIN"]); // Should require ADMIN (3)
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "The permission level is not sufficient to perform this action",
        expected: true
      };

      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });

    it("should default to permission 0 when user has no account or class data", async () => {
      mockReq.session = {} as any;

      const middleware = checkAccess(["EDITOR"]); // EDITOR = 1
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "The permission level is not sufficient to perform this action",
        expected: true
      };

      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });

    it("should handle null permission levels from database", async () => {
      mockReq.session = { 
        account: { accountId: 1, username: "testuser" },
        classId: "1"
      } as any;
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue(null);

      const middleware = checkAccess(["EDITOR"]); // EDITOR = 1
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "The permission level is not sufficient to perform this action",
        expected: true
      };

      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });
  });

  describe("Combined requirements", () => {
    it("should pass when all requirements are met", async () => {
      mockReq.session = { 
        account: { accountId: 1, username: "testuser" },
        classId: "1"
      } as any;
      
      mockRedisClient.get
        .mockResolvedValueOnce("true") // auth_user cache hit
        .mockResolvedValueOnce("true"); // auth_class cache hit
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue({ permissionLevel: 3 });

      const middleware = checkAccess(["ACCOUNT", "CLASS", "ADMIN"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it("should fail if any requirement is not met", async () => {
      mockReq.session = { 
        account: { accountId: 1, username: "testuser" },
        classId: "1"
      } as any;
      
      mockRedisClient.get
        .mockResolvedValueOnce("true") // auth_user cache hit
        .mockResolvedValueOnce("true"); // auth_class cache hit
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue({ permissionLevel: 1 }); // Insufficient permission

      const middleware = checkAccess(["ACCOUNT", "CLASS", "ADMIN"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const expectedError: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "The permission level is not sufficient to perform this action",
        expected: true
      };

      expect(mockNext).toHaveBeenCalledWith(expectedError);
    });
  });

  describe("Error handling", () => {
    it("should pass database errors to next middleware", async () => {
      mockReq.session = { account: { accountId: 1, username: "testuser" } } as any;
      mockRedisClient.get.mockResolvedValue(null);
      const dbError = new Error("Database connection failed");
      mockPrismaClient.account.findUnique.mockRejectedValue(dbError);

      const middleware = checkAccess(["ACCOUNT"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it("should pass Redis errors to next middleware", async () => {
      mockReq.session = { account: { accountId: 1, username: "testuser" } } as any;
      const redisError = new Error("Redis connection failed");
      mockRedisClient.get.mockRejectedValue(redisError);

      const middleware = checkAccess(["ACCOUNT"]);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(redisError);
    });
  });
});