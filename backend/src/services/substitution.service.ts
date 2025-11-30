import { redisClient, cacheExpiration, CACHE_KEY_PREFIXES, generateCacheKey, STALE_THRESHOLD_MS } from "../config/redis";
import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import logger from "../config/logger";
import { Session, SessionData } from "express-session";
import { default as prisma } from "../config/prisma";

type SubstitutionData = {
  plan1: { substitutions: unknown; date: string };
  plan2: { substitutions: unknown; date: string };
  updated: string;
};


async function fetchFromDSBMobileServer(authId: string): Promise<{
    plan1Url: string;
    plan2Url: string;
}> {
  const timetablesUrl = `https://mobileapi.dsbcontrol.de/dsbtimetables?authid=${authId}`;
  const timetablesRes = await axios.get<{ Childs: { Detail: string }[] }[]>(
    timetablesUrl,
    { timeout: 8_000 }
  );
  const plan1Url = timetablesRes.data[0]?.Childs[0]?.Detail;
  const plan2Url = timetablesRes.data[2]?.Childs[0]?.Detail;

  if (!plan1Url || !plan2Url) {
    throw new Error("Could not retrieve timetable URLs from DSB.");
  }
  return {plan1Url, plan2Url};
}

export async function loadSubstitutionData(
  dsbMobileUser: string, 
  dsbMobilePassword: string, 
  cacheKey: string
): Promise<SubstitutionData | "No data"> {
  try {
    const generalReqData = "appversion=&bundleid=&osversion=&pushid=";
    const authUrl = `https://mobileapi.dsbcontrol.de/authid?user=${dsbMobileUser}&password=${dsbMobilePassword}&${generalReqData}`;
    const authRes = await axios.get<string>(authUrl, { timeout: 10_000 });
    const authId = authRes.data;
    if (!authId) {
      throw new Error("The DSB credentials did not return a valid authId.");
    }

    const { plan1Url, plan2Url } = await fetchFromDSBMobileServer(authId);
    
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

    logger.info(`Substitution successfully fetched for class: ${dsbMobileUser}, cacheKey: ${cacheKey}`);

    const cachePayload = {
      data: substitutionsResult,
      timestamp: Date.now()
    };
    await redisClient.set(cacheKey, JSON.stringify(cachePayload), { EX: cacheExpiration });
    
    return substitutionsResult;
  } 
  catch (error) {
    logger.warn(`Error fetching substitution data: ${error}`);
    
    // Try to get existing cached data instead of overwriting with "No data"
    try {
      const existingCache = await redisClient.get(cacheKey);
      if (existingCache) {
        // timestamp is ignored but is needed for parsing from redis
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data, timestamp } = JSON.parse(existingCache);
        logger.info(`Serving stale data from cache due to fetch error for key ${cacheKey}`);
        return data;
      }
    } 
    catch (cacheErr) {
      logger.error(`Error reading from cache: ${cacheErr}`);
    }
    // Only return "No data" if there's no cached data at all
    return "No data";
  }
}

// Use of longer cache TTL (1 hour) and serve data from Redis immediately, even if it's stale. 
// If data is older than freshness threshold (5 minutes), trigger a background job to refresh it without delaying the user. 
// This approach improves performance while still keeping data reasonably fresh.
export async function getSubstitutionData(session: Session & Partial<SessionData>): Promise<{
    data: SubstitutionData | "No data";
    classFilterRegex: string | null;
}> {
  const substitutionClass = await prisma.class.findUnique({
    where: { classId: parseInt(session.classId!) }
  });

  if (!substitutionClass || !substitutionClass.dsbMobileActivated || !substitutionClass.dsbMobileUser || !substitutionClass.dsbMobilePassword) {
    return { data: "No data", classFilterRegex: null};
  }

  const { dsbMobileUser, dsbMobilePassword, classId } = substitutionClass;

  // Transform class name to regex if it follows the "NumberLetter" pattern (e.g., "10d")
  // It generates a regex that matches the class number, any sequence of letters, the class letter,
  // and any sequence of letters after that. This allows matching class names like "10d", "10bd", "10abcd", etc.
  let classFilterRegex = substitutionClass.dsbMobileClass;
  if (classFilterRegex) {
    const match = classFilterRegex.match(/^(\d+)([a-zA-Z]+)$/);
    if (match) {
      const [, classNumber, classLetter] = match;
      classFilterRegex = `^${classNumber}[a-zA-Z]*${classLetter}[a-zA-Z]*`;
    }
  }

  const cacheKey = generateCacheKey(CACHE_KEY_PREFIXES.SUBSTITUTIONS, classId.toString());

  const cachedEntry = await redisClient.get(cacheKey);

  if (!cachedEntry) {
    const data =  await loadSubstitutionData(dsbMobileUser, dsbMobilePassword, cacheKey);
    return {data, classFilterRegex: classFilterRegex};
  }

  const { data, timestamp } = JSON.parse(cachedEntry);
  const isStale = (Date.now() - timestamp) > STALE_THRESHOLD_MS;

  if (isStale) {
    loadSubstitutionData(dsbMobileUser, dsbMobilePassword, cacheKey)
      .catch(err => {
        logger.error(`Background refresh failed for key ${cacheKey}: ${err}`);
      });
  }

  return { data, classFilterRegex };
}
export default { getSubstitutionData };
