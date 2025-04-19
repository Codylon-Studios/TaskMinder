let updateAllFunctions = []
let requiredData

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

function dataLoaded(dataName) {
  let dataMap = {
    "subjectData": subjectData,
    "timetableData": timetableData,
    "homeworkData": homeworkData,
    "homeworkCheckedData": homeworkCheckedData,
    "substitutionsData": substitutionsData,
    "classSubstitutionsData": classSubstitutionsData,
    "joinedTeamsData": joinedTeamsData,
    "teamsData": teamsData,
    "eventData": eventData,
    "eventTypeData": eventTypeData
  }

  let dataVariable
  if (dataName == "monthDates") {
    dataVariable = monthDates;
  }
  else {
    dataVariable = dataMap[dataName];
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
  return new Promise(async (resolve) => {
    if (requiredData.length != 0) {
      if (requiredData.includes("subjectData")) {subjectData = undefined; loadSubjectData()}
      if (requiredData.includes("timetableData")) {timetableData = undefined; loadTimetableData()}
      if (requiredData.includes("homeworkData")) {homeworkData = undefined; loadHomeworkData()}
      if (requiredData.includes("homeworkCheckedData")) {homeworkCheckedData = undefined; loadHomeworkCheckedData()}
      if (requiredData.includes("substitutionsData")) {substitutionsData = undefined; loadSubstitutionsData()}
      if (requiredData.includes("classSubstitutionsData")) {classSubstitutionsData = undefined; loadClassSubstitutionsData()}
      if (requiredData.includes("joinedTeamsData")) {joinedTeamsData = undefined; loadJoinedTeamsData()}
      if (requiredData.includes("teamsData")) {teamsData = undefined; loadTeamsData()}
      if (requiredData.includes("eventData")) {eventData = undefined; loadEventData()}
      if (requiredData.includes("eventTypeData")) {eventTypeData = undefined; loadEventTypeData()}
    
      updateAll()

      let promises = [];
      
      if (requiredData.includes("subjectData")) {promises.push(dataLoaded("subjectData"))}
      if (requiredData.includes("timetableData")) {promises.push(dataLoaded("timetableData"))}
      if (requiredData.includes("homeworkData")) {promises.push(dataLoaded("homeworkData"))}
      if (requiredData.includes("homeworkCheckedData")) {promises.push(dataLoaded("homeworkCheckedData"))}
      if (requiredData.includes("substitutionsData")) {promises.push(dataLoaded("substitutionsData"))}
      if (requiredData.includes("classSubstitutionsData")) {promises.push(dataLoaded("classSubstitutionsData"))}
      if (requiredData.includes("joinedTeamsData")) {promises.push(dataLoaded("joinedTeamsData"))}
      if (requiredData.includes("teamsData")) {promises.push(dataLoaded("teamsData"))}
      if (requiredData.includes("eventData")) {promises.push(dataLoaded("eventData"))}
      if (requiredData.includes("eventTypeData")) {promises.push(dataLoaded("eventTypeData"))}

      promises.push(userDataLoaded())
      await Promise.all(promises);
  
      document.body.style.display = "block";
      resolve()
    }
    else {
      updateAll()
  
      await userDataLoaded();
      document.body.style.display = "block";
      resolve()
    }
  })
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

$(async () => {
  switch (location.pathname) {
    case "/homework/":
      requiredData = [
        "subjectData",
        "homeworkData",
        "homeworkCheckedData",
        "teamsData",
        "joinedTeamsData"
      ]
      break;
    case "/events/":
      requiredData = [
        "eventData",
        "eventTypeData",
        "teamsData",
        "joinedTeamsData"
      ]
      break;
    case "/main/":
      requiredData = [
        "subjectData",
        "timetableData",
        "homeworkData",
        "homeworkCheckedData",
        "substitutionsData",
        "classSubstitutionsData",
        "eventData",
        "eventTypeData",
        "joinedTeamsData"
      ]
      break;
    case "/settings/":
      requiredData = [
        "teamsData",
        "joinedTeamsData"
      ]
      break;
    default:
      requiredData = []
      break;
  }
  
  await reloadAll();
  
  let hash = window.location.hash;
  if (hash) {
    let $target = $(hash);
      if ($target.length) {
        $("html").animate({
          scrollTop: $target.offset().top - 70
        });
      }
  }
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

if (colorTheme == "light") {
    document.body.setAttribute("data-bs-theme", "light");
}
else {
    document.body.setAttribute("data-bs-theme", "dark");
}

if (location.pathname != "/settings/") {
  let colorThemeSetting = localStorage.getItem("colorTheme") || "auto";

  if (colorThemeSetting == "auto") {
    function updateColorTheme() {
      let colorTheme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        colorTheme = "dark"
      }
      else {
        colorTheme = "light"
      }
    
      if (colorTheme == "light") {
        document.getElementsByTagName("html")[0].style.background = "#ffffff";
        document.body.setAttribute("data-bs-theme", "light");
        $(`meta[name="theme-color"]`).attr("content", "#f8f9fa")
      }
      else {
        document.getElementsByTagName("html")[0].style.background = "#212529";
        document.body.setAttribute("data-bs-theme", "dark");
        $(`meta[name="theme-color"]`).attr("content", "#2b3035")
      }
    }

    window.matchMedia('(prefers-color-scheme: light)').addEventListener("change", updateColorTheme)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", updateColorTheme)
  }
}
