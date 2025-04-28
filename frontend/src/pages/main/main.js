function getCalendarDayHtml(date, week, multiEventPositions) {
  // Any special classes of the day
  let specialClasses = ""
  // If the day is today, add the days-overview-today class
  if (isSameDay(date, new Date())) {
    specialClasses = "days-overview-today fw-bold "
  }
  // If the day is selected, add the days-overview-selected class
  if (isSameDay(date, selectedDate)) {
    specialClasses += "days-overview-selected "
  }
  if ([0, 6].includes(date.getDay())) {
    specialClasses += "text-body-tertiary "
  }
  if (calendarMode == "month" && date.getMonth() != selectedDate.getMonth()) {
    specialClasses += "days-overview-other-month "
  }

  // Single day events
  let singleDayEvents = ""
  let multiDayEventsA = []

  for (let event of eventData) {
    if (! joinedTeamsData.includes(event.teamId) && event.teamId != -1) {
      continue;
    }

    if (event.endDate == null) {
      if (isSameDay(new Date(parseInt(event.startDate)), date)) {
        singleDayEvents += `<div class="col"><div class="event event-${event.eventTypeId}"></div></div>`
      }
    }
    else if (event.endDate != null) {
      if (! multiEventPositions.includes(event.eventId)) {
        if (multiEventPositions.indexOf(null) == -1) {
          multiEventPositions.push(event.eventId)
        }
        else {
          multiEventPositions.splice(multiEventPositions.indexOf(null), 1, event.eventId)
        }
      }
      if (isSameDay(new Date(parseInt(event.startDate)), date)) {
        if (isSameDay(new Date(parseInt(event.endDate)), date)) {
          multiDayEventsA[multiEventPositions.indexOf(event.eventId)] = `<div class="event event-single event-${event.eventTypeId}"></div>`
        }
        else {
          multiDayEventsA[multiEventPositions.indexOf(event.eventId)] = `<div class="event event-start event-${event.eventTypeId}"></div>`
        }
      }
      else if (isSameDay(new Date(parseInt(event.endDate)), date)) {
        multiDayEventsA[multiEventPositions.indexOf(event.eventId)] = `<div class="event event-end event-${event.eventTypeId}"></div>`
      }
      else if (parseInt(event.startDate) < date.getTime() && parseInt(event.endDate) > date.getTime()) {
        multiDayEventsA[multiEventPositions.indexOf(event.eventId)] = `<div class="event event-middle event-${event.eventTypeId}"></div>`
      }
      else if (multiEventPositions.indexOf(event.eventId) == multiEventPositions.length - 1) {
        multiEventPositions.pop()
      }
      else {
        multiEventPositions[multiEventPositions.indexOf(event.eventId)] = null
      }
    }
  }

  // Multi day events
  let multiDayEvents = ""

  for (let event of multiDayEventsA) {
    if (! event) {
      multiDayEvents += `<div class="event"></div>`
    }
    else {
      multiDayEvents += event
    }
  }
  
  let weekday = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()]

  // Append the days (All days will be added into and .calendar-week element)
  return `
  <div class="days-overview-day ${specialClasses}btn btn-semivisible" data-week="${week}" data-day="${date.getDay()}">
    <span class="weekday">${(calendarMode == "week") ? weekday: ""}</span>
    <span class="date">${date.getDate()}</span>
    <div class="events ${calendarMode}">
      <div class="multi-events">
        ${multiDayEvents}
      </div>
      <div class="single-events row row-cols-3">
        ${singleDayEvents}
      </div>
    </div>
  </div>`
}

async function getNewCalendarWeekContent() {
  // Get the list of all dates in this week
  monthDates = undefined;
  loadMonthDates(selectedDate)
  await dataLoaded("monthDates")

  await dataLoaded("eventData")

  await dataLoaded("joinedTeamsData")

  // Save the vertical positions of the multi events (in case two events intersect)
  let multiEventPositions = []

  let newCalendarWeekContent = ""

  if (calendarMode == "week") {
    newCalendarWeekContent += `<div class="d-flex position-relative">`
      let weekDates = monthDates[selectedWeek]
    for (let i = 0; i < 7; i++) {
      newCalendarWeekContent += getCalendarDayHtml(weekDates[i], selectedWeek, multiEventPositions)
    }
    newCalendarWeekContent += "</div>"
    return newCalendarWeekContent
  }
  else {
    newCalendarWeekContent += `<div class="d-flex weekdays">`
    let weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    newCalendarWeekContent += weekdays.map((e) => {return `<div>${e}</div>`}).join("")
    newCalendarWeekContent += "</div>"
    for (let week in monthDates) {
      let weekDates = monthDates[week]
      newCalendarWeekContent += `<div class="d-flex position-relative mb-4">`
      for (let i = 0; i < 7; i++) {
        newCalendarWeekContent += getCalendarDayHtml(weekDates[i], week, multiEventPositions)
      }
      newCalendarWeekContent += "</div>"
    }
    return newCalendarWeekContent
  }
}

async function updateCalendarWeekContent(targetCalendar) {
  let content = await getNewCalendarWeekContent();
  $(targetCalendar).html(content);
}

function loadMonthDates(selectedDate) {
  // monthDates will be a list of all the dates in the currently selected week
  monthDates = []

  let firstDate = new Date(selectedDate)
  firstDate.setDate(1)

  let firstDateDay = firstDate.getDay()
  firstDateDay = (firstDateDay == 0) ? 7 : firstDateDay;

  let firstMonday = new Date(firstDate)
  firstMonday.setDate(firstMonday.getDate() - firstDateDay + 1)

  let iteratorDate = new Date(firstMonday)
  let weekId = 0
  let firstWeek = true
  while (firstWeek || iteratorDate.getMonth() == selectedDate.getMonth()) {
    firstWeek = false
    monthDates[weekId] = []
    for (let weekDay = 0; weekDay < 7; weekDay++) {
      monthDates[weekId].push(new Date(iteratorDate))
      if (isSameDay(iteratorDate, selectedDate)) selectedWeek = weekId
      iteratorDate.setDate(iteratorDate.getDate() + 1)
    }
    weekId++
  }

  $(window).trigger("monthDatesLoaded")
}

function checkHomework(homeworkId) {
  // Save whether the user has checked or unchecked the homework
  let checkStatus = $(`.homework-check[data-id="${homeworkId}"]`).prop("checked");

  // Check whether the user is logged in
  if (user.loggedIn) {
    // The user is logged in

    let data = {
      homeworkId: homeworkId,
      checkStatus: checkStatus
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url : "/homework/check",
      type: "POST",
      data: data,
      error: (xhr) => {
        if (xhr.status === 401) { // The user has to be logged in but isn't
          // Show an error notification
          $navbarToasts.notLoggedIn.toast("show");
        }
        else if (xhr.status === 500) { // An internal server error occurred
          $navbarToasts.serverError.toast("show");
        }
        else {
          $navbarToasts.unknownError.toast("show");
        }
      },
      complete: () => {
        // The server has responded
        hasResponded = true;
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
    let dataString = localStorage.getItem("homeworkCheckedData");
    let data = []

    if (dataString != null) {
      data = JSON.parse(dataString)
    }

    if (checkStatus) {
      data.push(homeworkId)
    }
    else {
      data.splice(data.indexOf(homeworkId), 1)
    }

    dataString = JSON.stringify(data);

    localStorage.setItem("homeworkCheckedData", dataString);
  }
}

async function updateHomeworkList() {
  // Wait until the data is loaded
  await dataLoaded("subjectData")
  await dataLoaded("homeworkData")
  await dataLoaded("homeworkCheckedData")
  await dataLoaded("joinedTeamsData")
  await dataLoaded("monthDates")

  // Note: homeworkCheckedData will have a different structure
  // Server: [{checkId: int, username: String, homeworkId: int, checked: boolean}, ...]
  // Local: {homeworkId: checked, ...}

  // Clear the list
  $("#homework-list").empty();

 for (let homework of homeworkData) {
    // Get the information for the homework
    let homeworkId = homework.homeworkId;
    let subject = subjectData[homework.subjectId].subjectNameLong;
    let content = homework.content;
    let assignmentDate = new Date(Number(homework.assignmentDate));
    let submissionDate = new Date(Number(homework.submissionDate));

    let checked = await getHomeworkCheckStatus(homeworkId);

    if ($("#homework-mode-tomorrow")[0].checked) {
      let tomorrow = new Date(selectedDate);
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (! isSameDay(tomorrow, submissionDate)) {
        continue
      }
    }

    if ($("#homework-mode-assignment")[0].checked) {
      if (! isSameDay(selectedDate, assignmentDate)) {
        continue
      }
    }

    if ($("#homework-mode-submission")[0].checked) {
      if (! isSameDay(selectedDate, submissionDate)) {
        continue
      }
    }

    // Filter by team
    if (! joinedTeamsData.includes(homework.teamId) && homework.teamId != -1) {
      continue;
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
  };

  // If no homeworks match, add an explanation text
  if ($("#homework-list").html() == "") {
    let text
    if ($("#homework-mode-tomorrow")[0].checked) {
      text = "auf den nächsten"
    }
    else if ($("#homework-mode-submission")[0].checked) {
      text = "auf diesen"
    }
    else if ($("#homework-mode-assignment")[0].checked) {
      text = "von diesem"
    }
    $("#homework-list").html(`<div class="text-secondary">Keine Hausaufgaben ${text} Tag.</div>`)
  }
}
updateHomeworkList = runOnce(updateHomeworkList);

function updateHomeworkMode() {
  if ($("#homework-mode-tomorrow")[0].checked) {
    localStorage.setItem("homeworkMode", "tomorrow");
  }
  else if ($("#homework-mode-assignment")[0].checked) {
    localStorage.setItem("homeworkMode", "assignment");
  }
  else {
    localStorage.setItem("homeworkMode", "submission");
  }

  updateHomeworkList();
}

async function updateEventList() {
  await dataLoaded("eventData")
  await dataLoaded("eventTypeData")
  await dataLoaded("joinedTeamsData")

  // Clear the list
  $("#event-list").empty();

  for (let event of eventData) {
    if (! joinedTeamsData.includes(event.teamId) && event.teamId != -1) {
      continue;
    }

    // Get the information for the event
    let eventTypeId = event.eventTypeId;
    let name = event.name;
    let description = event.description;
    let startDate = msToDisplayDate(event.startDate).split(".").slice(0, 2).join(".");
    let lesson = event.lesson;
    let endDate;
    if (event.endDate) {
      endDate = msToDisplayDate(event.endDate).split(".").slice(0, 2).join(".");
    }
    else {
      endDate = null;
    }
    let msStartDate = parseInt(event.startDate)
    let msEndDate = parseInt(event.endDate || event.startDate)

    // Filter by start date
    if (selectedDate.getTime() < msStartDate && ! isSameDay(selectedDate, new Date(msStartDate))) {
      continue;
    }

    // Filter by end date
    if (selectedDate.getTime() > msEndDate && ! isSameDay(selectedDate, new Date(msEndDate))) {
      continue;
    }

    // The template for an event
    let template = 
      `<div class="col p-2">
        <div class="card event-${eventTypeId} h-100">
          <div class="card-body p-2 d-flex">
            <div class="d-flex flex-column">
              <span class="fw-bold event-${eventTypeId}">${name}</span>
              <b>${startDate}${(endDate) ? ` - ${endDate}` : ""}${(lesson) ? ` (${lesson}. Stunde)` : ""}</b>
              <span>${description}</span>
            </div>
          </div>
        </div>
      </div>`;

    // Add this event to the list
    $("#event-list").append(template);
  };

  // If no events match, add an explanation text
  if ($("#event-list").html() == "") {
    $("#event-list").html(`<div class="text-secondary">Keine Ereignisse heute.</div>`)
  }
}
updateEventList = runOnce(updateEventList);

async function updateSubstitutionList() {
  await dataLoaded("substitutionsData")
  
  if (JSON.stringify(substitutionsData) == "{}") {
    $("#substitutions-table").addClass("d-none")
    $("#substitutions-no-entry").addClass("d-none")
    $("#substitutions-no-data").removeClass("d-none")
    $("#substitutions-mode-wrapper").addClass("d-none");
    return;
  }
  let substitutionsMode = localStorage.getItem("substitutionsMode") || "class";

  let data;

  if (substitutionsMode == "class") {
    await dataLoaded("classSubstitutionsData");
    data = classSubstitutionsData;
  }
  else {
    await dataLoaded("substitutionsData");
    data = substitutionsData;
  }

  let updatedDate = new Date(dateToMs(data.updated.split(" ")[0]))
  let updatedWeekDay = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][updatedDate.getDay()]
  $("#substitutions-updated").html(updatedWeekDay + ", " + data.updated.split(" ")[1])

  if (substitutionsMode == "none") {
    $("#substitutions-table").addClass("d-none");
    return;
  }

  let planId;

  if (isSameDay(selectedDate, new Date(dateToMs(data["plan1"]["date"])))) {
    planId = 1
  }
  else if (isSameDay(selectedDate, new Date(dateToMs(data["plan2"]["date"])))) {
    planId = 2
  }
  else {
    $("#substitutions-table").addClass("d-none")
    $("#substitutions-no-entry").addClass("d-none")
    $("#substitutions-no-data").removeClass("d-none")
    $("#substitutions-mode-wrapper").addClass("d-none");
    return;
  }
  
  if (data["plan" + planId]["substitutions"].length == 0) {
    $("#substitutions-table").addClass("d-none")
    $("#substitutions-no-entry").removeClass("d-none")
    $("#substitutions-no-data").addClass("d-none")
    $("#substitutions-mode-wrapper").removeClass("d-none");
    return;
  }

  $("#substitutions-list").empty()

  if (substitutionsMode == "all") {
    $("#substitutions-table th:first()").removeClass("d-none")
  }
  else {
    $("#substitutions-table th:first()").addClass("d-none")
  }

  for (let substitution of data["plan" + planId]["substitutions"]) {
    let template = `
      <tr>
        ${(substitutionsMode == "all") ? `<td>${substitution.class}</td>` : ""}
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
  $("#substitutions-mode-wrapper").removeClass("d-none");
}
updateSubstitutionList = runOnce(updateSubstitutionList);

function updateSubstitutionsMode() {
  if ($("#substitutions-mode-class")[0].checked) {
    localStorage.setItem("substitutionsMode", "class");
  }
  else if ($("#substitutions-mode-all")[0].checked) {
    localStorage.setItem("substitutionsMode", "all");
  }
  else {
    localStorage.setItem("substitutionsMode", "none");
  }

  updateSubstitutionList();
}

async function updateTimetable() {
  // If the data hasn't loaded yet, wait until it is loaded
  await dataLoaded("timetableData")
  await dataLoaded("subjectData")
  await dataLoaded("joinedTeamsData")
  await dataLoaded("classSubstitutionsData")
  await dataLoaded("eventData")
  
  $("#timetable-less").empty();
  $("#timetable-more").empty();

  if ([0, 6].includes(selectedDate.getDay())) {
    $("#timetable-less").addClass("d-none");
    $("#timetable-more").addClass("d-none");
    $("#timetable-mode-wrapper").addClass("d-none");
    return;
  }

  $("#timetable-less").removeClass("d-none");
  $("#timetable-more").removeClass("d-none");
  $("#timetable-mode-wrapper").removeClass("d-none");
  updateTimetableMode();

  let substitutionPlanId;

  if (isSameDay(selectedDate, new Date(dateToMs(classSubstitutionsData["plan1"]["date"])))) {
    substitutionPlanId = 1;
  }
  else if (isSameDay(selectedDate, new Date(dateToMs(classSubstitutionsData["plan2"]["date"])))) {
    substitutionPlanId = 2;
  }
  else {
    substitutionPlanId = 0;
  }

  for (let [timetableEntryId, timetableEntry] of timetableData[selectedDate.getDay() - 1].entries()) {
    function addLesson(lessonData) {
      let subject = subjectData[lessonData.subjectId]
      let lesson = {};
      lesson.subjectShort = subject.subjectNameShort;
      lesson.subjectLong = subject.subjectNameLong;
      lesson.substitutionSubjectName = subject.subjectNameSubstitution || lesson.subjectLong;
      lesson.room = lessonData.room;
      lesson.teacher = ((subject.teacherGender == "m") ? "Herr " : "Frau ") + subject.teacherNameLong;
      lesson.substitutionTeacherName = subject.teacherNameSubstitution || [ subject.teacherNameShort ];

      lessons.push(lesson);
    }
    let startTime = timetableEntry.start;
    let endTime = timetableEntry.end;
    // This is a list in case the user hasn't selected a team or there are rotating subjects
    let lessons = []

    if (timetableEntry.lessonType == "break") {
      continue;
    }
    else if (timetableEntry.lessonType == "teamed") {
      let foundLesson = false;
      for (let team of timetableEntry.teams) {
        if (! joinedTeamsData.includes(Number(team.teamId))) {
          continue;
        }

        foundLesson = true;

        if (team.subjectId == -1) {
          continue;
        }

        addLesson(team);
      }
      if (! foundLesson) {
        for (let team of timetableEntry.teams) {
          if (team.subjectId == -1) {
            lessons.push({ subjectShort: "-", subjectLong: "-", room: "-", teacher: "-"});
            continue;
          }
  
          addLesson(team);
        }
      }
    }
    else if (timetableEntry.lessonType == "rotating") {
      for (let variant of timetableEntry.variants) {
        if (variant.subjectId == -1) {
          continue;
        }

        addLesson(variant);
      }
    }
    else {
      addLesson(timetableEntry);
    }

    if (lessons.length == 0) {
      continue;
    }

    let templateModeLess = `
      <div class="card">
        <div class="card-body d-flex align-items-center justify-content-center flex-column">
          <span class="text-center timetable-less-subject">
            ${lessons.map((lessonData) => {return `<span class="original">${lessonData.subjectShort}</span>`}).join(" / ")}
          </span>
        </div>
      </div>`;
    
    let thisLessLesson = $(templateModeLess)

    let templateModeMore = `
      <div class="card">
        <div class="card-body pt-4 text-center">
          <div class="timetable-more-time position-absolute start-0 top-0 mx-2 my-1 timetable-more-time-start">${startTime}</div>
          <div class="timetable-more-time position-absolute end-0 top-0 mx-2 my-1 timetable-more-time-end">${endTime}</div>
          <div class="d-flex align-items-center justify-content-center flex-column">
            <span class="fw-semibold text-center timetable-more-subject">
              ${lessons.map((lessonData) => {return `<span class="original">${lessonData.subjectLong}</span>`}).join(" / ")}
            </span>
            <span>
              <span class="text-center timetable-more-room">
              ${lessons.map((lessonData) => {return `<span class="original">${lessonData.room}</span>`}).join(" / ")}
              </span>,
              <span class="text-center timetable-more-teacher">
              ${lessons.map((lessonData) => {return `<span class="original">${lessonData.teacher}</span>`}).join(" / ")}
              </span>
            </span>
          </div>
          <!--<span class="event-orange fw-bold mt-2">Events oder ähnliches</span>-->
        </div>
      </div>`;
    
    let thisMoreLesson = $(templateModeMore)

    if (substitutionPlanId != 0) {
      for (let [lessonId, lesson] of lessons.entries()) {
        function matchesLessonId(substitution, lessonId) {
          if (substitution.lesson.includes("-")) {
            substitution.lesson = substitution.lesson.replace(" ", "")
            let start = substitution.lesson.split("-")[0]
            let end = substitution.lesson.split("-")[1]
            if (start > lessonId + 1 || lessonId + 1 > end) {
              return false;
            }
          }
          else if (Number(substitution.lesson) != lessonId + 1) {
            return false;
          }
          return true;
        }
        function matchesTeacher(substitution, lesson) {
          return lesson.substitutionTeacherName.includes(substitution.teacherOld);
        }

        for (let substitution of classSubstitutionsData["plan" + substitutionPlanId]["substitutions"]) {
          if (! matchesLessonId(substitution, timetableEntryId)) {
            continue;
          }
          if (! matchesTeacher(substitution, lesson)) {
            continue;
          }

          let color = (substitution.type == "Entfall") ? "red" : "yellow"
  
          let substitutionTypeText = `<div class="text-${color} text-center fw-bold mt-2">${substitution.type}</div>`
          thisLessLesson.find(".card-body").append(substitutionTypeText)
          thisMoreLesson.find(".card-body").append(substitutionTypeText)
  
  
          if (substitution.type == "Entfall" && substitution.text == "EVA") {
            substitution.text = "-";
          }
          if (substitution.text != "-") {
            thisMoreLesson.find(".card-body").append(`<div class="text-${color} text-center">${substitution.text}</div>`)
          }
  
          if (substitution.type == "Entfall") {
            // Times
            thisMoreLesson.find(".timetable-more-time").addClass("line-through-" + color)
          }
  
          // Subject
          let lessSubjectElement = thisLessLesson.find(".timetable-less-subject .original").eq(lessonId)
          let moreSubjectElement = thisMoreLesson.find(".timetable-more-subject .original").eq(lessonId)
          if (substitution.subject != lesson.substitutionSubjectName) {
            moreSubjectElement.addClass("line-through-" + color)
            lessSubjectElement.addClass("line-through-" + color)
            if (substitution.subject != "-") {
              moreSubjectElement.after(` <span class="text-${color} fw-bold">${substitution.subject}</span>`)
              lessSubjectElement.after(` <span class="text-${color} fw-bold">${substitution.subject}</span>`)
            }
          }
          else {
            lessSubjectElement.addClass("fst-italic fw-semibold")
            moreSubjectElement.addClass("fst-italic fw-bold")
          }
  
          // Room
          let roomElement = thisMoreLesson.find(".timetable-more-room .original").eq(lessonId)
          if (substitution.room != lesson.room) {
            roomElement.addClass("line-through-" + color)
            if (substitution.room != "-") {
              roomElement.after(` <span class="text-${color} fw-bold">${substitution.room}</span>`)
            }
          }
  
          // Teacher
          let teacherElement = thisMoreLesson.find(".timetable-more-teacher .original").eq(lessonId)
          if (! lesson.substitutionTeacherName.includes(substitution.teacher)) {
            teacherElement.addClass("line-through-" + color)
            if (substitution.teacher != "-") {
              teacherElement.after(` <span class="text-${color} fw-bold">${substitution.teacher}</span>`)
            }
          }
        }
      }
    }

    for (let event of eventData) {
      function matchesLessonId(event, lessonId) {
        if (event.lesson.includes("-")) {
          event.lesson = event.lesson.replace(" ", "")
          let start = event.lesson.split("-")[0]
          let end = event.lesson.split("-")[1]
          if (start > lessonId + 1 || lessonId + 1 > end) {
            return false;
          }
        }
        else if (Number(event.lesson) != lessonId + 1) {
          return false;
        }
        return true;
      }

      if (! joinedTeamsData.includes(event.teamId) && event.teamId != -1) {
        continue;
      }

      if (event.lesson == "") {
        continue;
      }
      if (! isSameDay(new Date(parseInt(event.startDate)), selectedDate)) {
        continue;
      }
      if (! matchesLessonId(event, timetableEntryId)) {
        continue;
      }

      let eventName = `<span class="event-${event.eventTypeId} text-center fw-bold mt-2 d-block">${event.name}</span>`
      thisLessLesson.find(".card-body").append(eventName)
      thisMoreLesson.find(".card-body").append(eventName)

      if (event.description != "") {
        thisMoreLesson.find(".card-body").append(`<span class="event-${event.eventTypeId} text-centerd-block">${event.description}</span>`)
      }
    }

    let lastLessLesson = $("#timetable-less").find(".card:last()")
    if (lastLessLesson.length > 0) {
      let lastLessonHtml = lastLessLesson[0].outerHTML.replace(/\s+/g, "")
      let thisLessonHtml = thisLessLesson[0].outerHTML.replace(/\s+/g, "")
      if (lastLessonHtml == thisLessonHtml) {
        lastLessLesson.addClass("wide")
      }
      else {
        $("#timetable-less").append(thisLessLesson);
      }
    }
    else {
      $("#timetable-less").append(thisLessLesson);
    }

    let lastMoreLesson = $("#timetable-more").find(".card:last()")
    if (lastMoreLesson.length > 0) {
      // Remove the times
      let lastLessonCopy = $(lastMoreLesson[0].outerHTML);
      lastLessonCopy.find(".timetable-more-time").html("");
      let lastLessonHtml = lastLessonCopy[0].outerHTML.replace(/\s+/g, "");

      let thisLessonCopy = $(thisMoreLesson[0].outerHTML);
      thisLessonCopy.find(".timetable-more-time").html("");
      let thisLessonHtml = thisLessonCopy[0].outerHTML.replace(/\s+/g, "");

      if (lastLessonHtml == thisLessonHtml) {
        lastMoreLesson.addClass("wide")
        lastMoreLesson.find(".card-body div:nth-child(2)").html(endTime)
      }
      else {
        $("#timetable-more").append(thisMoreLesson);
      }
    }
    else {
      $("#timetable-more").append(thisMoreLesson);
    }
  }
}
updateTimetable = runOnce(updateTimetable);

function updateTimetableMode() {
  if ([0, 6].includes(selectedDate.getDay())) {
    $("#timetable-less").addClass("d-none");
    $("#timetable-more").addClass("d-none");
  }
  else if ($("#timetable-mode-less")[0].checked) {
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

async function renameCalendarMonthYear() {
  await dataLoaded("monthDates");
  $("#calendar-month-year").html(`${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`)
}

function slideCalendar(direction, transition, slideTime) {
  return new Promise((resolve)=> {
    if (! animations) {
      transition = "";
      slideTime = 0;
    }
  
    // Get the new content and append it to the new calendar
    updateCalendarWeekContent("#calendar-week-new")
  
    // Position the calendar left / right of the visible spot
    $(".calendar-week").css("transition", "")
    $("#calendar-week-new").css("transform", `translateX(${(direction == "r") ? "100%" : "-100%"})`)
    $("#calendar-week-new").removeClass("d-none")
  
    // Wait shortly, so the styles can apply
    setTimeout(() => {
      // Slide the old calendar out and the new one in
      $(".calendar-week").css("transition", transition)
      $("#calendar-week-old").css("transform", `translateX(${(direction == "r") ? "-100%" : "100%"})`)
      $("#calendar-week-new").css("transform", "translateX(0%)")
  
      renameCalendarMonthYear();
  
      // Wait until the calendars finished sliding
      setTimeout(() => {
        // Save the new html in the old calendar
        $("#calendar-week-old").html($("#calendar-week-new").html());
  
        // Position the old calendar in the visible spot, hide the new calendar
        $(".calendar-week").css("transition", "")
        $("#calendar-week-old").css("transform", "")
        $("#calendar-week-new").addClass("d-none")
  
        // The calendar isn't moving anymore
        calendarMoving = false;
        resolve()
      }, slideTime)
    }, 20)
    updateAll();
  })
}

$(function(){
  updateAllFunctions.push(() => {
    updateHomeworkList();
    updateEventList();
    updateSubstitutionList();
    updateTimetable();
  })

  updateAll();
})

let animations = JSON.parse(localStorage.getItem("animations"));
if (animations == undefined) animations = true

$(".calendar-week-move-button").on("click", function () {
  // If the calendar is already moving, stop; else set it moving
  if (calendarMoving) {return};
  calendarMoving = true;

  // Save whether the user clicked left or right
  let direction
  if ($(this).attr("id") == "calendar-week-r-btn") {
    direction = "r";
  }
  else {
    direction = "l"
  }

  if (calendarMode == "week") {
    if (direction == "r") selectedDate.setDate(selectedDate.getDate() + 7)
    if (direction == "l") selectedDate.setDate(selectedDate.getDate() - 7)
  }
  else {
    if (direction == "r") selectedDate.setMonth(selectedDate.getMonth() + 1)
    if (direction == "l") selectedDate.setMonth(selectedDate.getMonth() - 1)
  }
  
  slideCalendar(direction, "transform 0.75s ease", 750)
});

$(".calendar-month-year-move-button").on("click", function () {
  // If the calendar is already moving, stop; else set it moving
  if (calendarMoving) {return};
  calendarMoving = true;

  // Save whether the user clicked left or right
  let direction
  if ($(this).attr("id") == "calendar-month-year-r-btn") {
    direction = "r";
  }
  else {
    direction = "l"
  }

  if (calendarMode == "week") {
    if (direction == "r") selectedDate.setMonth(selectedDate.getMonth() + 1)
    if (direction == "l") selectedDate.setMonth(selectedDate.getMonth() - 1)
  }
  else {
    if (direction == "r") selectedDate.setFullYear(selectedDate.getFullYear() + 1)
    if (direction == "l") selectedDate.setFullYear(selectedDate.getFullYear() - 1)
  }
  updateCalendarWeekContent("#calendar-week-old")
  renameCalendarMonthYear()
  calendarMoving = false;
});

function swipe() {
  if (Math.abs(swipeXEnd - swipeXStart) > 50) {
    // If the calendar is already moving, stop; else set it moving
    if (calendarMoving) {return};
    calendarMoving = true;

    // Save whether the user swiped left or right
    let direction
    if (calendarMode == "week") {
      if (swipeXEnd - swipeXStart < 0) {
        direction = "r";
        selectedDate.setDate(selectedDate.getDate() + 7)
      }
      else {
        direction = "l"
        selectedDate.setDate(selectedDate.getDate() - 7)
      }
    }
    else if (calendarMode == "month") {
      if (swipeXEnd - swipeXStart < 0) {
        direction = "r";
        selectedDate.setMonth(selectedDate.getMonth() + 1)
      }
      else {
        direction = "l"
        selectedDate.setMonth(selectedDate.getMonth() - 1)
      }
    }
    
    slideCalendar(direction, "transform 0.75s ease", 750)
  }
}

let swipeXStart;
let swipeXEnd;
let swipeYStart;
let swipeYEnd;
$("#calendar-week-wrapper").on("touchstart", (ev) => {
  swipeXStart = ev.originalEvent.touches[0].clientX;
  swipeYStart = ev.originalEvent.touches[0].clientY;
  swipeXEnd = swipeXStart;
  swipeYEnd = swipeYStart;
})
$("#calendar-week-wrapper").on("touchmove", (ev) => {
  swipeXEnd = ev.originalEvent.touches[0].clientX;
  swipeYEnd = ev.originalEvent.touches[0].clientY;
  if (Math.abs(swipeYEnd - swipeYStart) < Math.abs(swipeXEnd - swipeXStart)) {
    ev.originalEvent.preventDefault()
  }
})
$("#calendar-week-wrapper").on("touchend", (ev) => {
  swipe()
})

$("#calendar-week-wrapper").on("mousedown", (ev) => {
  swipeXStart = ev.originalEvent.clientX;
  swipeXEnd = swipeXStart;
})
$("#calendar-week-wrapper").on("mousemove", (ev) => {
  swipeXEnd = ev.originalEvent.clientX;
})
$("#calendar-week-wrapper").on("mouseup", (ev) => {
  swipe()
})

$("#calendar-today-btn").on("click", () => {
  // If the calendar is already moving, stop; else set it moving
  if (calendarMoving) {return};

  selectedDate = new Date()

  updateCalendarWeekContent("#calendar-week-old")
  renameCalendarMonthYear()
  updateAll();
})

let calendarMode = localStorage.getItem("calendarMode") || "week";
$(`#calendar-${calendarMode}-btn`).addClass("d-none")

$("#calendar-month-btn").on("click", () => {
  calendarMode = "month"
  localStorage.setItem("calendarMode", calendarMode)
  $("#calendar-week-btn").removeClass("d-none")
  $("#calendar-month-btn").addClass("d-none")
  updateCalendarWeekContent("#calendar-week-old")
})

$("#calendar-week-btn").on("click", () => {
  calendarMode = "week"
  localStorage.setItem("calendarMode", calendarMode)
  $("#calendar-month-btn").removeClass("d-none")
  $("#calendar-week-btn").addClass("d-none")
  updateCalendarWeekContent("#calendar-week-old")
})

$(document).on("click", ".days-overview-day", function () {
  let day = parseInt($(this).data("day"))
  selectedDate = monthDates[parseInt($(this).data("week"))][(day == 0) ? 6 : day - 1]
  $("#calendar-week-old").find(".days-overview-selected").removeClass("days-overview-selected")
  $(this).addClass("days-overview-selected")
  updateCalendarWeekContent("#calendar-week-old")
  renameCalendarMonthYear()
  updateAll();
})

let selectedDate = new Date()

// Save whether the calendar is currently moving (It shouldn't be moved then, as bugs could appear)
let calendarMoving = false;

// Is a list of the dates (number of day in the month) of the week which is currently selected
let monthDates;
let selectedWeek;

// Set the visible content of the calendar to today's week
updateCalendarWeekContent("#calendar-week-old")

let monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
renameCalendarMonthYear()

// Request checking the homework on clicking its checkbox
$(document).on("click", ".homework-check", function () {
  const homeworkId = $(this).data("id");
  checkHomework(homeworkId);
});

// On changing the filter mode, update the homework list
$("#filter-homework-mode").on("input", () => {
  updateHomeworkList();
});

$("#timetable-mode input").each(function () {
  $(this).on("click", () => {
    updateTimetableMode();
  });
  $(this).prop("checked", false);
});

$("#timetable-mode-" + (localStorage.getItem("timetableMode") || "less")).prop("checked", true);

$("#substitutions-mode input").each(function () {
  $(this).on("click", () => {
    updateSubstitutionsMode();
  });
  $(this).prop("checked", false);
});

$("#substitutions-mode-" + (localStorage.getItem("substitutionsMode") || "class")).prop("checked", true);

$("#homework-mode input").each(function () {
  $(this).on("click", () => {
    updateHomeworkMode();
  });
  $(this).prop("checked", false);
});

$("#homework-mode-" + (localStorage.getItem("homeworkMode") || "tomorrow")).prop("checked", true);

socket.on("updateHomeworkData", () => {
  try {
    homeworkData = undefined;
    homeworkCheckedData = undefined;

    loadHomeworkData();
    loadHomeworkCheckedData();

    updateHomeworkList();
  } catch (error) {
    console.error("Error handling updateHomeworkData:", error);
  }
});


socket.on("updateEventData", ()=>{
  try {
    eventData = undefined;

    loadEventData();

    updateEventList();
    updateCalendarWeekContent("#calendar-week-old")
    updateTimetable();
  } catch (error) {
    console.error("Error handling updateEventData:", error);
  }
});
