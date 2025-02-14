function getNewCalendarWeekContent() {
  if (typeof isSameDay != "function") {
    return;
  }
  // Get the list of all dates in this week
  getWeekDates()

  // Prepare the variable
  newCalendarWeekContent = ""
  for (let i = 0; i < 7; i++) {
    // Get the String for the weekday
    let weekday = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][i]

    // Any special classes of the day
    let specialClasses = ""
    // If the day is today, add the days-overview-today class
    if (isSameDay(weekDates[i], new Date())) {
      specialClasses = "days-overview-today "
    }
    // If the day is selected, add the days-overview-selected class
    if (weekDates[i].getDay() == selectedDay) {
      specialClasses += "days-overview-selected "
    }
    if ([0, 6].includes(weekDates[i].getDay())) {
      specialClasses += "text-body-tertiary "
    }

    // Append the days (All days will be added into and .calendar-week element)
    newCalendarWeekContent += `
    <div class="days-overview-day ${specialClasses}btn-semivisible" data-day="${(i == 6) ? 0 : i + 1}">
      <div>${weekday}</div><div>${weekDates[i].getDate()}</div></div>
    </div>`
  }
}

function getWeekDates() {
  // weekDates will be a list of all the dates in the currently selected week
  weekDates = []

  // today is the Date Object of today
  let today = new Date();

  // calendarWeekOffset saves how often the user has clicked left / right
  today.setDate(today.getDate() + 7 * calendarWeekOffset)

  // weekday is the current day (i.e. 0 for sunday, 1 for monday, 2 for tuesday, ...)
  let weekDay = today.getDay()
  weekDay = (weekDay == 0) ? 7 : weekDay;

  // monday is the Date Object of the monday in the currently selected week
  let monday = new Date(today)
  monday.setDate(today.getDate() - weekDay + 1)

  for (let i = 0; i < 7; i++) {
    // dayDate is the Date Object of the days in the currently selected week
    let dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i)

    // Save everything in weekDates
    weekDates.push(dayDate)
  }
}

function getCheckStatusServer(homeworkId) {
  for (let homework of homeworkCheckedData) {
    if (homework.homeworkId == homeworkId) {
      return homework.checked;
    }
  }
  return false;
}

function getCheckStatusLocal(homeworkId) {
  return homeworkCheckedData[homeworkId];
}

function checkHomework(homeworkId) {
  // Save whether the user has checked or unchecked the homework
  let checkStatus = $(`.homework-check[data-id="${homeworkId}"]`).prop("checked");

  // Check whether the user is logged in
  if (user.loggedIn) {
    // The user is logged in

    // Prepare the POST request
    let url = "/homework/check";
    let data = {
      homeworkId: homeworkId,
      checkStatus: checkStatus
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.post(url, data, function (result) {
      // The server has responded
      hasResponded = true;
      if (result == "0") { // Everything worked
        // The user doesn't need any notification here
      }
      else if (result == "1") { // An internal server error occurred
        // Show an error notification
        $navbarToasts.serverError.toast("show");
      }
      else if (result == "2") { // The user has to be logged in but isn't
        // Show an error notification
        $navbarToasts.notLoggedIn.toast("show");
      }
    });
    setTimeout(() => {
      // Wait for 1s
      if (!hasResponded) {
        // If the server hasn't answered, show the internal server error notification
        $navbarToasts.serverError.toast("show");
      }
    }, 1000);
  }
  else {
    // The user is not logged in

    // Get the already saved data
    let data = localStorage.getItem("homeworkCheckedData");

    if (data == null) {
      data = {}
    }
    else {
      data = JSON.parse(data)
    }

    data[homeworkId] = checkStatus;

    data = JSON.stringify(data);

    localStorage.setItem("homeworkCheckedData", data);
  }
}

function updateAll() {
  updateHomeworkList();
  updateSubstitutionList();
  updateTimetable();
}

async function updateHomeworkList() {
  // Get the server side homework data
  await $.get('/homework/get_homework_data', (data) => {
    homeworkData = data;
  });
  
  if (user.loggedIn) {
    // If the user is logged in, get the data from the server
    await $.get('/homework/get_homework_checked_data', (data) => {
      homeworkCheckedData = data;
    });
  }
  else {
    // If the user is not logged in, get the data from the local storage
    homeworkCheckedData = JSON.parse(localStorage.getItem("homeworkCheckedData"))
    if (homeworkCheckedData == null) {
      homeworkCheckedData = {};
    }
  }
  // Note: homeworkCheckedData will have a different structure
  // Server: [{checkId: int, username: String, homeworkId: int, checked: boolean}, ...]
  // Local: {homeworkId: checked, ...}

  // Clear the list
  $("#homework-list").empty();

  let filterMode = $("#filter-homework-mode").val()

  homeworkData.forEach(homework => {
    // Get the information for the homework
    let homeworkId = homework.homeworkId;
    let subject = subjectData[homework.subjectId].name.long;
    let content = homework.content;
    let assignmentDate = new Date(Number(homework.assignmentDate));
    let submissionDate = new Date(Number(homework.submissionDate));
    let selectedDate = weekDates[(selectedDay == 0) ? 6 : selectedDay - 1]

    let checked;
    if (user.loggedIn) {
      // If the user is logged in, get the check status using the server data
      checked = getCheckStatusServer(homeworkId);
    }
    else {
      // If the user is not logged in, get the check status using the local data
      checked = getCheckStatusLocal(homeworkId);
    }

    if (filterMode == "assignment") {
      if (! isSameDay(selectedDate, assignmentDate)) {
        return
      }
    }

    if (filterMode == "submission") {
      if (! isSameDay(selectedDate, submissionDate)) {
        return
      }
    }

    // The template for a homework with checkbox and edit options
    let template = 
      `<div class="mb-1 form-check d-flex">
        <label class="form-check-label">
          <input type="checkbox" class="form-check-input homework-check" data-id="${homeworkId}" ${(checked) ? "checked" : ""}>
          <b>${subject}</b> ${content}
        </label>
      </div>`;

    // Add this homework to the list
    $("#homework-list").append(template);
  });

  // If no homeworks match, add an explanation text
  if ($("#homework-list").html() == "") {
    $("#homework-list").html(`<div class="text-secondary">Keine Hausaufgaben ${(filterMode == "assignment") ? "von diesem" : "auf diesen"} Tag.</div>`)
  }
}

async function updateSubstitutionList() {
  await $.get('/substitutions/get_substitutions_data', (data) => {
    substitutionsData = data;
  });

  $("#substitutions-updated").html(substitutionsData.updated)
  let updatedDate = new Date(dateToMs(substitutionsData.updated.split(" ")[0]))
  let updatedWeekDay = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][updatedDate.getDay()]
  $("#substitutions-updated").html(updatedWeekDay + ", " + substitutionsData.updated.split(" ")[1])

  let planId;

  if (isSameDay(weekDates[(selectedDay == 0) ? 6 : selectedDay - 1], new Date(dateToMs(substitutionsData["plan1"]["date"])))) {
    planId = 1
  }
  else if (isSameDay(weekDates[(selectedDay == 0) ? 6 : selectedDay - 1], new Date(dateToMs(substitutionsData["plan2"]["date"])))) {
    planId = 2
  }
  else {
    $("#substitutions-table").addClass("d-none")
    $("#substitutions-no-entry").addClass("d-none")
    $("#substitutions-no-data").removeClass("d-none")
    return;
  }
  
  if (substitutionsData["plan" + planId]["substitutions"].length == 0) {
    $("#substitutions-table").addClass("d-none")
    $("#substitutions-no-entry").removeClass("d-none")
    $("#substitutions-no-data").addClass("d-none")
    return;
  }

  $("#substitutions-list").empty()

  for (let substitution of substitutionsData["plan" + planId]["substitutions"]) {
    let template = `
      <tr>
        <td>${substitution.type}</td>
        <td>${substitution.lesson}</td>
        <td>${substitution.subject}</td>
        <td>${substitution.text}</td>
        <td>${substitution.teacher}&nbsp;(${substitution.teacherOld})</td>
        <td>${substitution.room}</td>
      </tr>`
      $("#substitutions-list").append(template);
  }

  $("tr:last td").addClass("border-bottom-0")

  $("td").each(function () {
    if ($(this).html() == "-") {
      $(this).addClass("text-center align-middle")
    }
  })

  $("#substitutions-table").removeClass("d-none")
  $("#substitutions-no-entry").addClass("d-none")
  $("#substitutions-no-data").addClass("d-none")
}

function updateTimetable() {
  // If the data hasn't loaded yet, stop
  if (timetableData == undefined || subjectData == undefined || teamData == undefined) {
    return
  }
  
  $("#timetable-less").empty();
  $("#timetable-more").empty();

  if (selectedDay - 1 < 0 || selectedDay - 1 > 4) {
    $("#timetable-less").addClass("d-none");
    $("#timetable-more").addClass("d-none");
    $("#timetable-mode-wrapper").addClass("d-none");
    return;
  }

  $("#timetable-less").removeClass("d-none");
  $("#timetable-more").removeClass("d-none");
  $("#timetable-mode-wrapper").removeClass("d-none");
  updateTimetableMode();

  for (let lesson of timetableData[selectedDay - 1]) {
    let startTime = lesson.start;
    let endTime = lesson.end;
    let subjectsShort = [];
    let subjectsLong = [];
    let teachers = [];
    let rooms = [];

    if (lesson.lessonType == "teamed") {
      let foundLesson = false;
      for (let team of lesson.teams) {
        if (team.subjectId == -1) {
          continue;
        }
        if (! teamData.includes(Number(team.teamId))) {
          continue;
        }

        subjectsShort.push(subjectData[team.subjectId].name.short)
        subjectsLong.push(subjectData[team.subjectId].name.long)
        rooms.push(team.room)

        let teacher = subjectData[team.subjectId].teacher
        teachers.push(((teacher.gender == "m") ? "Herr " : "Frau ") + teacher.long)
        foundLesson = true;
      }
      if (! foundLesson) {
        for (let team of lesson.teams) {
          if (team.subjectId == -1) {
            subjectsShort.push("-")
            subjectsLong.push("Nichts")
            rooms.push("-")
            teachers.push("-")
            continue;
          }
  
          subjectsShort.push(subjectData[team.subjectId].name.short)
          subjectsLong.push(subjectData[team.subjectId].name.long)
          rooms.push(team.room)
  
          let teacher = subjectData[team.subjectId].teacher
          teachers.push(((teacher.gender == "m") ? "Herr " : "Frau ") + teacher.long)
        }
      }
    }
    else if (lesson.lessonType == "rotating") {
      for (let variant of lesson.variants) {
        if (variant.subjectId == -1) {
          continue;
        }

        subjectsShort.push(subjectData[variant.subjectId].name.short)
        subjectsLong.push(subjectData[variant.subjectId].name.long)
        rooms.push(variant.room)

        let teacher = subjectData[variant.subjectId].teacher
        teachers.push(((teacher.gender == "m") ? "Herr " : "Frau ") + teacher.long)
      }
    }
    else {
      subjectsShort.push(subjectData[lesson.subjectId].name.short)
      subjectsLong.push(subjectData[lesson.subjectId].name.long)
      rooms.push(lesson.room)

      let teacher = subjectData[lesson.subjectId].teacher
      teachers.push(((teacher.gender == "m") ? "Herr " : "Frau ") + teacher.long)
    }

    if ([subjectsShort.length, subjectsLong.length, teachers.length, rooms.length].includes(0)) {
      continue;
    }

    let templateModeLess = `
      <div class="card ${(lesson.timingType == "double") ? "wide" : ""}">
        <div class="card-body d-flex align-items-center justify-content-center">
          ${subjectsShort.join(" / ")}
        </div>
      </div>`;
    $("#timetable-less").append(templateModeLess);

    let templateModeMore = `
      <div class="card ${(lesson.timingType == "double") ? "wide" : ""}">
        <div class="card-body pt-4">
          <div class="position-absolute start-0 top-0 mx-2 my-1">${startTime}</div>
          <div class="position-absolute end-0 top-0 mx-2 my-1">${endTime}</div>
          <div class="d-flex align-items-center justify-content-center flex-column">
            <span class="fw-semibold text-center">${subjectsLong.join(" / ")}</span>
            <span class="text-center">${rooms.join(" / ")}, ${teachers.join(" / ")}</span>
            <!--<span class="text-center event-orange fw-bold mt-2">Irgendwelche extra infos</span>-->
          </div>
        </div>
      </div>`;
    $("#timetable-more").append(templateModeMore);
  }
}

function updateTimetableMode() {
  if ($("#timetable-mode-less")[0].checked) {
    $("#timetable-less").removeClass("d-none");
    $("#timetable-more").addClass("d-none");
    localStorage.setItem("timetableMode", "less");
  }
  else if ($("#timetable-mode-more")[0].checked) {
    $("#timetable-less").addClass("d-none");
    $("#timetable-more").removeClass("d-none");
    localStorage.setItem("timetableMode", "more");
  }
  else {
    $("#timetable-less").addClass("d-none");
    $("#timetable-more").addClass("d-none");
    localStorage.setItem("timetableMode", "none");
  }
}

$(".calendar-week-move-button").on("click", function () {
  // If the calendar is already moving, stop; else set it moving
  if (calendarWeekMoving) {return};
  calendarWeekMoving = true;

  // Save whether the user clicked left or right
  // Change calendarWeekOffset
  let direction
  if ($(this).attr("id") == "calendar-week-r-btn") {
    direction = "r";
    calendarWeekOffset++
  }
  else {
    direction = "l"
    calendarWeekOffset--
  }
  
  // Get the new content
  getNewCalendarWeekContent();

  // Append it to the new calendar
  $("#calendar-week-new").html(newCalendarWeekContent);

  // Position the calendar left / right of the visible spot
  $(".calendar-week").css("transition", "")
  $("#calendar-week-new").css("transform", `translateX(${(direction == "r") ? "100%" : "-100%"})`)
  $("#calendar-week-new").removeClass("d-none").addClass("d-flex")

  // Wait shortly, so the styles can apply
  setTimeout(() => {
    // Slide the old calendar out and the new one in
    $(".calendar-week").css("transition", "transform 0.75s ease")
    $("#calendar-week-old").css("transform", `translateX(${(direction == "r") ? "-100%" : "100%"})`)
    $("#calendar-week-new").css("transform", "translateX(0%)")

    $("#calendar-month-year").html(`${monthNames[weekDates[3].getMonth()]} ${weekDates[3].getFullYear()}`)

    // Wait until the calendars finished sliding
    setTimeout(() => {
      // Save the new html in the old calendar
      $("#calendar-week-old").html($("#calendar-week-new").html());

      // Position the old calendar in the visible spot, hide the new calendar
      $(".calendar-week").css("transition", "")
      $("#calendar-week-old").css("transform", "")
      $("#calendar-week-new").removeClass("d-flex").addClass("d-none")

      // The calendar isn't moving anymore
      calendarWeekMoving = false;
    }, 750)
  }, 20)
  updateAll();
});

$(".calendar-month-year-move-button").on("click", function () {
  function animateWeek(weekId) {
    if (direction == "r") {
      calendarWeekOffset++
    }
    else {
      calendarWeekOffset--
    }

    // Get the new content
    getNewCalendarWeekContent();

    // Append it to the new calendar
    $("#calendar-week-new").html(newCalendarWeekContent);

    // Position the calendar left / right of the visible spot
    $(".calendar-week").css("transition", "")
    $("#calendar-week-new").css("transform", `translateX(${(direction == "r") ? "100%" : "-100%"})`)
    $("#calendar-week-new").removeClass("d-none").addClass("d-flex")

    // Wait shortly, so the styles can apply
    setTimeout(() => {
      // Slide the old calendar out and the new one in
      $(".calendar-week").css("transition", "transform 0.19s linear")
      $("#calendar-week-old").css("transform", `translateX(${(direction == "r") ? "-100%" : "100%"})`)
      $("#calendar-week-new").css("transform", "translateX(0%)")

      $("#calendar-month-year").html(`${monthNames[weekDates[3].getMonth()]} ${weekDates[3].getFullYear()}`)

      // Wait until the calendars finished sliding
      setTimeout(() => {
        // Save the new html in the old calendar
        $("#calendar-week-old").html($("#calendar-week-new").html());

        // Position the old calendar in the visible spot, hide the new calendar
        $(".calendar-week").css("transition", "")
        $("#calendar-week-old").css("transform", "")
        $("#calendar-week-new").removeClass("d-flex").addClass("d-none")

        // The calendar isn't moving anymore
        calendarWeekMoving = false;
    
        if (weekId != 3) {
          animateWeek(weekId + 1)
        }
      }, 190)
    }, 20)
    updateHomeworkList();
  }
  // If the calendar is already moving, stop; else set it moving
  if (calendarWeekMoving) {return};
  calendarWeekMoving = true;

  // Save whether the user clicked left or right
  // Change calendarWeekOffset
  let direction
  if ($(this).attr("id") == "calendar-month-year-r-btn") {
    direction = "r";
  }
  else {
    direction = "l"
  }

  animateWeek(0);
    
});

$(document).on("click", ".days-overview-day", function () {
  selectedDay = $(this).data("day")
  getNewCalendarWeekContent();
  $("#calendar-week-old").html(newCalendarWeekContent);
  updateAll();
})

// The currently selected day of the week (i.e. 0 for monday, 1 for tuesday, ...); initially today
let selectedDay = new Date().getDay();

// Changes when the user clicks left / right
let calendarWeekOffset = 0;

// Saves what content should be shown next
let newCalendarWeekContent = ""

// Save whether the calendar is currently moving (It shouldn't be moved then, as bugs could appear)
let calendarWeekMoving = false;

// Is a list of the dates (number of day in the month) of the week which is currently selected
let weekDates = [];

// Set the visible content of the calendar to today's week
getNewCalendarWeekContent();
$("#calendar-week-old").html(newCalendarWeekContent);

let monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
$("#calendar-month-year").html(`${monthNames[weekDates[3].getMonth()]} ${weekDates[3].getFullYear()}`)


// The homework stuff
let subjectData;
let timetableData;
let homeworkData;
let homeworkCheckedData;
let substitutionsData;

$(document).ready(() => {

  // Get subject data
  fetch('/subjects.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    subjectData = data;
    updateAll();
  })
  .catch(error => {
    console.error('Error loading the JSON file:', error);
  });
  
  // Get timetable data
  fetch('/timetable.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      timetableData = data;
      updateTimetable();
    })
    .catch(error => {
      console.error('Error loading the JSON file:', error);
    });

  window.addEventListener("userVariableDefined", () => {
    // If user logs in / out update everything
    user.on("login", () => {
      updateAll();
    });

    user.on("logout", () => {
      updateAll();
    });
  });
});

// Update everything on clicking the reload button
$(document).on("click", "#navbar-reload-button", () => {
  updateAll();
});

// Request checking the homework on clicking its checkbox
$(document).on('click', '.homework-check', function () {
  const homeworkId = $(this).data('id');
  checkHomework(homeworkId);
});

// On changing the filter mode, update the homework list
$("#filter-homework-mode").on("input", () => {
  updateHomeworkList();
});

$("#timetable-mode input").each(() => {
  $(this).on("click", () => {
    updateTimetableMode();
  });
  $(this).prop("checked", false);
});

$("#timetable-mode-" + (localStorage.getItem("timetableMode") || "less")).prop("checked", true);

if (localStorage.getItem("showTeamSelectionInfo") == undefined) {
  localStorage.setItem("showTeamSelectionInfo", "true")
}

if (localStorage.getItem("showTeamSelectionInfo") == "true") {
  $("#team-selection-info").addClass("d-flex").removeClass("d-none")
}

$("#team-selection-info-later").on("click", () => {
  localStorage.setItem("showTeamSelectionInfo", "false")
  $("#team-selection-info").removeClass("d-flex").addClass("d-none")
})
