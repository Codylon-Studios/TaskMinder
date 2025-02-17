const { redisClient, cacheKeySubstitutionsData, cacheExpiration } = require('../constant');
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function getSubstitutionsData() {
    async function parsePlan(id) {
        let planData = [];
        let url = [plan1Url, plan2Url][id - 1]
        let planRes = await axios.get(url, { responseType: 'arraybuffer' });
        let planHtml = iconv.decode(Buffer.from(planRes.data), 'ISO-8859-1')
        $ = cheerio.load(planHtml, { decodeEntities: true });
        $(".mon_list tr:not(:nth-child(1))").each((i, substitutionEntry) => {
            let data = {}
            $(substitutionEntry).find("td").each((j, substitutionEntryData) => {
                let val = $(substitutionEntryData).text();
                if (["---", "&nbsp;", " ", "\u00A0"].includes(val)) {
                    val = "-"
                }
                data[substitutionEntryKeys[j]] = val
            });
            planData.push(data)
        });
        substitutionsData["plan" + id]["substitutions"] = planData;

        substitutionsData["plan" + id]["date"] = $(".mon_title").text().split(" ")[0];
        substitutionsData["updated"] = $(".mon_head p").text().split("Stand: ")[1]
    }

    let username = "148762";
    let password = "MTGSuS201617";
    let authRes = await axios.get(`https://mobileapi.dsbcontrol.de/authid?user=${username}&password=${password}&appversion=&bundleid=&osversion=&pushid=`);
    let authId = authRes.data;

    let timetablesRes = await axios.get(`https://mobileapi.dsbcontrol.de/dsbtimetables?authid=${authId}`);
    let plan1Url = timetablesRes.data[0].Childs[0].Detail;
    let plan2Url = timetablesRes.data[2].Childs[0].Detail;
    let $;

    let substitutionEntryKeys = ["class", "lesson", "time", "subject", "text", "teacher", "teacherOld", "room", "type"]

    let substitutionsData = { plan1: {}, plan2: {} }

    await parsePlan(1)
    await parsePlan(2)

    try {
        await redisClient.set(cacheKeySubstitutionsData, JSON.stringify(substitutionsData), { EX: cacheExpiration });
    } catch (err) {
        console.error('Error updating Redis cache:', err);
    }
}

setInterval(getSubstitutionsData, 60000);

const substitutionService = {
    async getSubstitutionData() {
        let cachedData = await redisClient.get(cacheKeySubstitutionsData);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        else {
            await getSubstitutionsData();
            cachedData = await redisClient.get(cacheKeySubstitutionsData);
            return JSON.parse(cachedData);
        }
    }
}

module.exports = substitutionService;