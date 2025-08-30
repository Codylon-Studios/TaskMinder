import { mock, describe, it, expect, beforeEach } from "bun:test";
import accountService from "../services/accountService";
import { Session, SessionData } from "express-session";
import { 
  changePasswordTypeBody, 
  changeUsernameTypeBody, 
  checkUsernameTypeBody, 
  deleteAccountTypeBody, 
  loginAccountTypeBody, 
  registerAccountTypeBody 
} from "../schemas/accountSchema";

// Mock Prisma
const mockPrismaClient = {
  account: {
    findUnique: mock(),
    create: mock(),
    update: mock(),
    delete: mock()
  },
  joinedClass: {
    findUnique: mock(),
    create: mock()
  },
  class: {
    findUnique: mock()
  },
  deletedAccount: {
    create: mock()
  },
  $transaction: mock()
};
mock.module("../config/prisma", () => ({ default: mockPrismaClient }));


// Mock bcrypt
const mockBcrypt = {
  hash: mock(),
  compare: mock()
};
mock.module("bcrypt", () => ({ default: mockBcrypt }));

// Mock Redis
const mockRedisClient = {
  del: mock()
};
mock.module("../config/redis", () => ({ redisClient: mockRedisClient }));


describe("accountService", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockPrismaClient.account.findUnique.mockClear();
    mockPrismaClient.account.create.mockClear();
    mockPrismaClient.account.update.mockClear();
    mockPrismaClient.account.delete.mockClear();
    mockPrismaClient.joinedClass.findUnique.mockClear();
    mockPrismaClient.joinedClass.create.mockClear();
    mockPrismaClient.class.findUnique.mockClear();
    mockPrismaClient.deletedAccount.create.mockClear();
    mockPrismaClient.$transaction.mockClear();
    mockBcrypt.hash.mockClear();
    mockBcrypt.compare.mockClear();
    mockRedisClient.del.mockClear();

    // Default mock implementations
    mockPrismaClient.$transaction.mockImplementation(async callback => callback(mockPrismaClient));
    mockBcrypt.hash.mockResolvedValue("hashedPassword");
    mockBcrypt.compare.mockResolvedValue(true);
  });

  describe("getAuth", () => {
    it("should return not logged in and not in class if session is null", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await accountService.getAuth(null as any);
      expect(result).toEqual({ loggedIn: false, classJoined: false });
    });

    it("should return logged in and class joined if account and class exist in session", async () => {
      const session = {
        account: { accountId: 1, username: "testuser" }
      } as Session & Partial<SessionData>;
      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 1, username: "testuser" });
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue({ permissionLevel: 2, classId: 1 });

      const result = await accountService.getAuth(session);

      expect(result).toEqual({
        loggedIn: true,
        account: { username: "testuser" },
        classJoined: true,
        permissionLevel: 2
      });
      expect(session.classId).toBe("1");
    });

    it("should handle cases where the user is not logged in but has a classId", async () => {
      const session = {
        classId: "1"
      } as Session & Partial<SessionData>;
      mockPrismaClient.class.findUnique.mockResolvedValue({ defaultPermissionLevel: 1 });
      const result = await accountService.getAuth(session);
      expect(result).toEqual({
        loggedIn: false,
        classJoined: true,
        permissionLevel: 1
      });
    });
  });

  describe("registerAccount", () => {
    it("should register a new account", async () => {
      const reqData: registerAccountTypeBody = { username: "newuser", password: "password" };
      const session = {} as Session & Partial<SessionData>;
      mockPrismaClient.account.findUnique.mockResolvedValue(null);
      mockPrismaClient.account.create.mockResolvedValue({ accountId: 2, username: "newuser" });

      await accountService.registerAccount(reqData, session);

      expect(mockBcrypt.hash).toHaveBeenCalledWith("password", 10);
      expect(session.account).toEqual({ username: "newuser", accountId: 2 });
    });

    it("should throw an error if already logged in", async () => {
      const reqData: registerAccountTypeBody = { username: "newuser", password: "password" };
      const session = { account: { accountId: 1, username: "testuser" } } as Session & Partial<SessionData>;
      expect(accountService.registerAccount(reqData, session)).rejects.toThrow("Already logged in");
    });
  });

  describe("logoutAccount", () => {
    it("should log out a user", async () => {
      const session = { account: { accountId: 1, username: "testuser" } } as Session & Partial<SessionData>;
      await accountService.logoutAccount(session);
      expect(session.account).toBeUndefined();
    });
  });

  describe("loginAccount", () => {
    it("should log in a user", async () => {
      const reqData: loginAccountTypeBody = { username: "testuser", password: "password" };
      const session = {} as Session & Partial<SessionData>;
      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 1, username: "testuser", password: "hashedPassword" });
      mockBcrypt.compare.mockResolvedValue(true);
      mockPrismaClient.joinedClass.findUnique.mockResolvedValue(null);

      await accountService.loginAccount(reqData, session);

      expect(session.account).toEqual({ username: "testuser", accountId: 1 });
    });

    it("should throw an error for invalid credentials", async () => {
      const reqData: loginAccountTypeBody = { username: "testuser", password: "wrongpassword" };
      const session = {} as Session & Partial<SessionData>;
      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 1, username: "testuser", password: "hashedPassword" });
      mockBcrypt.compare.mockResolvedValue(false);

      expect(accountService.loginAccount(reqData, session)).rejects.toThrow("Invalid credentials");
    });
  });

  describe("deleteAccount", () => {
    it("should delete an account", async () => {
      const reqData: deleteAccountTypeBody = { password: "password" };
      const session = { account: { accountId: 1, username: "testuser" } } as Session & Partial<SessionData>;

      mockPrismaClient.joinedClass.findUnique.mockResolvedValue({ permissionLevel: 1 });
      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 1, username: "testuser", password: "hashedPassword" });
      mockBcrypt.compare.mockResolvedValue(true);

      await accountService.deleteAccount(reqData, session);

      expect(mockPrismaClient.deletedAccount.create).toHaveBeenCalled();
      expect(mockPrismaClient.account.delete).toHaveBeenCalledWith({ where: { accountId: 1 } });
      expect(mockRedisClient.del).toHaveBeenCalledWith("auth_user:1");
      expect(session.account).toBeUndefined();
    });

    it("should throw an error if the account is an admin", async () => {
      const reqData: deleteAccountTypeBody = { password: "password" };
      const session = { account: { accountId: 1, username: "testuser" } } as Session & Partial<SessionData>;

      mockPrismaClient.joinedClass.findUnique.mockResolvedValue({ permissionLevel: 3 });

      expect(accountService.deleteAccount(reqData, session)).rejects.toThrow("The account is still an admin in a class, leave the class first");
    });
  });

  describe("changeUsername", () => {
    it("should change the username", async () => {
      const reqData: changeUsernameTypeBody = { password: "password", newUsername: "newuser" };
      const session = { account: { accountId: 1, username: "testuser" } } as Session & Partial<SessionData>;

      mockPrismaClient.account.findUnique.mockResolvedValueOnce(null); // for new username check
      mockPrismaClient.account.findUnique.mockResolvedValueOnce({ accountId: 1, username: "testuser", password: "hashedPassword" });
      mockBcrypt.compare.mockResolvedValue(true);

      await accountService.changeUsername(reqData, session);

      expect(mockPrismaClient.account.update).toHaveBeenCalledWith({
        where: { accountId: 1 },
        data: { username: "newuser" }
      });
      expect(session.account).toEqual({ username: "newuser", accountId: 1 });
    });

    it("should throw an error if the new username already exists", async () => {
      const reqData: changeUsernameTypeBody = { password: "password", newUsername: "existinguser" };
      const session = { account: { accountId: 1, username: "testuser" } } as Session & Partial<SessionData>;

      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 2, username: "existinguser" });

      expect(accountService.changeUsername(reqData, session)).rejects.toThrow("Username already exists, please choose another username.");
    });
  });

  describe("changePassword", () => {
    it("should change the password", async () => {
      const reqData: changePasswordTypeBody = { oldPassword: "oldpassword", newPassword: "newpassword" };
      const session = { account: { accountId: 1, username: "testuser" } } as Session & Partial<SessionData>;

      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 1, password: "hashedOldPassword" });
      mockBcrypt.compare.mockResolvedValue(true);
      mockBcrypt.hash.mockResolvedValue("hashedNewPassword");

      await accountService.changePassword(reqData, session);

      expect(mockPrismaClient.account.update).toHaveBeenCalledWith({
        where: { accountId: 1 },
        data: { password: "hashedNewPassword" }
      });
    });

    it("should throw an error for invalid old password", async () => {
      const reqData: changePasswordTypeBody = { oldPassword: "wrongpassword", newPassword: "newpassword" };
      const session = { account: { accountId: 1, username: "testuser" } } as Session & Partial<SessionData>;

      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 1, password: "hashedOldPassword" });
      mockBcrypt.compare.mockResolvedValue(false);

      expect(accountService.changePassword(reqData, session)).rejects.toThrow("Invalid credentials");
    });
  });

  describe("checkUsername", () => {
    it("should return true if username exists", async () => {
      const reqData: checkUsernameTypeBody = { username: "testuser"};
      mockPrismaClient.account.findUnique.mockResolvedValue({ accountId: 1, username: "testuser" });
      const result = await accountService.checkUsername(reqData);
      expect(result).toBe(true);
    });

    it("should return false if username does not exist", async () => {
      const reqData: checkUsernameTypeBody = { username: "nouser"};
      mockPrismaClient.account.findUnique.mockResolvedValue(null);
      const result = await accountService.checkUsername(reqData);
      expect(result).toBe(false);
    });
  });
});
