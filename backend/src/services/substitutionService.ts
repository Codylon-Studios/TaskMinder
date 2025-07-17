import { redisClient, cacheExpiration, CACHE_KEY_PREFIXES, generateCacheKey, STALE_THRESHOLD_MS } from "../config/redis";
import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import logger from "../utils/logger";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import prisma from "../config/prisma";

type SubstitutionData = {
  plan1: { substitutions: unknown; date: string };
  plan2: { substitutions: unknown; date: string };
  updated: string;
};

export async function loadSubstitutionData(
  dsbMobileUser: string, 
  dsbMobilePassword: string, 
  cacheKey: string
): Promise<SubstitutionData | "No data"> {
  try {
    // eslint-disable-next-line max-len
    const authUrl = `https://mobileapi.dsbcontrol.de/authid?user=${dsbMobileUser}&password=${dsbMobilePassword}&appversion=&bundleid=&osversion=&pushid=`;
    const authRes = await axios.get<string>(authUrl);
    const authId = authRes.data;
    if (!authId) {
      throw new Error("The DSB credentials did not return a valid authId.");
    }

    const timetablesUrl = `https://mobileapi.dsbcontrol.de/dsbtimetables?authid=${authId}`;
    const timetablesRes = await axios.get<{ Childs: { Detail: string }[] }[]>(timetablesUrl);
    const plan1Url = timetablesRes.data[0]?.Childs[0]?.Detail;
    const plan2Url = timetablesRes.data[2]?.Childs[0]?.Detail;

    if (!plan1Url || !plan2Url) {
      throw new Error("Could not retrieve timetable URLs from DSB.");
    }
    
    const substitutionEntryKeys = ["class", "lesson", "time", "subject", "text", "teacher", "teacherOld", "room", "type"];
    const substitutionsResult: SubstitutionData = {
      plan1: { substitutions: null, date: "" },
      plan2: { substitutions: null, date: "" },
      updated: ""
    };

    for (const id of [1, 2] as const) {
      const planData: { [key: string]: string }[] = [];
      const url = (id === 1) ? plan1Url : plan2Url;
      const planRes = await axios.get(url, { responseType: "arraybuffer" });
      const planHtml = iconv.decode(Buffer.from(planRes.data), "ISO-8859-1");
      const $ = cheerio.load(planHtml);

      $(".mon_list tr:not(:nth-child(1))").each((_, substitutionEntry) => {
        const data: { [key: string]: string } = {};
        $(substitutionEntry).find("td").each((j, substitutionEntryData) => {
          const val = $(substitutionEntryData).text().trim();
          data[substitutionEntryKeys[j]] = ["---", " ", ""].includes(val) ? "-" : val;
        });
        planData.push(data);
      });

      substitutionsResult[`plan${id}`].substitutions = planData;
      substitutionsResult[`plan${id}`].date = $(".mon_title").text().split(" ")[0];
      substitutionsResult.updated = $(".mon_head p").text().split("Stand: ")[1] || "";
    }

    const cachePayload = {
      data: substitutionsResult,
      timestamp: Date.now()
    };
    await redisClient.set(cacheKey, JSON.stringify(cachePayload), { EX: cacheExpiration });
    
    return substitutionsResult;

  } 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  catch (error) {
    const errorPayload = {
      data: "No data",
      timestamp: Date.now()
    };
    try {
      await redisClient.set(cacheKey, JSON.stringify(errorPayload), { EX: 300 }); 
    } 
    catch (redisErr) {
      logger.error("Fatal: Error updating Redis cache with error state:", redisErr);
    }
    return "No data";
  }
}

// Use a longer cache TTL (e.g., 1 hour) and serve data from Redis immediately, even if it's stale. 
// If the data is older than your freshness threshold (e.g., 10 minutes), trigger a background job to refresh it without delaying the user. 
// This approach improves performance while still keeping data reasonably fresh.
export async function getSubstitutionData(session: Session & Partial<SessionData>) {
  const substitutionClass = await prisma.class.findUnique({
    where: { classId: parseInt(session.classId!) }
  });

  if (!substitutionClass || !substitutionClass.dsbMobileActivated || !substitutionClass.dsbMobileUser || !substitutionClass.dsbMobilePassword) {
    const err: RequestError = {
      name: "Not Found", 
      status: 404, 
      message: "Substitution data not configured for this class.", 
      expected: true
    };
    throw err;
  }

  const { dsbMobileUser, dsbMobilePassword, classId } = substitutionClass;
  const cacheKey = generateCacheKey(CACHE_KEY_PREFIXES.SUBSTITUTIONS, classId.toString());

  const cachedEntry = await redisClient.get(cacheKey);

  if (!cachedEntry) {
    return await loadSubstitutionData(dsbMobileUser, dsbMobilePassword, cacheKey);
  }

  const { data, timestamp } = JSON.parse(cachedEntry);
  const isStale = (Date.now() - timestamp) > STALE_THRESHOLD_MS;

  if (isStale) {
    loadSubstitutionData(dsbMobileUser, dsbMobilePassword, cacheKey)
      .catch(err => {
        logger.error(`Background refresh failed for key ${cacheKey}:`, err);
      });
  }
  const realClassName = substitutionClass.dsbMobileClass;

  return {data, realClassName};
}
export default { getSubstitutionData };
