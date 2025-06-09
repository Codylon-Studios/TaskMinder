import { RequestError } from "../@types/requestError";
import { cacheExpiration, redisClient } from "../config/redis";
import prisma from "../config/prisma";
import logger from "./logger";

async function updateCacheData<T>(data: T[], key: string) {
  try {
    await redisClient.set(key, JSON.stringify(data, BigIntreplacer), {
      EX: cacheExpiration,
    });
  } catch (err) {
    logger.error("Error updating Redis" + key + "cache:", err);
  }
}

function BigIntreplacer(key: string, value: any) {
  return typeof value === "bigint" ? value.toString() : value;
}

async function isValidTeamId(teamId: number) {
  if (teamId !== -1) {
    const teamExists = await prisma.team.findUnique({
      where: {
        teamId: 1,
      },
    });
    if (!teamExists) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Invalid teamId (Team does not exist): " + teamId,
        expected: true,
      };
      throw err;
    }
  } else {
    return;
  }
}

async function isValidSubjectId(subjectId: number) {
  if (subjectId !== -1) {
    const subjectExists = await prisma.subjects.findUnique({
      where: {
        subjectId: 1,
      },
    });
    if (!subjectExists) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Invalid subjectId (Subject does not exist): " + subjectId,
        expected: true,
      };
      throw err;
    }
  } else {
    return;
  }
}

async function isValidweekDay(weekDay: number) {
  if ([0, 1, 2, 3, 4].includes(weekDay)) return;
  const err: RequestError = {
    name: "Not Found",
    status: 404,
    message: "Invalid weekday: " + weekDay,
    expected: true,
  };
  throw err;
}

async function isValidGender(gender: string) {
  if (["d", "w", "m"].includes(gender)) return;
  const err: RequestError = {
    name: "Not Found",
    status: 404,
    message: "The provided gender is not valid: " + gender,
    expected: true,
  };
  throw err;
}

function isValidColor(color: string) {
  const hexColorRegex = /^#[0-9a-f]{6}$/i;
  const colorValid = hexColorRegex.test(color);
  if (!colorValid) {
    const err: RequestError = {
      name: "Bad Request",
      status: 400,
      message: "Color must be a 6-digit hex code",
      expected: true,
    };
    throw err;
  } else {
    return;
  }
}

function lessonDateEventAtLeastOneNull(
  endDate: number | null,
  lesson: string | null
) {
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
      expected: true,
    };
    throw err;
  }
}

export {
  isValidColor,
  isValidSubjectId,
  isValidTeamId,
  isValidweekDay,
  lessonDateEventAtLeastOneNull,
  isValidGender,
  BigIntreplacer,
  updateCacheData,
};
