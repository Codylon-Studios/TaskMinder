import { isSameDay, eventData, joinedTeamsData, createDataAccessor, homeworkData, subjectData, getHomeworkCheckStatus, runOnce, msToDisplayDate,
         substitutionsData, classSubstitutionsData, SubstitutionsData, dateToMs, lessonData, SingleEventData, updateAll, homeworkCheckedData,
         loadHomeworkData, loadHomeworkCheckedData, loadEventData, addUpdateAllFunction, socket, reloadAll,
         msToTime, 
         csrfToken} from "../../global/global.js"
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js"
import { richTextToHtml } from "../../snippets/richTextarea/richTextarea.js"

async function getCalendarDayHtml(date: Date, week: number, multiEventPositions: (number | null)[]) {
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
  const multiDayEventsA = []

  for (const event of await eventData()) {
    if (! (await joinedTeamsData()).includes(event.teamId) && event.teamId != -1) {
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

  for (const event of multiDayEventsA) {
    if (! event) {
      multiDayEvents += `<div class="event"></div>`
    }
    else {
      multiDayEvents += event
    }
  }
  
  const weekday = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()]

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
  monthDates(null);
  loadMonthDates(selectedDate)
  // Save the vertical positions of the multi events (in case two events intersect)
  const multiEventPositions: (number | null)[] = []

  let newCalendarWeekContent = ""

  if (calendarMode == "week") {
    newCalendarWeekContent += `<div class="d-flex position-relative">`
    const weekDates = (await monthDates())[selectedWeek]
    for (let i = 0; i < 7; i++) {
      newCalendarWeekContent += await getCalendarDayHtml(weekDates[i], selectedWeek, multiEventPositions)
    }
    newCalendarWeekContent += "</div>"
    return newCalendarWeekContent
  }
  else {
    newCalendarWeekContent += `<div class="d-flex weekdays">`
    const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    newCalendarWeekContent += weekdays.map((e) => {return `<div>${e}</div>`}).join("")
    newCalendarWeekContent += "</div>"
    for (const week in await monthDates()) {
      const weekDates = (await monthDates())[week]
      newCalendarWeekContent += `<div class="d-flex position-relative mb-4">`
      for (let i = 0; i < 7; i++) {
        newCalendarWeekContent += await getCalendarDayHtml(weekDates[i], parseInt(week), multiEventPositions)
      }
      newCalendarWeekContent += "</div>"
    }
    return newCalendarWeekContent
  }
}

async function updateCalendarWeekContent(targetCalendar: "#calendar-week-old" | "#calendar-week-new") {
  const content = await getNewCalendarWeekContent();
  $(targetCalendar).html(content);
}

async function loadMonthDates(selectedDate: Date) {
  // monthDates will be a list of all the dates in the currently selected week
  monthDates([])
  const monthDatesData: MonthDates = []

  const firstDate = new Date(selectedDate)
  firstDate.setDate(1)

  let firstDateDay = firstDate.getDay()
  firstDateDay = (firstDateDay == 0) ? 7 : firstDateDay;

  const firstMonday = new Date(firstDate)
  firstMonday.setDate(firstMonday.getDate() - firstDateDay + 1)

  const iteratorDate = new Date(firstMonday)
  let weekId = 0
  let firstWeek = true
  while (firstWeek || iteratorDate.getMonth() == selectedDate.getMonth()) {
    firstWeek = false;
    monthDatesData[weekId] = []
    for (let weekDay = 0; weekDay < 7; weekDay++) {
      monthDatesData[weekId].push(new Date(iteratorDate))
      if (isSameDay(iteratorDate, selectedDate)) selectedWeek = weekId
      iteratorDate.setDate(iteratorDate.getDate() + 1)
    }
    weekId++
  }

  monthDates(monthDatesData)
}

async function checkHomework(homeworkId: number) {
  // Save whether the user has checked or unchecked the homework
  const checkStatus = $(`.homework-check[data-id="${homeworkId}"]`).prop("checked");

  // Check whether the user is logged in
  if (user.loggedIn) {
    // The user is logged in

    const data = {
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
      headers: {
        "X-CSRF-Token": await csrfToken(),
      },
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

const updateHomeworkList = runOnce(async (): Promise<void> => {
  const currentSubjectData = await subjectData()
  const currentJoinedTeams = await joinedTeamsData()

  const newContent = $("<div></div>")
  let addedElements: JQuery<HTMLElement> = $();
  
  for (const homework of await homeworkData()) {
    if (currentSubjectData.find(s => s.subjectId == homework.subjectId) === undefined) {
      continue
    }
    // Get the information for the homework
    const homeworkId = homework.homeworkId;
    const subject = currentSubjectData.find(s => s.subjectId == homework.subjectId)?.subjectNameLong;
    const content = homework.content;
    const assignmentDate = new Date(parseInt(homework.assignmentDate));
    const submissionDate = new Date(parseInt(homework.submissionDate));
    const checked = await getHomeworkCheckStatus(homeworkId);

    if ($("#homework-mode-tomorrow").prop("checked")) {
      const tomorrow = new Date(selectedDate);
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (! isSameDay(tomorrow, submissionDate)) {
        continue
      }
    }

    if ($("#homework-mode-assignment").prop("checked")) {
      if (! isSameDay(selectedDate, assignmentDate)) {
        continue
      }
    }

    if ($("#homework-mode-submission").prop("checked")) {
      if (! isSameDay(selectedDate, submissionDate)) {
        continue
      }
    }

    // Filter by team
    if (! currentJoinedTeams.includes(homework.teamId) && homework.teamId != -1) {
      continue;
    }

    // The template for a homework with checkbox and edit options
    const template = 
      $(`<div class="mb-1 form-check">
        <label class="form-check-label">
          <input type="checkbox" class="form-check-input homework-check" data-id="${homeworkId}" ${(checked) ? "checked" : ""}>
          <b>${$.formatHtml(subject ?? "")}</b>
        </label>
        <span class="homework-content"></span>
      </div>`);

    // Add this homework to the list
    newContent.append(template);
    
    richTextToHtml(content, template.find(".homework-content"), { showMoreButton: true, parseLinks: true, displayBlockIfNewline: true })
    addedElements = addedElements.add(template.find(".homework-content"))
  };

  // If no homeworks match, add an explanation text
  if (newContent.html() == "") {
    let text
    if ($("#homework-mode-tomorrow").prop("checked")) {
      text = "auf den nächsten"
    }
    else if ($("#homework-mode-submission").prop("checked")) {
      text = "auf diesen"
    }
    else if ($("#homework-mode-assignment").prop("checked")) {
      text = "von diesem"
    }
    newContent.html(`<div class="text-secondary">Keine Hausaufgaben ${text} Tag.</div>`)
  }
  $("#homework-list").empty().append(newContent.children())
  addedElements.trigger("addedToDom")
})

function updateHomeworkMode() {
  if ($("#homework-mode-tomorrow").prop("checked")) {
    localStorage.setItem("homeworkMode", "tomorrow");
  }
  else if ($("#homework-mode-assignment").prop("checked")) {
    localStorage.setItem("homeworkMode", "assignment");
  }
  else {
    localStorage.setItem("homeworkMode", "submission");
  }

  updateHomeworkList();
}

const updateEventList = runOnce(async (): Promise<void> => {
  // Clear the list
  $("#event-list").empty();

  for (const event of (await eventData())) {
    if (! (await joinedTeamsData()).includes(event.teamId) && event.teamId != -1) {
      continue;
    }

    // Get the information for the event
    const eventTypeId = event.eventTypeId;
    const name = event.name;
    const description = event.description;
    const startDate = msToDisplayDate(event.startDate).split(".").slice(0, 2).join(".");
    const lesson = event.lesson;
    let endDate;
    if (event.endDate) {
      endDate = msToDisplayDate(event.endDate).split(".").slice(0, 2).join(".");
    }
    else {
      endDate = null;
    }
    const msStartDate = parseInt(event.startDate)
    const msEndDate = parseInt(event.endDate ?? event.startDate)

    // Filter by start date
    if (selectedDate.getTime() < msStartDate && ! isSameDay(selectedDate, new Date(msStartDate))) {
      continue;
    }

    // Filter by end date
    if (selectedDate.getTime() > msEndDate && ! isSameDay(selectedDate, new Date(msEndDate))) {
      continue;
    }

    // The template for an event
    const template = 
      $(`<div class="col p-2">
        <div class="card event-${eventTypeId} h-100">
          <div class="card-body p-2 d-flex">
            <div class="d-flex flex-column">
              <span class="fw-bold event-${eventTypeId}">${$.formatHtml(name)}</span>
              <b>${startDate}${(endDate) ? ` - ${endDate}` : ""}${(lesson) ? ` (${$.formatHtml(lesson)}. Stunde)` : ""}</b>
              <span class="event-description"></span>
            </div>
          </div>
        </div>
      </div>`);

    // Add this event to the list
    $("#event-list").append(template);

    richTextToHtml(description ?? "", template.find(".event-description"), {
      showMoreButton: $(`<a class="event-${eventTypeId}" href="#">Mehr anzeigen</a>`),
      parseLinks: true
    })
    template.find(".event-description").trigger("addedToDom")
  };

  // If no events match, add an explanation text
  if ($("#event-list").html() == "") {
    $("#event-list").html(`<div class="text-secondary">Keine Ereignisse an diesem Tag.</div>`)
  }
})

const updateSubstitutionList = runOnce(async (): Promise<void> => {
  const substitutionsMode = localStorage.getItem("substitutionsMode") ?? "class";

  let data: SubstitutionsData;

  if (substitutionsMode == "class") {
    data = await classSubstitutionsData();
  }
  else {
    data = await substitutionsData();
  }
  if (data === "No data") {
    $("#substitutions-container").addClass("d-none")
    return;
  }
  else {
    $("#substitutions-container").removeClass("d-none")
  }

  const updatedDate = new Date(dateToMs(data.updated.split(" ")[0]) ?? 0)
  const updatedWeekDay = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][updatedDate.getDay()]
  $("#substitutions-updated").text(updatedWeekDay + ", " + data.updated.split(" ")[1])

  if (substitutionsMode == "none") {
    $("#substitutions-table").addClass("d-none");
    return;
  }

  let planId: 1 | 2;

  if (isSameDay(selectedDate, new Date(dateToMs(data["plan1"].date) ?? 0))) {
    planId = 1
  }
  else if (isSameDay(selectedDate, new Date(dateToMs(data["plan2"].date) ?? 0))) {
    planId = 2
  }
  else {
    $("#substitutions-table").addClass("d-none")
    $("#substitutions-no-entry").addClass("d-none")
    $("#substitutions-no-data").removeClass("d-none")
    $("#substitutions-mode-wrapper").addClass("d-none");
    return;
  }
  
  if (data["plan" + planId as "plan1" | "plan2"]["substitutions"].length == 0) {
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

  for (const substitution of data["plan" + planId as "plan1" | "plan2"]["substitutions"]) {
    const template = `
      <tr>
        ${(substitutionsMode == "all") ? `<td>${substitution.class}</td>` : ""}
        <td>${$.formatHtml(substitution.type)}</td>
        <td>${$.formatHtml(substitution.lesson)}</td>
        <td>${$.formatHtml(substitution.subject)}</td>
        <td>${$.formatHtml(substitution.text)}</td>
        <td>${$.formatHtml(substitution.teacher)}&nbsp;(${$.formatHtml(substitution.teacherOld)})</td>
        <td>${$.formatHtml(substitution.room)}</td>
      </tr>`
      $("#substitutions-list").append(template);
  }

  $("tr:last td").addClass("border-bottom-0")

  $("td").each(function () {
    if ($(this).text() == "-") {
      $(this).addClass("text-center align-middle")
    }
  })

  $("#substitutions-table").removeClass("d-none")
  $("#substitutions-no-entry").addClass("d-none")
  $("#substitutions-no-data").addClass("d-none")
  $("#substitutions-mode-wrapper").removeClass("d-none");
})

function updateSubstitutionsMode() {
  if ($("#substitutions-mode-class").prop("checked")) {
    localStorage.setItem("substitutionsMode", "class");
  }
  else if ($("#substitutions-mode-all").prop("checked")) {
    localStorage.setItem("substitutionsMode", "all");
  }
  else {
    localStorage.setItem("substitutionsMode", "none");
  }

  updateSubstitutionList();
}

const updateTimetable = runOnce(async (): Promise<void> => {
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

  const currentClassSubstitutionsData = await classSubstitutionsData()
  if (currentClassSubstitutionsData != "No data") {
    if (isSameDay(selectedDate, new Date(dateToMs(currentClassSubstitutionsData.plan1.date) ?? 0))) {
      substitutionPlanId = 1;
    }
    else if (isSameDay(selectedDate, new Date(dateToMs(currentClassSubstitutionsData.plan2.date) ?? 0))) {
      substitutionPlanId = 2;
    }
    else {
      substitutionPlanId = 0;
    }
  }

  const currentJoinedTeamsData = await joinedTeamsData()
  const currentSubjectData = await subjectData()
  let currentLessonData = await lessonData()
  
  if (currentLessonData[selectedDate.getDay() - 1] === undefined) {
    return
  }
  currentLessonData = currentLessonData.filter(l => l.weekDay == selectedDate.getDay() - 1)

  type ProcessedLesson = {
    lessonNumber: number;
    subjectNameLong: string;
    subjectNameShort: string;
    subjectNameSubstitution: string[] | null;
    teacherName: string;
    teacherNameSubstitution: string[] | null;
    room: string;
    startTime: number;
    endTime: number;
  }

  const processedLessonData: ProcessedLesson[] = []
  for (const lesson of currentLessonData) {
    const subject = currentSubjectData.find(s => s.subjectId == lesson.subjectId)
    if (! subject || ! (currentJoinedTeamsData.includes(lesson.teamId) || lesson.teamId == -1)) continue
    processedLessonData.push({
      lessonNumber: lesson.lessonNumber,
      subjectNameLong: subject.subjectNameLong,
      subjectNameShort: subject.subjectNameShort,
      subjectNameSubstitution: subject.subjectNameSubstitution,
      teacherName: ((subject.teacherGender == "w") ? "Frau " : "") + ((subject.teacherGender == "m") ? "Herr " : "") + subject.teacherNameLong,
      teacherNameSubstitution: subject.teacherNameSubstitution,
      room: lesson.room,
      startTime: lesson.startTime,
      endTime: lesson.endTime
    })
  }

  type GroupedLessonData = {
    lessonNumber: number,
    startTime: number,
    endTime: number,
    lessons: ProcessedLesson[]
  }[]

  let groupedLessonData: GroupedLessonData = []
  for (const lesson of processedLessonData) {
    const group = groupedLessonData.find(l => l.lessonNumber == lesson.lessonNumber)
    if (group) {
      group.lessons.push(lesson)
    }
    else {
      groupedLessonData.push({
        lessonNumber: lesson.lessonNumber,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        lessons: [ lesson ]
      })
    }
  }
  groupedLessonData = groupedLessonData.sort((group1, group2) => group1.lessonNumber - group2.lessonNumber)
  
  for (const lessonGroup of groupedLessonData) {
    let addedDescriptionTemplates = $()

    const templateModeLess = `
      <div class="card">
        <div class="card-body d-flex align-items-center justify-content-center flex-column">
          <span class="text-center timetable-less-subject">
            ${lessonGroup.lessons.map((lessonData) => {return `<span class="original">${$.formatHtml(lessonData.subjectNameShort)}</span>`}).join(" / ")}
          </span>
        </div>
      </div>`;
    
    const thisLessLesson = $(templateModeLess)

    const templateModeMore = `
      <div class="card">
        <div class="card-body pt-4 text-center">
          <div class="timetable-more-time position-absolute start-0 top-0 mx-2 my-1 timetable-more-time-start">${msToTime(lessonGroup.startTime)}</div>
          <div class="timetable-more-time position-absolute end-0 top-0 mx-2 my-1 timetable-more-time-end">${msToTime(lessonGroup.endTime)}</div>
          <div class="d-flex align-items-center justify-content-center flex-column">
            <span class="fw-semibold text-center timetable-more-subject">
              ${lessonGroup.lessons.map((lessonData) => {return `<span class="original">${$.formatHtml(lessonData.subjectNameLong)}</span>`}).join(" / ")}
            </span>
            <span>
              <span class="text-center timetable-more-room">
              ${lessonGroup.lessons.map((lessonData) => {return `<span class="original">${$.formatHtml(lessonData.room)}</span>`}).join(" / ")}
              </span>,
              <span class="text-center timetable-more-teacher">
              ${lessonGroup.lessons.map((lessonData) => {return `<span class="original">${$.formatHtml(lessonData.teacherName)}</span>`}).join(" / ")}
              </span>
            </span>
          </div>
        </div>
      </div>`;
    
    const thisMoreLesson = $(templateModeMore)

    if (substitutionPlanId != 0) {
      for (const [lessonId, lesson] of lessonGroup.lessons.entries()) {
        function matchesLessonNumber(substitution: Record<string, string>, lessonNumber: number) {
          if (substitution.lesson.includes("-")) {
            substitution.lesson = substitution.lesson.replace(" ", "")
            const start = parseInt(substitution.lesson.split("-")[0])
            const end = parseInt(substitution.lesson.split("-")[1])
            if (start > lessonNumber || lessonNumber > end) {
              return false;
            }
          }
          else if (parseInt(substitution.lesson) != lessonNumber) {
            return false;
          }
          return true;
        }
        function matchesTeacher(substitution: Record<string, string>, lesson: ProcessedLesson) {
          return (lesson.teacherNameSubstitution ?? []).includes(substitution.teacherOld);
        }

        if (currentClassSubstitutionsData !== "No data") {
          for (const substitution of (currentClassSubstitutionsData)["plan" + substitutionPlanId as "plan1" | "plan2"].substitutions) {
            if (! matchesLessonNumber(substitution, lessonGroup.lessonNumber)) {
              continue;
            }
            if (! matchesTeacher(substitution, lesson)) {
              continue;
            }
  
            const color = (substitution.type == "Entfall") ? "red" : "yellow"
    
            const substitutionTypeText = `<div class="text-${color} text-center fw-bold mt-2">${$.formatHtml(substitution.type)}</div>`
            thisLessLesson.find(".card-body").append(substitutionTypeText)
            thisMoreLesson.find(".card-body").append(substitutionTypeText)
    
    
            if (substitution.type == "Entfall" && substitution.text == "EVA") {
              substitution.text = "-";
            }
            if (substitution.text != "-") {
              thisMoreLesson.find(".card-body").append(`<div class="text-${color} text-center">${$.formatHtml(substitution.text)}</div>`)
            }
    
            if (substitution.type == "Entfall") {
              // Times
              thisMoreLesson.find(".timetable-more-time").addClass("line-through-" + color)
            }
    
            // Subject
            const lessSubjectElement = thisLessLesson.find(".timetable-less-subject .original").eq(lessonId)
            const moreSubjectElement = thisMoreLesson.find(".timetable-more-subject .original").eq(lessonId)
            if (! (lesson.subjectNameSubstitution ?? []).includes(substitution.subject)) {
              moreSubjectElement.addClass("line-through-" + color)
              lessSubjectElement.addClass("line-through-" + color)
              if (substitution.subject != "-") {
                moreSubjectElement.after(` <span class="text-${color} fw-bold">${$.formatHtml(substitution.subject)}</span>`)
                lessSubjectElement.after(` <span class="text-${color} fw-bold">${$.formatHtml(substitution.subject)}</span>`)
              }
            }
            else {
              lessSubjectElement.addClass("fst-italic fw-semibold")
              moreSubjectElement.addClass("fst-italic fw-bold")
            }
    
            // Room
            const roomElement = thisMoreLesson.find(".timetable-more-room .original").eq(lessonId)
            if (substitution.room != lesson.room) {
              roomElement.addClass("line-through-" + color)
              if (substitution.room != "-") {
                roomElement.after(` <span class="text-${color} fw-bold">${$.formatHtml(substitution.room)}</span>`)
              }
            }
    
            // Teacher
            const teacherElement = thisMoreLesson.find(".timetable-more-teacher .original").eq(lessonId)
            if (! (lesson.subjectNameSubstitution ?? []).includes(substitution.teacher)) {
              teacherElement.addClass("line-through-" + color)
              if (substitution.teacher != "-") {
                teacherElement.after(` <span class="text-${color} fw-bold">${$.formatHtml(substitution.teacher)}</span>`)
              }
            }
          }
        }
      }
    }

    for (const event of await eventData()) {
      function matchesLessonId(event: SingleEventData, lessonId: number) {
        if (event.lesson === null) {
          return true
        }
        if (event.lesson.includes("-")) {
          event.lesson = event.lesson.replace(" ", "")
          const start = parseInt(event.lesson.split("-")[0])
          const end = parseInt(event.lesson.split("-")[1])
          if (start > lessonId || lessonId > end) {
            return false;
          }
        }
        else if (parseInt(event.lesson) != lessonId) {
          return false;
        }
        return true;
      }

      if (! (await joinedTeamsData()).includes(event.teamId) && event.teamId != -1) {
        continue;
      }

      if (event.lesson == "") {
        continue;
      }
      if (! isSameDay(new Date(parseInt(event.startDate)), selectedDate)) {
        continue;
      }
      if (! matchesLessonId(event, lessonGroup.lessonNumber)) {
        continue;
      }

      const eventName = `<span class="event-${event.eventTypeId} text-center fw-bold mt-2 d-block">${$.formatHtml(event.name)}</span>`
      thisLessLesson.find(".card-body").append(eventName)
      thisMoreLesson.find(".card-body").append(eventName)

      if (event.description != "") {
        const descriptionTemplate = $(`<span class="event-${event.eventTypeId} text-centered-block"></span>`)

        thisMoreLesson.find(".card-body").append(descriptionTemplate)

        richTextToHtml(event.description ?? "", descriptionTemplate, {
          showMoreButton: $(`<a class="event-${event.eventTypeId}" href="#">Mehr anzeigen</a>`),
          parseLinks: true
        })
        addedDescriptionTemplates = addedDescriptionTemplates.add(descriptionTemplate)
      }
    }

    const lastLessLesson = $("#timetable-less").find(".card:last()")
    if (lastLessLesson.length > 0) {
      const lastLessonHtml = lastLessLesson[0].outerHTML.replace(/\s+/g, "")
      const thisLessonHtml = thisLessLesson[0].outerHTML.replace(/\s+/g, "")
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

    const lastMoreLesson = $("#timetable-more").find(".card:last()")
    if (lastMoreLesson.length > 0) {
      // Remove the times
      const lastLessonCopy = $(lastMoreLesson[0].outerHTML);
      lastLessonCopy.find(".timetable-more-time").html("");
      const lastLessonHtml = lastLessonCopy[0].outerHTML.replace(/\s+/g, "");

      const thisLessonCopy = $(thisMoreLesson[0].outerHTML);
      thisLessonCopy.find(".timetable-more-time").html("");
      const thisLessonHtml = thisLessonCopy[0].outerHTML.replace(/\s+/g, "");

      if (lastLessonHtml == thisLessonHtml) {
        lastMoreLesson.addClass("wide")
        lastMoreLesson.find(".card-body div:nth-child(2)").text(msToTime(lessonGroup.endTime))
      }
      else {
        $("#timetable-more").append(thisMoreLesson);
      }
    }
    else {
      $("#timetable-more").append(thisMoreLesson);
    }
    addedDescriptionTemplates.trigger("addedToDom")
  }
})

function updateTimetableMode() {
  if ([0, 6].includes(selectedDate.getDay())) {
    $("#timetable-less").addClass("d-none");
    $("#timetable-more").addClass("d-none");
  }
  else if ($("#timetable-mode-less").prop("checked")) {
    $("#timetable-less").removeClass("d-none");
    $("#timetable-more").addClass("d-none");
    localStorage.setItem("timetableMode", "less");
  }
  else if ($("#timetable-mode-more").prop("checked")) {
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
  $("#calendar-month-year").text(`${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`)
}

function slideCalendar(direction: "l" | "r", transition: string, slideTime: number) {
  return new Promise<void>((resolve) => {
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

$(() => {
  addUpdateAllFunction(
    updateHomeworkList,
    updateEventList,
    updateSubstitutionList,
    updateTimetable
  )
  reloadAll();
})
const animations = JSON.parse(localStorage.getItem("animations") ?? "true") as boolean;

$(".calendar-week-move-button").on("click", function () {
  // If the calendar is already moving, stop; else set it moving
  if (calendarMoving) {return};
  calendarMoving = true;

  // Save whether the user clicked left or right
  let direction: "l" | "r"
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
    let direction: "l" | "r"
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
    else if (swipeXEnd - swipeXStart < 0) {
      direction = "r";
      selectedDate.setMonth(selectedDate.getMonth() + 1)
    }
    else {
      direction = "l"
      selectedDate.setMonth(selectedDate.getMonth() - 1)
    }
    
    
    slideCalendar(direction, "transform 0.75s ease", 750)
  }
}

let swipeXStart: number;
let swipeXEnd: number;
let swipeYStart: number;
let swipeYEnd: number;
$("#calendar-week-wrapper").on("touchstart", (ev) => {
  swipeXStart = ev.originalEvent?.touches[0].clientX ?? 0;
  swipeYStart = ev.originalEvent?.touches[0].clientY ?? 0;
  swipeXEnd = swipeXStart;
  swipeYEnd = swipeYStart;
})
$("#calendar-week-wrapper").on("touchmove", (ev) => {
  swipeXEnd = ev.originalEvent?.touches[0].clientX ?? 0;
  swipeYEnd = ev.originalEvent?.touches[0].clientY ?? 0;
  if (Math.abs(swipeYEnd - swipeYStart) < Math.abs(swipeXEnd - swipeXStart)) {
    ev.originalEvent?.preventDefault()
  }
})
$("#calendar-week-wrapper").on("touchend", () => {
  swipe()
})

$("#calendar-week-wrapper").on("mousedown", (ev) => {
  swipeXStart = ev.originalEvent?.clientX ?? 0;
  swipeXEnd = swipeXStart;
})
$("#calendar-week-wrapper").on("mousemove", (ev) => {
  swipeXEnd = ev.originalEvent?.clientX ?? 0;
})
$("#calendar-week-wrapper").on("mouseup", () => {
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

let calendarMode = localStorage.getItem("calendarMode") ?? "week";
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

$(document).on("click", ".days-overview-day", async function () {
  const day = parseInt($(this).data("day"))
  selectedDate = (await monthDates())[parseInt($(this).data("week"))][(day == 0) ? 6 : day - 1]
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
type MonthDates = Date[][];
const monthDates = createDataAccessor<MonthDates>("monthDates")
let selectedWeek: number;

// Set the visible content of the calendar to today's week
updateCalendarWeekContent("#calendar-week-old")

const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
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

$("#timetable-mode-" + (localStorage.getItem("timetableMode") ?? "less")).prop("checked", true);

$("#substitutions-mode input").each(function () {
  $(this).on("click", () => {
    updateSubstitutionsMode();
  });
  $(this).prop("checked", false);
});

$("#substitutions-mode-" + (localStorage.getItem("substitutionsMode") ?? "class")).prop("checked", true);

$("#homework-mode input").each(function () {
  $(this).on("click", () => {
    updateHomeworkMode();
  });
  $(this).prop("checked", false);
});

$("#homework-mode-" + (localStorage.getItem("homeworkMode") ?? "tomorrow")).prop("checked", true);

socket.on("updateHomeworkData", () => {
  try {
    homeworkData(null);
    homeworkCheckedData(null);

    loadHomeworkData();
    loadHomeworkCheckedData();

    updateHomeworkList();
  } catch (error) {
    console.error("Error handling updateHomeworkData:", error);
  }
});


socket.on("updateEventData", ()=>{
  try {
    eventData(null);

    loadEventData();

    updateEventList();
    updateCalendarWeekContent("#calendar-week-old")
    updateTimetable();
  } catch (error) {
    console.error("Error handling updateEventData:", error);
  }
});
