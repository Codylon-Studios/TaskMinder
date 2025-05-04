import { redisClient, cacheKeySubstitutionsData, cacheExpiration } from "../config/constant";
import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import logger from "../logger";

async function loadSubstitutionData(): Promise<void> {
  if (process.env.DSB_ACTIVATED != "true") {
    return
  }
  try {
    if (typeof process.env.DSB_USER != "string") {
      logger.error("DSB user not defined! Either define it in the .env file or set DSB_AVTIVATED to false!")
      return
    }
    if (typeof process.env.DSB_PASSWORD != "string") {
      logger.error("DSB password not defined! Either define it in the .env file or set DSB_AVTIVATED to false!")
      return
    }
    let username = process.env.DSB_USER;
    let password = process.env.DSB_PASSWORD;

    let authId: string;
    try {
      let url = `https://mobileapi.dsbcontrol.de/authid?user=${username}&password=${password}&appversion=&bundleid=&osversion=&pushid=`
      let authRes = await axios.get<string>(url);
      authId = authRes.data;
      if (authId == "") {
        logger.error("The DSB credeantials don't return a valid authId! Either correct them or set DSB_ACTIVATED to false!")
        return
      }
    }
    catch (err) {
      logger.error("Error getting DSBmobile AuthId: ", err)
      return
    }

    let plan1Url: string, plan2Url: string
    try {
      let url = `https://mobileapi.dsbcontrol.de/dsbtimetables?authid=${authId}`
      let timetablesRes = await axios.get<{Childs: {Detail: string}[]}[]>(url);
      plan1Url = timetablesRes.data[0].Childs[0].Detail;
      plan2Url = timetablesRes.data[2].Childs[0].Detail;
    }
    catch (err) {
      logger.error("Error getting DSBmobile data: ", err)
      return
    }

    let substitutionEntryKeys = ["class", "lesson", "time", "subject", "text", "teacher", "teacherOld", "room", "type"]

    type Plan = {
      substitutions: any;
      date: string;
    }
    let substitutionsData : { plan1: Plan, plan2: Plan, updated: string };
    substitutionsData = {
      plan1: {substitutions: null, date: ""},
      plan2: {substitutions: null, date: ""},
      updated: ""
    }

    for (let id: 1 | 2 = 1; id <= 2; id++) {
      let planData: { [key: string] : string}[] = [];
      let url = [plan1Url, plan2Url][id - 1]
      let planRes = await axios.get(url, { responseType: "arraybuffer" });
      let planHtml = iconv.decode(Buffer.from(planRes.data), "ISO-8859-1")
      let $ = cheerio.load(planHtml);
      $(".mon_list tr:not(:nth-child(1))").each((_, substitutionEntry) => {
        let data: { [key: string] : string} = {}
        $(substitutionEntry).find("td").each((j, substitutionEntryData) => {
          let val = $(substitutionEntryData).text();
          if (["---", "&nbsp;", " ", "\u00A0"].includes(val)) {
            val = "-"
          }
          data[substitutionEntryKeys[j]] = val
        });
        planData.push(data)
      });
      
      substitutionsData["plan" + id as "plan1" | "plan2"]["substitutions"] = planData;

      substitutionsData["plan" + id as "plan1" | "plan2"]["date"] = $(".mon_title").text().split(" ")[0];
      substitutionsData["updated"] = $(".mon_head p").text().split("Stand: ")[1]
    }

    try {
      await redisClient.set(cacheKeySubstitutionsData, JSON.stringify(substitutionsData), { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error()
    }
  }
  catch (err) {
    logger.error("Error fetching substitutions data:", err);
  }
}

setInterval(loadSubstitutionData, 60000);

export async function getSubstitutionData() {
  if (process.env.DSB_ACTIVATED != "true") {
    return {}
  }
  let cachedData = await redisClient.get(cacheKeySubstitutionsData);
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  else {
    await loadSubstitutionData();
    cachedData = await redisClient.get(cacheKeySubstitutionsData) ?? "{}";
    return JSON.parse(cachedData);
  }
}

export default {getSubstitutionData};
