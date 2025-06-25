import { redisClient, cacheExpiration, CACHE_KEY_PREFIXES, generateCacheKey } from "../config/redis";
import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import logger from "../utils/logger";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import prisma from "../config/prisma";

async function loadSubstitutionData(dsbMobileUser: string, dsbMobilePassword: string, setSubstitutionDataCacheKey: string): Promise<void> {
  try {

    let authId: string;
    try {
      // eslint-disable-next-line max-len
      const url = `https://mobileapi.dsbcontrol.de/authid?user=${dsbMobileUser}&password=${dsbMobilePassword}&appversion=&bundleid=&osversion=&pushid=`;
      const authRes = await axios.get<string>(url);
      authId = authRes.data;
      if (authId == "") {
        logger.error(
          "The DSB credentials don't return a valid authId! Either correct them or set DSB_ACTIVATED to false!"
        );
        return;
      }
    }
    catch (err) {
      logger.error("Error getting DSBmobile AuthId: ", err);
      return;
    }

    let plan1Url: string, plan2Url: string;
    try {
      const url = `https://mobileapi.dsbcontrol.de/dsbtimetables?authid=${authId}`;
      const timetablesRes = await axios.get<{ Childs: { Detail: string }[] }[]>(url);
      plan1Url = timetablesRes.data[0].Childs[0].Detail;
      plan2Url = timetablesRes.data[2].Childs[0].Detail;
    }
    catch (err) {
      logger.error("Error getting DSBmobile data: ", err);
      return;
    }

    const substitutionEntryKeys = [
      "class",
      "lesson",
      "time",
      "subject",
      "text",
      "teacher",
      "teacherOld",
      "room",
      "type"
    ];

    type Plan = {
      substitutions: unknown;
      date: string;
    };
    const substitutionsData: { plan1: Plan; plan2: Plan; updated: string } = {
      plan1: { substitutions: null, date: "" },
      plan2: { substitutions: null, date: "" },
      updated: ""
    };

    for (let id: 1 | 2 = 1; id <= 2; id++) {
      const planData: { [key: string]: string }[] = [];
      const url = [plan1Url, plan2Url][id - 1];
      const planRes = await axios.get(url, { responseType: "arraybuffer" });
      const planHtml = iconv.decode(Buffer.from(planRes.data), "ISO-8859-1");
      const $ = cheerio.load(planHtml);
      $(".mon_list tr:not(:nth-child(1))").each((_, substitutionEntry) => {
        const data: { [key: string]: string } = {};
        $(substitutionEntry)
          .find("td")
          .each((j, substitutionEntryData) => {
            let val = $(substitutionEntryData).text();
            if (["---", "&nbsp;", " ", "\u00A0"].includes(val)) {
              val = "-";
            }
            data[substitutionEntryKeys[j]] = val;
          });
        planData.push(data);
      });

      substitutionsData[("plan" + id) as "plan1" | "plan2"]["substitutions"] = planData;

      substitutionsData[("plan" + id) as "plan1" | "plan2"]["date"] = $(".mon_title").text().split(" ")[0];
      substitutionsData["updated"] = $(".mon_head p").text().split("Stand: ")[1];
    }

    try {
      await redisClient.set(setSubstitutionDataCacheKey, JSON.stringify(substitutionsData), { EX: cacheExpiration });
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  }
  catch {
    logger.error("Error fetching substitutions data!");
    const substitutionsData = "No data";
    try {
      await redisClient.set(setSubstitutionDataCacheKey, JSON.stringify(substitutionsData), { EX: cacheExpiration });
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  }
}

// load all substitution data from all classes from dsb mobile server 
// every 1 minute from 6am to 3 pm monday to friday, else hourly
function scheduleUpdateLoop() {
  const now = new Date();
  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
  const isWorkingHours = now.getHours() >= 6 && now.getHours() < 15;

  const delay = isWeekday && isWorkingHours ? 60_000 : 3_600_000; // 1 min vs 1 hr

  updateSubstitutionDataCache().catch(logger.error);

  setTimeout(scheduleUpdateLoop, delay); // recursively schedule next run
}

scheduleUpdateLoop();


async function updateSubstitutionDataCache() {
  // get clases which have substitution services in the db
  const substitutionClasses = await prisma.class.findMany({
    where: {
      dsbMobileActivated: true
    }
  });

  // no classes have a substitution service
  if (!substitutionClasses) {
    return;
  }

  // TODO:
  // look if concurrent requets are possible with promises
  // rate-limiting from DSB Mobile API Server?
  for (const classItem of substitutionClasses) {

    if (!classItem.dsbMobileUser) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "dsbMobileActivated is set to true, but dsbMobileUser is not available",
        expected: true
      };
      throw err;
    }

    if (!classItem.dsbMobilePassword) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "dsbMobileActivated is set to true, but dsbMobilePassword is not available",
        expected: true
      };
      throw err;
    }
    const updateSubstitutionDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.SUBSTITUTIONS, classItem.classId.toString());

    await loadSubstitutionData(classItem.dsbMobileUser, classItem.dsbMobilePassword, updateSubstitutionDataCacheKey);
  }
}

export async function getSubstitutionData(session: Session & Partial<SessionData>) {
  if (!session.classId) {
    const err: RequestError = {
      name: "Unauthorized",
      status: 401,
      message: "User not logged into class",
      expected: true
    };
    throw err;
  }
  const substitutionClass = await prisma.class.findUnique({
    where: {
      classId: parseInt(session.classId)
    }
  });

  if (!substitutionClass) {
    delete session.classId;
    const err: RequestError = {
      name: "Not Found",
      status: 404,
      message: "No class found for substitution data",
      expected: true
    };
    throw err;
  }

  if (substitutionClass.dsbMobileActivated != true) {
    return "No data";
  }

  if (!substitutionClass.dsbMobileUser) {
    const err: RequestError = {
      name: "Not Found",
      status: 404,
      message: "dsbMobileActivated is set to true, but dsbMobileUser is not available",
      expected: true
    };
    throw err;
  }

  if (!substitutionClass.dsbMobilePassword) {
    const err: RequestError = {
      name: "Not Found",
      status: 404,
      message: "dsbMobileActivated is set to true, but dsbMobilePassword is not available",
      expected: true
    };
    throw err;
  }

  const getSubstitutionDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.SUBSTITUTIONS, session.classId);

  let cachedData = await redisClient.get(getSubstitutionDataCacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  else {
    await loadSubstitutionData(substitutionClass.dsbMobileUser, substitutionClass.dsbMobilePassword, getSubstitutionDataCacheKey);
    cachedData = (await redisClient.get(getSubstitutionDataCacheKey)) ?? "No data";
    return JSON.parse(cachedData);
  }
}

export default { getSubstitutionData };
