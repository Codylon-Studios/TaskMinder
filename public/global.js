let updateAllFunctions = []
let requiredData = []

function runOnce(fn) {
  async function wrapper(...args) {
    if (wrapper.running) return;
    wrapper.running = true;
    let res = await fn(...args);
    wrapper.running = false;
    return res;
  }
  wrapper.running = false;
  return wrapper;
}

function msToDisplayDate(ms) {
  let date = new Date(parseInt(ms));
  let day = String(date.getDate());
  let month = String(date.getMonth() + 1);
  let year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function msToInputDate(ms) {
  let date = new Date(parseInt(ms));
  let day = String(date.getDate()).padStart(2, '0');
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function dateToMs(dateStr) {
  if (dateStr.includes("-")) {
    let [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getTime();
  }
  else if (dateStr.includes(".")) {
    let [day, month, year] = dateStr.split('.').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getTime();
  }
}

function isSameDay(date1, date2) {
  return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
  );
}

async function getHomeworkCheckStatus(homeworkId) {
  await dataLoaded("homeworkCheckedData")

  return homeworkCheckedData.includes(homeworkId)
}

function getDataMap(filtered) {
  let dataMap = {
    "subjectData": {dataVar: subjectData, loadFn: loadSubjectData},
    "timetableData": {dataVar: timetableData, loadFn: loadTimetableData},
    "homeworkData": {dataVar: homeworkData, loadFn: loadHomeworkData},
    "homeworkCheckedData": {dataVar: homeworkCheckedData, loadFn: loadHomeworkCheckedData},
    "substitutionsData": {dataVar: substitutionsData, loadFn: loadSubstitutionsData},
    "classSubstitutionsData": {dataVar: classSubstitutionsData, loadFn: loadClassSubstitutionsData},
    "joinedTeamsData": {dataVar: joinedTeamsData, loadFn: loadJoinedTeamsData},
    "teamsData": {dataVar: teamsData, loadFn: loadTeamsData},
    "eventData": {dataVar: eventData, loadFn: loadEventData},
    "eventTypeData": {dataVar: eventTypeData, loadFn: loadEventTypeData},
  }
  if (filtered) {
    for (let key in dataMap) {
      if (! requiredData.includes(key)) {
        delete dataMap[key]
      }
    }
  }
  return dataMap
}

function dataLoaded(dataName) {
  let dataMap = getDataMap()

  let dataVariable
  if (dataName == "monthDates") {
    dataVariable = monthDates;
  }
  else {
    dataVariable = dataMap[dataName].dataVar;
  }

  let eventName = dataName + "Loaded"
  return new Promise((resolve) => {
    if (dataVariable != undefined && dataVariable != null) {
      resolve();
      return;
    }
    $(window).on(eventName, () => {
      $(window).off(eventName);
      resolve();
    });
  });
}

function loadSubjectData() {
  $.get('/schedule/get_subject_data', (data) => {
    subjectData = data;
    $(window).trigger("subjectDataLoaded");
  });
}

function loadTimetableData() {
  $.get('/schedule/get_timetable_data', (data) => {
    timetableData = data;
    $(window).trigger("timetableDataLoaded");
  });
}

function loadHomeworkData() {
  $.get('/homework/get_homework_data', (data) => {
    homeworkData = data;
    $(window).trigger("homeworkDataLoaded");
  });
}

async function loadHomeworkCheckedData() {
  await userDataLoaded();

  if (user.loggedIn) {
    // If the user is logged in, get the data from the server
    $.get('/homework/get_homework_checked_data', (data) => {
      homeworkCheckedData = data;
      $(window).trigger("homeworkCheckedDataLoaded");
    });
  }
  else {
    // If the user is not logged in, get the data from the local storage
    homeworkCheckedData = JSON.parse(localStorage.getItem("homeworkCheckedData"))
    if (homeworkCheckedData == null) {
      homeworkCheckedData = [];
    }
    $(window).trigger("homeworkCheckedDataLoaded");
  }
}

function loadSubstitutionsData() {
  $.get('/substitutions/get_substitutions_data', (data) => {
    substitutionsData = data;
    $(window).trigger("substitutionsDataLoaded");
  });
}

async function loadClassSubstitutionsData() {
  await dataLoaded("substitutionsData")

  if (JSON.stringify(substitutionsData) == "{}") {
    classSubstitutionsData = [];
    $(window).trigger("classSubstitutionsDataLoaded");
    return
  }

  let data = [];
  data = structuredClone(substitutionsData);
  for (let planId = 1; planId <= 2; planId++) {
    data["plan" + planId].substitutions = data["plan" + planId].substitutions.filter(entry => /^10[a-zA-Z]*d[a-zA-Z]*/.test(entry.class))
  }
  classSubstitutionsData = data;
  $(window).trigger("classSubstitutionsDataLoaded");
}

async function loadJoinedTeamsData() {
  await userDataLoaded();

  if (user.loggedIn) {
    $.get('/teams/get_joined_teams_data', (data) => {
      joinedTeamsData = data;
      $(window).trigger("joinedTeamsDataLoaded");
    });
  }
  else {
    joinedTeamsData = JSON.parse(localStorage.getItem("joinedTeamsData") || "[]");
    $(window).trigger("joinedTeamsDataLoaded");
  }
}

function loadTeamsData() {
  $.get('/teams/get_teams_data', (data) => {
    teamsData = data;
    $(window).trigger("teamsDataLoaded");
  });
}

function loadEventData() {
  $.get('/events/get_event_data', (data) => {
    eventData = data;
    $(window).trigger("eventDataLoaded");
  });
}

function loadEventTypeData() {
  $.get('/events/get_event_type_data', (data) => {
    eventTypeData = data;
    $(window).trigger("eventTypeDataLoaded");
  });
}

function userDataLoaded() {
  return new Promise((resolve) => {
    try {
      if (user.loggedIn != undefined && user.loggedIn != null) {
        resolve();
        return;
      }
    }
    catch (err) { } // Just wait for the event
    $(window).on("userDataLoaded", () => {
      $(window).off("userDataLoaded");
      resolve();
    });
  });
}

async function reloadAll() {
  let dataMap = getDataMap(true)

  if (Object.keys(dataMap).length != 0) {
    for (let key in dataMap) {
      dataMap[key].dataVar = undefined
      dataMap[key].loadFn()
    }
  
    updateAll()
    
    let promises = Object.keys(dataMap).map(key => dataLoaded(key));
    await Promise.all(promises);
    
    document.body.style.display = "block";
  }
}
reloadAll = runOnce(reloadAll);

function updateAll() {
  updateAllFunctions.forEach(fn => fn())
}

let subjectData;
let timetableData;
let homeworkData;
let homeworkCheckedData;
let substitutionsData;
let classSubstitutionsData;
let joinedTeamsData;
let teamsData;
let eventData;
let eventTypeData;

$(function(){
  reloadAll();
});

// Update everything on clicking the reload button
$(document).on("click", "#navbar-reload-button", () => {
  reloadAll();
});

$(window).on("userDataLoaded", () => {
  user.on("login", () => {
    reloadAll();
  });

  user.on("logout", () => {
    reloadAll();
  });
});

// Change btn group selections to vertical / horizontal
const smallScreenQuery = window.matchMedia("(max-width: 575px)");

function handleSmallScreenQueryChange(ev) {
  if (ev.matches) {
    $(".btn-group-dynamic").removeClass("btn-group").addClass("btn-group-vertical")
  } else {
    $(".btn-group-dynamic").addClass("btn-group").removeClass("btn-group-vertical")
  }
}

smallScreenQuery.addEventListener("change", handleSmallScreenQueryChange);

handleSmallScreenQueryChange(smallScreenQuery)
