function getNewCalendarWeekContent() {
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
  let weekday = today.getDay()

  // monday is the Date Object of the monday in the currently selected week
  let monday = new Date(today)
  monday.setDate(today.getDate() - weekday + 1)

  for (let i = 0; i < 7; i++) {
    // dayDate is the Date Object of the days in the currently selected week
    let dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i)

    // Save everything in weekDates
    weekDates.push(dayDate)
  }
}

function getSubjectName(id) {
  for (let subject of subjectData) {
    if (subject.id == id) {
      return subject.name;
    }
  }
}

function getCheckStateServer(homeworkId) {
  for (let homework of homeworkCheckedData) {
    if (homework.homeworkId == homeworkId) {
      return homework.checked;
    }
  }
  return false;
}

function getCheckStateLocal(homeworkId) {
  return homeworkCheckedData[homeworkId];
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
    let subject = getSubjectName(homework.subjectId);
    let content = homework.content;
    let assignmentDate = new Date(Number(homework.assignmentDate));
    let submissionDate = new Date(Number(homework.submissionDate));
    let selectedDate = weekDates[(selectedDay == 0) ? 6 : selectedDay - 1]

    let checked;
    if (user.loggedIn) {
      // If the user is logged in, get the check state using the server data
      checked = getCheckStateServer(homeworkId);
    }
    else {
      // If the user is not logged in, get the check state using the local data
      checked = getCheckStateLocal(homeworkId);
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
    $("#homework-list").html(`<div class="text-secondary">Keine Hausaufgaben ${(filterMode == "assignment") ? "von" : "auf"} diesen Tag gefunden!</div>`)
  }
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
  updateHomeworkList();
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
  updateHomeworkList();
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
let subjectData = [];
let homeworkData = [];
let homeworkCheckedData = [];

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
      updateHomeworkList();
    })
    .catch(error => {
      console.error('Error loading the JSON file:', error);
    });

  window.addEventListener("userVariableDefined", () => {
    // If user logs in / out update everything
    user.on("login", () => {
      updateHomeworkList();
    });

    user.on("logout", () => {
      updateHomeworkList();
    });
  });
});

// Update everything on clicking the reload button
$(document).on("click", "#navbar-reload-button", () => {
  updateHomeworkList();
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
