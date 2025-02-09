const { redisClient, cacheKeySubstitutionsData, cacheExpiration } = require('./constant');
const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function getSubstitutionsData() {
  async function parseTimetable(id) {
    let url = [timetable1Url, timetable2Url][id]
    let timetableRes = await axios.get(url, { responseType: 'arraybuffer' });
    let timetableHtml = iconv.decode(Buffer.from(timetableRes.data), 'ISO-8859-1')
    $ = cheerio.load(timetableHtml, { decodeEntities: true });
    $(".mon_list tr:not(:nth-child(1))").each((i, element) => {
      let classValue = $(element).find("td").first().text()
      if (! /^10[a-zA-Z]*d[a-zA-Z]*/.test(classValue)) { // Correct Regex: /^10[a-zA-Z]*d[a-zA-Z]*/   everything Regex: /^.*/
        return;
      }
      let data = {}
      $(element).find("td").each((j, element2) => {
        let val = $(element2).text();
        if (["---", "&nbsp;", " ", "\u00A0"].includes(val)) {
          val = "-"
        }
        data[timetableKeys[j]] = val
      });
      timetableData[id].push(data)
    });
  }
  let username = "148762";
  let password = "MTGSuS201617";
  let authRes = await axios.get(`https://mobileapi.dsbcontrol.de/authid?user=${username}&password=${password}&appversion=&bundleid=&osversion=&pushid=`);
  let authId = authRes.data;

  let timetablesRes = await axios.get(`https://mobileapi.dsbcontrol.de/dsbtimetables?authid=${authId}`);
  let timetable1Url = timetablesRes.data[0].Childs[0].Detail;
  let timetable2Url = timetablesRes.data[2].Childs[0].Detail;
  let $;

  let timetableKeys = ["class", "lesson", "time", "subject", "text", "teacher", "teacherOld", "room", "type"]

  let timetableData = [[], []]
  
  await parseTimetable(0)
  await parseTimetable(1)

  try {
    await redisClient.set(cacheKeySubstitutionsData, JSON.stringify(timetableData), { EX: cacheExpiration });
  } catch (err) {
    console.error('Error updating Redis cache:', err);
  }
}

setInterval(getSubstitutionsData, 60000);

router.get('/get_substitutions_data', async (req, res) => {
  let cachedData = await redisClient.get(cacheKeySubstitutionsData);
  if (cachedData) {
    res.status(200).json(JSON.parse(cachedData))
  }
  else {
    await getSubstitutionsData();
    cachedData = await redisClient.get(cacheKeySubstitutionsData);
    res.status(200).json(JSON.parse(cachedData))
  }
});

module.exports = router;
