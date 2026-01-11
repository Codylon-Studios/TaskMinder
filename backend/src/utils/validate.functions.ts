import { RequestError } from "../@types/requestError";
import { CACHE_KEY_PREFIXES, cacheExpiration, generateCacheKey, redisClient } from "../config/redis";
import prisma from "../config/prisma";
import logger from "../config/logger";
import { Session, SessionData } from "express-session";
import { FileTypes } from "../config/upload";

async function updateCacheData<T>(data: T[], key: string): Promise<void> {
  try {
    await redisClient.set(key, JSON.stringify(data, BigIntreplacer), {
      EX: cacheExpiration
    });
  }
  catch (err) {
    logger.error(`Error updating Redis ${key} cache: ${err}`);
  }
}

async function invalidateCache(
  key: keyof typeof CACHE_KEY_PREFIXES,
  classId: string
): Promise<void> {
  const cacheKey = generateCacheKey(CACHE_KEY_PREFIXES[key], classId);
  try {
    await redisClient.del(cacheKey);
  }
  catch (err) {
    logger.error(`Error invalidating cache for ${CACHE_KEY_PREFIXES[key]}: ${err}`);
  }
};

export function checkUsername(username: string): boolean {
  return /^\w{4,20}$/.test(username);
}

function BigIntreplacer(key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

async function isValidUploadInput(uploadName: string, uploadType: string): Promise<void> {
  if (!(uploadName !== "" && Object.values(FileTypes).includes(uploadType as FileTypes))) {
    const err: RequestError = {
      name: "Bad Request",
      status: 400,
      message: "Please provide a valid name, teamId (int) and valid file type (INFO_SHEET,LESSON_NOTE,WORKSHEET,IMAGE,FILE,TEXT)",
      expected: true
    };
    throw err;
  }
}

async function isValidEventTypeId(eventTypeId: number, session: Session & Partial<SessionData>): Promise<void> {
  const eventTypeExists = await prisma.eventType.findUnique({
    where: {
      eventTypeId: eventTypeId,
      classId: parseInt(session.classId!, 10)
    }
  });
  if (!eventTypeExists) {
    const err: RequestError = {
      name: "Not Found",
      status: 404,
      message: "Invalid eventTypeId (eventType does not exist) for this class: " + eventTypeId,
      expected: true
    };
    throw err;
  }
}

async function isValidTeamId(teamId: number, session: Session & Partial<SessionData>): Promise<void> {
  if (teamId !== -1) {
    const teamExists = await prisma.team.findUnique({
      where: {
        teamId: teamId,
        classId: parseInt(session.classId!, 10)
      }
    });
    if (!teamExists) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Invalid teamId (Team does not exist) for this class: " + teamId,
        expected: true
      };
      throw err;
    }
  }
  else {
    return;
  }
}

async function isValidSubjectId(subjectId: number, session: Session & Partial<SessionData>): Promise<void> {
  if (subjectId !== -1) {
    const subjectExists = await prisma.subjects.findUnique({
      where: {
        subjectId: subjectId,
        classId: parseInt(session.classId!, 10)
      }
    });
    if (!subjectExists) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Invalid subjectId (Subject does not exist) for this class: " + subjectId,
        expected: true
      };
      throw err;
    }
  }
  else {
    return;
  }
}

async function isValidweekDay(weekDay: number): Promise<void> {
  if ([0, 1, 2, 3, 4].includes(weekDay)) return;
  const err: RequestError = {
    name: "Not Found",
    status: 404,
    message: "Invalid weekday: " + weekDay,
    expected: true
  };
  throw err;
}

async function isValidGender(gender: string): Promise<void> {
  if (["d", "w", "m"].includes(gender)) return;
  const err: RequestError = {
    name: "Not Found",
    status: 404,
    message: "The provided gender is not valid: " + gender,
    expected: true
  };
  throw err;
}

function isValidColor(color: string): void {
  const hexColorRegex = /^#[0-9a-f]{6}$/i;
  const colorValid = hexColorRegex.test(color);
  if (!colorValid) {
    const err: RequestError = {
      name: "Bad Request",
      status: 400,
      message: "Color must be a 6-digit hex code",
      expected: true
    };
    throw err;
  }
  else {
    return;
  }
}

function lessonDateEventAtLeastOneNull(endDate: number | null, lesson: string | null): void {
  if (
    !(
      ["", undefined, null].includes(endDate as string | null | undefined) ||
      ["", undefined, null].includes(lesson as string | null | undefined)
    )
  ) {
    const err: RequestError = {
      name: "Unprocessable Entity",
      status: 422,
      message: "Only one entry (lesson or endDate) are allowed",
      expected: true
    };
    throw err;
  }
}

export {
  isValidUploadInput,
  isValidColor,
  isValidSubjectId,
  isValidTeamId,
  isValidEventTypeId,
  isValidweekDay,
  lessonDateEventAtLeastOneNull,
  isValidGender,
  BigIntreplacer,
  updateCacheData,
  invalidateCache
};
