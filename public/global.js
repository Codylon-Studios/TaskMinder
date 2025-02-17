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
  else {
    console.warn("Invalid date String", dateStr)
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
  await dataLoaded(homeworkCheckedData, "homeworkCheckedDataLoaded")

  if (user.loggedIn) {
    for (let homework of homeworkCheckedData) {
      if (homework.homeworkId == homeworkId) {
        return homework.checked;
      }
    }
    return false;
  }
  else {
    return homeworkCheckedData[homeworkId];
  }
}

function dataLoaded(dataVariable, eventName) {
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
  fetch('/subjects.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    subjectData = data;
    $(window).trigger("subjectDataLoaded");
  })
  .catch(error => {
    console.error('Error loading the JSON file:', error);
  });
}

function loadTimetableData() {
  fetch('/timetable.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      timetableData = data;
      $(window).trigger("timetableDataLoaded");
    })
    .catch(error => {
      console.error('Error loading the JSON file:', error);
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
      homeworkCheckedData = {};
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

function loadTeamData() {
  teamData = JSON.parse(localStorage.getItem("teamData") || "[]");
  $(window).trigger("teamDataLoaded");
}

function loadAvailableTeamsData() {
  fetch('/teams.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      availableTeamsData = data;
      $(window).trigger("availableTeamsDataLoaded");
    })
    .catch(error => {
      console.error('Error loading the JSON file:', error);
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
  subjectData = undefined;
  timetableData = undefined;
  homeworkData = undefined;
  homeworkCheckedData = undefined;
  substitutionsData = undefined;
  teamData = undefined;
  availableTeamsData = undefined;
  loadSubjectData();
  loadTimetableData();
  loadHomeworkData();
  loadHomeworkCheckedData();
  loadSubstitutionsData();
  loadTeamData();
  loadAvailableTeamsData();
  await dataLoaded(subjectData, "subjectDataLoaded");
  await dataLoaded(timetableData, "timetableDataLoaded");
  await dataLoaded(homeworkData, "homeworkDataLoaded");
  await dataLoaded(homeworkCheckedData, "homeworkCheckedDataLoaded");
  await dataLoaded(substitutionsData, "substitutionsDataLoaded");
  await dataLoaded(teamData, "teamDataLoaded");
  await dataLoaded(availableTeamsData, "availableTeamsDataLoaded");

  updateAll()

  document.body.style.display = "block";
}

function updateAll() {
  updateAllFunctions.forEach(fn => fn())
}

let updateAllFunctions = []

let subjectData;
let timetableData;
let homeworkData;
let homeworkCheckedData;
let substitutionsData;
let teamData;
let availableTeamsData;


$(document).ready(() => {
  reloadAll();
})

$(window).on("userDataLoaded", () => {
  let isFirstEvent = true; // If it's the first event (On opening the site), do not reload (It already happens)
  user.on("login", () => {
    if (isFirstEvent) {
      isFirstEvent = false;
      return;
    }
    reloadAll();
    isFirstEvent = false;
  });

  user.on("logout", () => {
    if (isFirstEvent) {
      isFirstEvent = false;
      return;
    }
    reloadAll();
    isFirstEvent = false;
  });
});
