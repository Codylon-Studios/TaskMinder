import {
  isSameDay,
  eventData,
  joinedTeamsData,
  createDataAccessor,
  homeworkData,
  subjectData,
  getHomeworkCheckStatus,
  getDisplayDate,
  substitutionsData,
  classSubstitutionsData,
  dateToMs,
  homeworkCheckedData,
  msToTime,
  csrfToken,
  escapeHTML,
  loadTimetableData,
  getTimeLeftString,
  lastCommaRegex,
  registerSocketListeners,
  lessonData,
  teamsData,
  eventTypeData,
  getSite
} from "../../global/global.js";
import { MonthDates, TimetableData } from "../../global/types";
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js";
import { richTextToHtml } from "../../snippets/richTextarea/richTextarea.js";

async function getCalendarDayHtml(date: Date, week: number, multiEventPositions: (number | null)[]): Promise<string> {
  async function applyEvents(): Promise<void> {
    for (const event of await eventData()) {
      function handleMultiDayEvent(endDate: string): void {
        if (!multiEventPositions.includes(event.eventId)) {
          if (multiEventPositions.includes(null)) {
            multiEventPositions.splice(multiEventPositions.indexOf(null), 1, event.eventId);
          }
          else {
            multiEventPositions.push(event.eventId);
          }
        }
        if (isSameDay(new Date(Number.parseInt(event.startDate)), date)) {
          if (isSameDay(new Date(Number.parseInt(endDate)), date)) {
            multiDayEventsArr[multiEventPositions.indexOf(event.eventId)] =
              `<div class="event event-single event-${event.eventTypeId}"></div>`;
          }
          else {
            multiDayEventsArr[multiEventPositions.indexOf(event.eventId)] =
              `<div class="event event-start event-${event.eventTypeId}"></div>`;
          }
        }
        else if (isSameDay(new Date(Number.parseInt(endDate)), date)) {
          multiDayEventsArr[multiEventPositions.indexOf(event.eventId)] =
            `<div class="event event-end event-${event.eventTypeId}"></div>`;
        }
        else if (Number.parseInt(event.startDate) < date.getTime() && Number.parseInt(endDate) > date.getTime()) {
          multiDayEventsArr[multiEventPositions.indexOf(event.eventId)] =
            `<div class="event event-middle event-${event.eventTypeId}"></div>`;
        }
        else if (multiEventPositions.indexOf(event.eventId) === multiEventPositions.length - 1) {
          multiEventPositions.pop();
        }
        else {
          multiEventPositions[multiEventPositions.indexOf(event.eventId)] = null;
        }
      }
      if (!(await joinedTeamsData()).includes(event.teamId) && event.teamId !== -1) {
        continue;
      }
  
      if (event.endDate === null) {
        if (isSameDay(new Date(Number.parseInt(event.startDate)), date)) {
          singleDayEvents += `<div class="col"><div class="event event-${event.eventTypeId}"></div></div>`;
        }
      }
      else {
        handleMultiDayEvent(event.endDate);
      }
    }

    // Multi day events
    for (const event of multiDayEventsArr) {
      if (event) {
        multiDayEvents += event;
      }
      else {
        multiDayEvents += '<div class="event"></div>';
      }
    }
  }

  // Any special classes of the day
  let specialClasses = "";
  // If the day is today, add the days-overview-today class
  if (isSameDay(date, new Date())) {
    specialClasses = "days-overview-today fw-bold ";
  }
  // If the day is selected, add the days-overview-selected class
  if (isSameDay(date, selectedDate)) {
    specialClasses += "days-overview-selected ";
    if (!selectedNewDay || !animations) {
      specialClasses += "days-overview-selected-no-animation ";
    }
  }
  if ([0, 6].includes(date.getDay())) {
    specialClasses += "text-body-tertiary ";
  }
  if (calendarMode === "month" && date.getMonth() !== selectedDate.getMonth()) {
    specialClasses += "days-overview-other-month ";
  }

  // Single day events
  let singleDayEvents = "";
  let multiDayEvents = "";
  const multiDayEventsArr: string[] = [];

  await applyEvents();

  const weekday = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()];

  // Append the days (All days will be added into and .calendar-week element)
  return `
  <button class="days-overview-day ${specialClasses} cursor-pointer" data-week="${week}" data-day="${date.getDay()}">
    <span class="weekday">${calendarMode === "week" ? weekday : ""}</span>
    <span class="date">${date.getDate()}</span>
    <div class="events ${calendarMode}">
      <div class="multi-events">
        ${multiDayEvents}
      </div>
      <div class="single-events row row-cols-3">
        ${singleDayEvents}
      </div>
    </div>
  </button>`;
}

async function getNewCalendarWeekContent(): Promise<string> {
  // Get the list of all dates in this week
  monthDates(null);
  loadMonthDates(selectedDate);
  // Save the vertical positions of the multi events (in case two events intersect)
  const multiEventPositions: (number | null)[] = [];

  let newCalendarWeekContent = "";

  if (calendarMode === "week") {
    newCalendarWeekContent += '<div class="d-flex position-relative">';
    const weekDates = (await monthDates())[2];
    for (let i = 0; i < 7; i++) {
      newCalendarWeekContent += await getCalendarDayHtml(weekDates[i], 2, multiEventPositions);
    }
    newCalendarWeekContent += "</div>";
    return newCalendarWeekContent;
  }
  else {
    newCalendarWeekContent += '<div class="d-flex weekdays">';
    const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    newCalendarWeekContent += weekdays
      .map(e => {
        return `<div>${e}</div>`;
      })
      .join("");
    newCalendarWeekContent += "</div>";
    for (const week in await monthDates()) {
      const weekDates = (await monthDates())[week];
      newCalendarWeekContent += '<div class="d-flex position-relative mb-4">';
      for (let i = 0; i < 7; i++) {
        newCalendarWeekContent += await getCalendarDayHtml(weekDates[i], Number.parseInt(week), multiEventPositions);
      }
      newCalendarWeekContent += "</div>";
    }
    return newCalendarWeekContent;
  }
}

async function updateCalendarWeekContent(targetCalendar: "#calendar-week-old" | "#calendar-week-new"): Promise<void> {
  const content = await getNewCalendarWeekContent();
  $(targetCalendar).html(content);
}

async function loadMonthDates(selectedDate: Date): Promise<void> {
  // monthDates will be a list of all the dates in the currently selected week
  monthDates([]);
  const monthDatesData: MonthDates = [];

  let selectedDateWeekDay = selectedDate.getDay();
  selectedDateWeekDay = selectedDateWeekDay === 0 ? 7 : selectedDateWeekDay;

  const firstMonday = new Date(selectedDate);
  firstMonday.setDate(firstMonday.getDate() - 14 - selectedDateWeekDay + 1);

  for (let week = 0; week < 5; week++) {
    monthDatesData[week] = [];
    for (let day = 0; day < 7; day++) {
      monthDatesData[week].push(new Date(firstMonday));
      firstMonday.setDate(firstMonday.getDate() + 1);
    }
  }

  monthDates(monthDatesData);
}

async function checkHomework(homeworkId: number): Promise<void> {
  justCheckedHomeworkId = homeworkId;
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
      url: "/homework/check_homework",
      type: "POST",
      data: data,
      headers: {
        "X-CSRF-Token": await csrfToken()
      },
      error: xhr => {
        if (xhr.status === 401) {
          // The user has to be logged in but isn't
          // Show an error notification
          $navbarToasts.notLoggedIn.toast("show");
        }
        else if (xhr.status === 500) {
          // An internal server error occurred
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
    let data = [];

    if (dataString !== null) {
      data = JSON.parse(dataString);
    }

    if (checkStatus) {
      data.push(homeworkId);
    }
    else {
      data.splice(data.indexOf(homeworkId), 1);
    }

    dataString = JSON.stringify(data);

    localStorage.setItem("homeworkCheckedData", dataString);
    
    homeworkCheckedData.reload();
    renderHomeworkList();
  }
}

async function renderHomeworkList(): Promise<void> {
  const currentSubjectData = await subjectData();
  const currentJoinedTeams = await joinedTeamsData();

  const newContent = $("<div></div>");
  let addedElements: JQuery<HTMLElement> = $();

  for (const homework of await homeworkData()) {
    async function filter(): Promise<boolean> {
      if ($("#homework-mode-tomorrow").prop("checked")) {
        const tomorrow = new Date(selectedDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (!isSameDay(tomorrow, submissionDate)) {
          return true;
        }
      }
  
      if ($("#homework-mode-assignment").prop("checked")) {
        if (!isSameDay(selectedDate, assignmentDate)) {
          return true;
        }
      }
  
      if ($("#homework-mode-submission").prop("checked")) {
        if (!isSameDay(selectedDate, submissionDate)) {
          return true;
        }
      }
  
      // Filter by team
      if (!currentJoinedTeams.includes(homework.teamId) && homework.teamId !== -1) {
        return true;
      }
      return false;
    }
    function showCheckAnimation(): void {
      if (checked && justCheckedHomeworkId === homeworkId && animations) {
        justCheckedHomeworkId = -1;
        template.find(".homework-check-wrapper").append($("<div></div>".repeat(8)).each(
          function (id) {
            $(this).attr("data-id", id);
            setTimeout(() => {
              $(this).remove();
            }, 400);
          }
        ));
      }
    }
    
    const homeworkId = homework.homeworkId;

    // Get the information for the homework
    const subject = currentSubjectData.find(s => s.subjectId === homework.subjectId)?.subjectNameLong ?? "Sonstiges";
    const content = homework.content;
    const assignmentDate = new Date(Number.parseInt(homework.assignmentDate));
    const submissionDate = new Date(Number.parseInt(homework.submissionDate));
    const checked = await getHomeworkCheckStatus(homeworkId);

    if (await filter()) continue;

    // The template for a homework with checkbox and edit options
    const template = $(`
      <div class="mb-1 form-check">
        <div class="homework-check-wrapper form-check-input invisible">
          <input type="checkbox" class="form-check-input homework-check visible" id="homework-check-${homeworkId}"
            data-id="${homeworkId}" ${checked ? "checked" : ""}>
        </div>
        <label class="form-check-label" for="homework-check-${homeworkId}">
          <span class="fw-bold">${escapeHTML(subject)}</span>
        </label>
        <span class="homework-content"></span>
      </div>
    `);
    
    showCheckAnimation();

    // Add this homework to the list
    newContent.append(template);

    richTextToHtml(content, template.find(".homework-content"), {
      showMoreButton: true,
      parseLinks: true,
      displayBlockIfNewline: true,
      merge: true
    });
    addedElements = addedElements.add(template.find(".homework-content"));
  }

  // If no homeworks match, add an explanation text
  if (newContent.html() === "") {
    let text;
    if ($("#homework-mode-tomorrow").prop("checked")) {
      text = "auf den nächsten";
    }
    else if ($("#homework-mode-submission").prop("checked")) {
      text = "auf diesen";
    }
    else if ($("#homework-mode-assignment").prop("checked")) {
      text = "von diesem";
    }
    newContent.html(`<div class="text-secondary">Keine Hausaufgaben ${text} Tag.</div>`);
  }
  $("#homework-list").empty().append(newContent.children());
  addedElements.trigger("addedToDom");
};

function updateHomeworkMode(): void {
  if ($("#homework-mode-tomorrow").prop("checked")) {
    localStorage.setItem("homeworkMode", "tomorrow");
  }
  else if ($("#homework-mode-assignment").prop("checked")) {
    localStorage.setItem("homeworkMode", "assignment");
  }
  else {
    localStorage.setItem("homeworkMode", "submission");
  }

  renderHomeworkList();
}

async function renderEventList(): Promise<void> {
  // Clear the list
  $("#event-list").empty();

  for (const event of await eventData()) {
    async function filter(): Promise<boolean> {
      // Filter by team
      if (!(await joinedTeamsData()).includes(event.teamId) && event.teamId !== -1) {
        return true;
      }

      // Filter by start date
      if (selectedDate.getTime() < msStartDate && !isSameDay(selectedDate, new Date(msStartDate))) {
        return true;
      }

      // Filter by end date
      if (selectedDate.getTime() > msEndDate && !isSameDay(selectedDate, new Date(msEndDate))) {
        return true;
      }
      return false;
    }

    const msStartDate = Number.parseInt(event.startDate);
    const msEndDate = Number.parseInt(event.endDate ?? event.startDate);

    if (await filter()) continue;

    // Get the information for the event
    const eventTypeId = event.eventTypeId;
    const name = event.name;
    const description = event.description;
    const startDate = getDisplayDate(event.startDate);
    const lesson = event.lesson;
    const timeSpan = $("<span></span>");
    if (event.endDate !== null) {
      const endDate = getDisplayDate(event.endDate);
      if (isSameDay(new Date(Number.parseInt(event.startDate)), new Date(Number.parseInt(event.endDate)))) {
        timeSpan.append("<b>Ganztägig</b> ", startDate);
      }
      else {
        timeSpan.append(startDate, " - ", endDate);
      }
    }
    else if (lesson !== null && lesson !== "") {
      timeSpan.append(startDate, ` <b>(${escapeHTML(lesson)}. Stunde)</b>`);
    }
    else {
      timeSpan.append(startDate);
    }
    
    // The template for an event
    const template = $(`<div class="col py-2">
        <div class="card event-${eventTypeId} h-100">
          <div class="card-body p-2">
            <div class="d-flex flex-column">
              <span class="fw-bold event-${eventTypeId}">${escapeHTML(name)}</span>
              <span>${timeSpan.html()}</span>
              <span class="event-description"></span>
            </div>
          </div>
        </div>
      </div>`);

    // Add this event to the list
    $("#event-list").append(template);

    richTextToHtml(description ?? "", template.find(".event-description"), {
      showMoreButton: $(`<a class="event-${eventTypeId}" href="#">Mehr anzeigen</a>`),
      parseLinks: true,
      merge: true
    });
    template.find(".event-description").trigger("addedToDom");
  }

  // If no events match, add an explanation text
  if ($("#event-list").html() === "") {
    $("#event-list").html('<div class="text-secondary">Keine Ereignisse an diesem Tag.</div>');
  }
};

async function renderSubstitutionList(): Promise<void> {
  function getPlanId(): 1 | 2 | null {
    if (data === "No data") {
      return null;
    }

    if (isSameDay(selectedDate, new Date(dateToMs(data["plan1"].date) ?? 0))) {
      return 1;
    }
    else if (isSameDay(selectedDate, new Date(dateToMs(data["plan2"].date) ?? 0))) {
      return 2;
    }
    else {
      $("#substitutions-table").addClass("d-none");
      $("#substitutions-no-entry").addClass("d-none");
      $("#substitutions-no-data").removeClass("d-none");
      $("#substitutions-mode-wrapper").addClass("d-none");
      return null;
    }
  }
  const substitutionsMode = localStorage.getItem("substitutionsMode") ?? "class";

  const data = (await (substitutionsMode === "class" ?  classSubstitutionsData : substitutionsData)()).data;

  if (data === "No data") {
    $("#substitutions-container").addClass("d-none");
    return;
  }
  else {
    $("#substitutions-container").removeClass("d-none");
  }

  const updatedDate = new Date(dateToMs(data.updated.split(" ")[0]) ?? 0);
  const updatedWeekDay = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][updatedDate.getDay()];
  $("#substitutions-updated").text(updatedWeekDay + ", " + data.updated.split(" ")[1]);

  if (substitutionsMode === "none") {
    $("#substitutions-table").addClass("d-none");
    return;
  }

  const planId: 1 | 2 | null = getPlanId();
  if (planId === null) return;

  if (data[("plan" + planId) as "plan1" | "plan2"]["substitutions"].length === 0) {
    $("#substitutions-table").addClass("d-none");
    $("#substitutions-no-entry").removeClass("d-none");
    $("#substitutions-no-data").addClass("d-none");
    $("#substitutions-mode-wrapper").removeClass("d-none");
    return;
  }

  $("#substitutions-list").empty();

  if (substitutionsMode === "all") {
    $("#substitutions-table th:first()").removeClass("d-none");
  }
  else {
    $("#substitutions-table th:first()").addClass("d-none");
  }

  data[("plan" + planId) as "plan1" | "plan2"]["substitutions"].forEach(substitution => {
    const template = `
    <tr>
      ${substitutionsMode === "all" ? `<td>${substitution.class}</td>` : ""}
      <td>${escapeHTML(substitution.type)}</td>
      <td>${escapeHTML(substitution.lesson)}</td>
      <td>${escapeHTML(substitution.subject)}</td>
      <td>${escapeHTML(substitution.text)}</td>
      <td>${escapeHTML(substitution.teacher)}&nbsp;(${escapeHTML(substitution.teacherOld)})</td>
      <td>${escapeHTML(substitution.room)}</td>
    </tr>`;
    $("#substitutions-list").append(template);
  });

  $("tr:last td").addClass("border-bottom-0");

  $("td").each(function () {
    if ($(this).text() === "-") {
      $(this).addClass("text-center align-middle");
    }
  });

  $("#substitutions-table").removeClass("d-none");
  $("#substitutions-no-entry").addClass("d-none");
  $("#substitutions-no-data").addClass("d-none");
  $("#substitutions-mode-wrapper").removeClass("d-none");
};

function updateSubstitutionsMode(): void {
  if ($("#substitutions-mode-class").prop("checked")) {
    localStorage.setItem("substitutionsMode", "class");
  }
  else if ($("#substitutions-mode-all").prop("checked")) {
    localStorage.setItem("substitutionsMode", "all");
  }
  else {
    localStorage.setItem("substitutionsMode", "none");
  }

  renderSubstitutionList();
}

async function renderTimetable(): Promise<void> {
  $("#timetable-less").empty();
  $("#timetable-more").empty();

  if ([0, 6].includes(selectedDate.getDay())) {
    $("#timetable-less").addClass("d-none");
    $("#timetable-more").addClass("d-none");
    $("#timetable-mode-wrapper").addClass("d-none");
    updateTimetableFeedback();
    return;
  }

  $("#timetable-less").removeClass("d-none");
  $("#timetable-more").removeClass("d-none");
  $("#timetable-mode-wrapper").removeClass("d-none");
  updateShownTimetable();

  const timetableData = await loadTimetableData(selectedDate);

  for (const multiLesson of timetableData) {
    if (! multiLesson.lessons.some(l => l.subjectId !== -1 || l.substitution !== undefined || l.events !== undefined)) {
      continue;
    }

    const templateModeLess = `
      <div class="card" data-start-lesson-number="${multiLesson.startLessonNumber}" data-end-lesson-number="${multiLesson.endLessonNumber}">
        <div class="card-body d-flex align-items-center justify-content-center flex-column">
          <span>
            ${/* eslint-disable indent */
              multiLesson.lessons
                .map(l => {
                  let cssClass = "";
                  let append = "";
                  if (l.substitution !== undefined) {
                    if (l.substitution.type === "Entfall") cssClass = "line-through-red";
                    else if (l.subjectNameSubstitution.includes(l.substitution.subject)) cssClass = "fst-italic";
                    else {
                      cssClass = "line-through-yellow";
                      append = ` <span class="text-yellow fw-bold">${escapeHTML(l.substitution.subject)}</span>`;
                    }
                  }
                  return `<span class="${cssClass}">${escapeHTML(l.subjectNameShort)}</span>${append}`;
                })
                .join(" / ")
              /* eslint-enable indent */}</span>
          ${/* eslint-disable indent */
            multiLesson.lessons
              .map(l => {
                if (l.substitution !== undefined) {
                  const color = (l.substitution.type === "Entfall") ? "red" : "yellow";
                  return `<div class="text-${color} fw-bold mt-2">${escapeHTML(l.substitution.type)}</div>`;
                }
              }).join("")
            /* eslint-enable indent */}
          ${/* eslint-disable indent */
            multiLesson.lessons
              .map(l => {
                if (l.events !== undefined) {
                  return l.events.map(e => {
                    return `<span class="event-${e.eventTypeId} fw-bold mt-2 d-block">${escapeHTML(e.name)}</span>`;
                  }).join("");
                }
              }).join("")
            /* eslint-enable indent */}


          <div class="timetable-multi-lesson position-absolute end-0 bottom-0 m-2 rounded-circle bg-secondary-subtle
            ${multiLesson.endLessonNumber > multiLesson.startLessonNumber ? "d-flex" : "d-none"} justify-content-center align-items-center">
            ×${multiLesson.endLessonNumber - multiLesson.startLessonNumber + 1}
          </div>
        </div>
      </div>`;

    const thisLessLesson = $(templateModeLess);

    const templateModeMore = `
      <div class="card" data-start-lesson-number="${multiLesson.startLessonNumber}" data-end-lesson-number="${multiLesson.endLessonNumber}">
        <div class="card-body pt-4 text-center">
          <div class="timetable-more-time position-absolute start-0 top-0 mx-2 my-1 timetable-more-time-start
              ${multiLesson.lessons.every(l =>l.substitution?.type === "Entfall") ? "line-through-red" : ""}
            ">
            ${msToTime(multiLesson.startTime)}
          </div>
          <div class="timetable-more-time position-absolute end-0 top-0 mx-2 my-1 timetable-more-time-end
              ${multiLesson.lessons.every(l => l.substitution?.type === "Entfall") ? "line-through-red" : ""}
            ">
            ${msToTime(multiLesson.endTime)}
          </div>
          <div class="d-flex align-items-center justify-content-center flex-column">
            <span class="fw-semibold">
              ${/* eslint-disable indent */
                multiLesson.lessons
                  .map(l => {
                    let cssClass = "";
                    let append = "";
                    if (l.substitution !== undefined) {
                      if (l.substitution.type === "Entfall") cssClass = "line-through-red";
                      else if (l.subjectNameSubstitution.includes(l.substitution.subject)) cssClass = "fst-italic";
                      else {
                        cssClass = "line-through-yellow";
                        append = `<span class="text-yellow fw-bold">${escapeHTML(l.substitution.subject)}</span>`;
                      }
                    }
                    return `<span class="${cssClass}">${escapeHTML(l.subjectNameLong)}</span> ${append}`;
                  })
                  .join(" / ")
                /* eslint-enable indent */}</span>

            <span>
              <span>
                ${/* eslint-disable indent */
                  multiLesson.lessons
                    .map(l => {
                      let cssClass = "";
                      let append = "";
                      if (l.substitution !== undefined) {
                        if (l.substitution.type === "Entfall") cssClass = "line-through-red";
                        else if (l.substitution.room !== l.room) {
                          cssClass = "line-through-yellow";
                          append = ` <span class="text-yellow fw-bold">${l.substitution.room}</span>`;
                        }
                      }
                      return `<span class="${cssClass}">${escapeHTML(l.room)}</span>${append}`;
                    })
                    .join(" / ")
                  /* eslint-enable indent */}</span>,
              <span>
                ${/* eslint-disable indent */
                  multiLesson.lessons
                    .map(l => {
                      let cssClass = "";
                      let append = "";
                      if (l.substitution !== undefined) {
                        if (l.substitution.type === "Entfall") cssClass = "line-through-red";
                        else if (!(l.teacherNameSubstitution ?? []).includes(l.substitution.teacher)) {
                          cssClass = "line-through-yellow";
                          append = ` <span class="text-yellow fw-bold">${l.substitution.teacher}</span>`;
                        }
                      }
                      return `<span class="${cssClass}">${escapeHTML(l.teacherName)}</span>${append}`;
                    })
                    .join(" / ")
                  /* eslint-enable indent */}</span>
            </span>
            ${/* eslint-disable indent */
              multiLesson.lessons
                .map(l => {
                  if (l.substitution !== undefined) {
                    const color = (l.substitution.type === "Entfall") ? "red" : "yellow";
                    return `
                      <div class="text-${color} fw-bold mt-2">${escapeHTML(l.substitution.type)}</div>
                      <div class="text-${color}">${escapeHTML(["EVA", "-"].includes(l.substitution.text) ? "" : l.substitution.text)}</div>
                    `;
                  }
                }).join("")
              /* eslint-enable indent */}
            ${/* eslint-disable indent */
              multiLesson.lessons
                .map(l => {
                  if (l.events !== undefined) {
                    return l.events.map(e => {
                      return `
                        <span class="event-${e.eventTypeId} fw-bold mt-2 d-block">${escapeHTML(e.name)}</span>
                        <span class="event-${e.eventTypeId} text-centered-block rich-text" data-event-type-id="${e.eventTypeId}"
                          >${escapeHTML(e.description ?? "")}</span>
                      `;
                    }).join("");
                  }
                }).join("")
              /* eslint-enable indent */}
          </div>

          <div class="timetable-multi-lesson position-absolute end-0 bottom-0 m-2 rounded-circle bg-secondary-subtle
            ${multiLesson.endLessonNumber > multiLesson.startLessonNumber ? "d-flex" : "d-none"} justify-content-center align-items-center">
            ×${multiLesson.endLessonNumber - multiLesson.startLessonNumber + 1}
          </div>
        </div>
      </div>`;

    const thisMoreLesson = $(templateModeMore);
    $("#timetable-less").append(thisLessLesson);
    $("#timetable-more").append(thisMoreLesson);
    thisMoreLesson.find(".rich-text").each(function () {
      richTextToHtml($(this).text(), $(this), {
        showMoreButton: $(`<a class="event-${$(this).attr("data-event-type-id")}" href="#">Mehr anzeigen</a>`),
        parseLinks: true,
        merge: true
      });
      $(this).trigger("addedToDom");
    });
  };

  if ($("#timetable-less").html() === "") {
    $("#timetable-less, #timetable-more").html("<div class=\"text-secondary text-center\">Kein Stundenplan für diesen Tag.</div>");
  }

  updateTimetableFeedback();
};

function updateShownTimetable(): void {
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

async function updateTimetableFeedback(): Promise<void> {
  function getCurrentLessons(): void {
    for (const l of timetableData) {
      const isReal = l.lessons.some(l => (l.subjectId !== -1 || l.substitution) && l.substitution?.type !== "Entfall");
      if (isReal) realLessonsLeft = true;
      if (l.startTime < now && isReal) hasBegun = true;
      
      if (foundNextLesson) return;
      if (l.endTime > now) {
        if (l.startTime < now) {
          currentLesson = l;
          realLessonsLeft = false;
          isCurrentLessonReal = isReal;
        }
        else {
          nextLesson = l;
          foundNextLesson = true;
        }
      }
    };
  }
  function lessonToText(l: TimetableData, showMoreInfo: boolean): string {
    return (
      (l.lessons[0].events
        ? (l.lessons[0].events).map(e => `<span class="fw-bold event-${e.eventTypeId}">${e.name}</span>`)
          .join(", ").replace(lastCommaRegex, " und") + " während "
        : "")

      + (showMoreInfo
        ? (
          diff => diff === 1 ? "" : `einer <b>${(diff === 2 ? "Doppelstunde" : diff + "-fach Stunde")}</b> `
        )(l.endLessonNumber - l.startLessonNumber + 1)
        : "")

      + l.lessons.map(l => {
        if (l.substitution) {
          if (l.substitution.type === "Entfall") {
            return `<b class="text-danger">Entfall</b> (Eigentlich ${l.subjectNameLong})`;
          }
          const sameSubject = l.subjectNameSubstitution.includes(l.substitution.subject);
          const sameRoom = l.room === l.substitution.room;
          return `
              ${sameSubject ? l.subjectNameLong : `<b class="text-yellow">${l.substitution.subject}</b>`}
              ${showMoreInfo ? "in " + (sameRoom ? l.room : `<b class="text-yellow">${l.substitution.room}</b>`) : ""}
            ` + (sameSubject ? "" : `(Eigentlich ${l.subjectNameLong})`);
        }
        else {
          return `<b>${l.subjectNameLong}</b>` + (showMoreInfo && l.subjectId !== -1 ? ` in <b>${l.room}</b>` : "");
        }
      }

      ).join(" bzw. ")
    );
  }
  const nowD = new Date();
  const now = (nowD.getHours() * 60 * 60 + nowD.getMinutes() * 60 + nowD.getSeconds()) * 1000;

  if (!isSameDay(nowD, selectedDate)) {
    $("#timetable-feedback").addClass("d-none");
    return;
  }
  $("#timetable-feedback").removeClass("d-none").find("i").hide();
  if ([0, 6].includes(selectedDate.getDay())) {
    $("#timetable-feedback-happy").show();
    $("#timetable-feedback span").text("Heute kein Unterricht!");
    return;
  }

  const timetableData = await loadTimetableData(selectedDate);
  let currentLesson = null as TimetableData | null;
  let nextLesson = null as TimetableData | null;
  let foundNextLesson = false;
  let hasBegun = false;
  let realLessonsLeft = false;
  let isCurrentLessonReal = false;

  getCurrentLessons();
  
  if (!realLessonsLeft) {
    if (isCurrentLessonReal) {
      const timeLeft = currentLesson!.lessonTimes.reduce((acc, curr) => {
        if (curr.endTime < now) return acc;
        else return acc + curr.endTime - Math.max(curr.startTime, now);
      }, 0);
      $("#timetable-feedback-info").show();
      $("#timetable-feedback span").html(`Noch <b>${getTimeLeftString(timeLeft)}</b>
        ${lessonToText(currentLesson!, false)}, danach ist der Unterricht für heute vorbei!`);
    }
    else {
      $("#timetable-feedback-happy").show();
      $("#timetable-feedback span").text("Der Unterricht ist für heute vorbei!");
    }
    return;
  }

  if (currentLesson === null) {
    if (nextLesson === null) {
      $("#timetable-feedback-happy").show();
      $("#timetable-feedback span").text("Der Unterricht ist für heute vorbei!");
    }
    else if (hasBegun) {
      $("#timetable-feedback-info").show();
      $("#timetable-feedback span").html(`
        Der Unterricht geht in <b>${getTimeLeftString(nextLesson.startTime - now)}</b> mit ${lessonToText(nextLesson, true)} weiter.
      `);
    }
    else {
      $("#timetable-feedback-info").show();
      $("#timetable-feedback span").html(`
        Der Unterricht beginnt in <b>${getTimeLeftString(nextLesson.startTime - now)}</b> mit ${lessonToText(nextLesson, true)}.
      `);
    }
  }
  else {
    const timeLeft = currentLesson.lessonTimes.reduce((acc, curr) => {
      if (curr.endTime < now) return acc;
      else return acc + curr.endTime - Math.max(curr.startTime, now);
    }, 0);
    $("#timetable-feedback-info").show();
    if (nextLesson === null) {
      $("#timetable-feedback span").html(`Noch <b>${getTimeLeftString(timeLeft)}</b>
        ${lessonToText(currentLesson, false)}, danach ist der Unterricht für heute vorbei!`);
    }
    else {
      $("#timetable-feedback span").html(`Noch <b>${getTimeLeftString(timeLeft)}</b>
        ${lessonToText(currentLesson, false)}, dann weiter mit ${lessonToText(nextLesson, true)}.`);
    }
  }
}

async function renameCalendarMonthYear(): Promise<void> {
  $("#calendar-month-year").text(`${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`);
}

function slideCalendar(direction: "l" | "r", transition: string, slideTime: number): Promise<void> {
  selectedNewDay = false;
  return new Promise<void>(resolve => {
    if (!animations) {
      transition = "";
      slideTime = 0;
    }

    // Get the new content and append it to the new calendar
    updateCalendarWeekContent("#calendar-week-new");

    // Position the calendar left / right of the visible spot
    $(".calendar-week").css("transition", "");
    $("#calendar-week-new").css("transform", `translateX(${direction === "r" ? "100%" : "-100%"})`);
    $("#calendar-week-new").removeClass("d-none");

    // Wait shortly, so the styles can apply
    setTimeout(() => {
      // Slide the old calendar out and the new one in
      $(".calendar-week").css("transition", transition);
      $("#calendar-week-old").css("transform", `translateX(${direction === "r" ? "-100%" : "100%"})`);
      $("#calendar-week-new").css("transform", "translateX(0%)");

      renameCalendarMonthYear();

      // Wait until the calendars finished sliding
      setTimeout(() => {
        // Save the new html in the old calendar
        $("#calendar-week-old").html($("#calendar-week-new").html());

        // Position the old calendar in the visible spot, hide the new calendar
        $(".calendar-week").css("transition", "");
        $("#calendar-week-old").css("transform", "");
        $("#calendar-week-new").addClass("d-none");

        // The calendar isn't moving anymore
        calendarMoving = false;
        resolve();
      }, slideTime);
    }, 20);
    renderEventList();
    renderHomeworkList();
    renderSubstitutionList();
    renderTimetable();
  });
}

export async function init(): Promise<void> {
  return new Promise(res => {
    justCheckedHomeworkId = -1;
    animations = JSON.parse(localStorage.getItem("animations") ?? "true") as boolean;

    $(".calendar-week-move-button").on("click", function () {
      // If the calendar is already moving, stop; else set it moving
      if (calendarMoving) {
        return;
      }
      calendarMoving = true;

      // Save whether the user clicked left or right
      let direction: "l" | "r";
      if ($(this).attr("id") === "calendar-week-r-btn") {
        direction = "r";
      }
      else {
        direction = "l";
      }

      if (calendarMode === "week") {
        if (direction === "r") selectedDate.setDate(selectedDate.getDate() + 7);
        if (direction === "l") selectedDate.setDate(selectedDate.getDate() - 7);
      }
      else {
        if (direction === "r") selectedDate.setMonth(selectedDate.getMonth() + 1);
        if (direction === "l") selectedDate.setMonth(selectedDate.getMonth() - 1);
      }

      slideCalendar(direction, "transform 0.75s ease", 750);
    });

    $(".calendar-month-year-move-button").on("click", function () {
      // If the calendar is already moving, stop; else set it moving
      if (calendarMoving) {
        return;
      }
      calendarMoving = true;

      // Save whether the user clicked left or right
      let direction;
      if ($(this).attr("id") === "calendar-month-year-r-btn") {
        direction = "r";
      }
      else {
        direction = "l";
      }

      if (calendarMode === "week") {
        if (direction === "r") selectedDate.setMonth(selectedDate.getMonth() + 1);
        if (direction === "l") selectedDate.setMonth(selectedDate.getMonth() - 1);
      }
      else {
        if (direction === "r") selectedDate.setFullYear(selectedDate.getFullYear() + 1);
        if (direction === "l") selectedDate.setFullYear(selectedDate.getFullYear() - 1);
      }
      updateCalendarWeekContent("#calendar-week-old");
      renameCalendarMonthYear();
      calendarMoving = false;
    });

    function swipe(): void {
      if (Math.abs(swipeXEnd - swipeXStart) > 50) {
        // If the calendar is already moving, stop; else set it moving
        if (calendarMoving) {
          return;
        }
        calendarMoving = true;

        // Save whether the user swiped left or right
        let direction: "l" | "r";
        if (calendarMode === "week") {
          if (swipeXEnd - swipeXStart < 0) {
            direction = "r";
            selectedDate.setDate(selectedDate.getDate() + 7);
          }
          else {
            direction = "l";
            selectedDate.setDate(selectedDate.getDate() - 7);
          }
        }
        else if (swipeXEnd - swipeXStart < 0) {
          direction = "r";
          selectedDate.setMonth(selectedDate.getMonth() + 1);
        }
        else {
          direction = "l";
          selectedDate.setMonth(selectedDate.getMonth() - 1);
        }

        slideCalendar(direction, "transform 0.75s ease", 750);
      }
    }

    let swipeXStart: number;
    let swipeXEnd: number;
    let swipeYStart: number;
    let swipeYEnd: number;
    $("#calendar-week-wrapper").on("touchstart", ev => {
      swipeXStart = ev.originalEvent?.touches[0].clientX ?? 0;
      swipeYStart = ev.originalEvent?.touches[0].clientY ?? 0;
      swipeXEnd = swipeXStart;
      swipeYEnd = swipeYStart;
    });
    $("#calendar-week-wrapper").on("touchmove", ev => {
      swipeXEnd = ev.originalEvent?.touches[0].clientX ?? 0;
      swipeYEnd = ev.originalEvent?.touches[0].clientY ?? 0;
      if (Math.abs(swipeYEnd - swipeYStart) < Math.abs(swipeXEnd - swipeXStart)) {
        ev.originalEvent?.preventDefault();
      }
    });
    $("#calendar-week-wrapper").on("touchend", () => {
      swipe();
    });

    $("#calendar-week-wrapper").on("mousedown", ev => {
      swipeXStart = ev.originalEvent?.clientX ?? 0;
      swipeXEnd = swipeXStart;
    });
    $("#calendar-week-wrapper").on("mousemove", ev => {
      swipeXEnd = ev.originalEvent?.clientX ?? 0;
    });
    $("#calendar-week-wrapper").on("mouseup", () => {
      swipe();
    });

    $("#calendar-today-btn").on("click", () => {
      if (isSameDay(selectedDate, new Date())) {
        return;
      }
      // If the calendar is already moving, stop; else set it moving
      if (calendarMoving) {
        return;
      }

      selectedDate = new Date();

      updateCalendarWeekContent("#calendar-week-old");
      renameCalendarMonthYear();
      renderEventList();
      renderHomeworkList();
      renderSubstitutionList();
      renderTimetable();
    });

    function updateCalenderMoveButtonAriaLabels(): void {
      if (calendarMode === "week") {
        $("#calendar-month-year-l-btn").attr("aria-label", "Vorheriger Monat");
        $("#calendar-month-year-r-btn").attr("aria-label", "Nächster Monat");
        $("#calendar-week-l-btn").attr("aria-label", "Vorherige Woche");
        $("#calendar-week-r-btn").attr("aria-label", "Nächste Woche");
      }
      else {
        $("#calendar-month-year-l-btn").attr("aria-label", "Vorheriges Jahr");
        $("#calendar-month-year-r-btn").attr("aria-label", "Nächstes Jahr");
        $("#calendar-week-l-btn").attr("aria-label", "Vorheriger Monat");
        $("#calendar-week-r-btn").attr("aria-label", "Nächster Monat");
      }
    }

    calendarMode = localStorage.getItem("calendarMode") ?? "week";
    updateCalenderMoveButtonAriaLabels();
    $(`#calendar-${calendarMode}-btn`).addClass("d-none");

    $("#calendar-month-btn").on("click", () => {
      selectedNewDay = false;
      calendarMode = "month";
      updateCalenderMoveButtonAriaLabels();
      localStorage.setItem("calendarMode", calendarMode);
      $("#calendar-week-btn").removeClass("d-none");
      $("#calendar-month-btn").addClass("d-none");
      updateCalendarWeekContent("#calendar-week-old");
    });

    $("#calendar-week-btn").on("click", () => {
      selectedNewDay = false;
      calendarMode = "week";
      updateCalenderMoveButtonAriaLabels();
      localStorage.setItem("calendarMode", calendarMode);
      $("#calendar-month-btn").removeClass("d-none");
      $("#calendar-week-btn").addClass("d-none");
      updateCalendarWeekContent("#calendar-week-old");
    });

    $("#app").on("click", ".days-overview-day", async function () {
      selectedNewDay = true;
      const day = Number.parseInt($(this).data("day"));
      const newSelectedDate = (await monthDates())[Number.parseInt($(this).data("week"))][day === 0 ? 6 : day - 1];
      if (isSameDay(selectedDate, newSelectedDate)) {
        return;
      }
      selectedDate = newSelectedDate;
      $("#calendar-week-old").find(".days-overview-selected").removeClass("days-overview-selected");
      $(this).addClass("days-overview-selected");
      updateCalendarWeekContent("#calendar-week-old");
      renameCalendarMonthYear();
      renderEventList();
      renderHomeworkList();
      renderSubstitutionList();
      renderTimetable();
    });

    selectedDate = new Date();
    selectedNewDay = false;

    // Save whether the calendar is currently moving (It shouldn't be moved then, as bugs could appear)
    calendarMoving = false;

    // Set the visible content of the calendar to today's week
    updateCalendarWeekContent("#calendar-week-old");

    monthNames = [
      "Januar",
      "Februar",
      "März",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Dezember"
    ];
    renameCalendarMonthYear();

    setInterval(updateTimetableFeedback,  30 * 1000); // Update every 30s

    // Request checking the homework on clicking its checkbox
    $("#app").on("click", ".homework-check", function () {
      const homeworkId = $(this).data("id");
      checkHomework(homeworkId);
    });

    // On changing the filter mode, update the homework list
    $("#filter-homework-mode").on("input", () => {
      renderHomeworkList();
    });

    $("#timetable-mode input").each(function () {
      $(this).on("click", () => {
        updateShownTimetable();
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
    
    res();
  });
}

let justCheckedHomeworkId: number;
let animations: boolean;
let selectedDate: Date;
let selectedNewDay: boolean;
// Save whether the calendar is currently moving (It shouldn't be moved then, as bugs could appear)
let calendarMoving: boolean;
let monthNames: string[];
let calendarMode: string;
// Is a list of the dates (number of day in the month) of the week which is currently selected
const monthDates = createDataAccessor<MonthDates>("monthDates");

(await homeworkData.init()).on("update", renderHomeworkList, {onlyThisSite: true});
(await homeworkCheckedData.init()).on("update", renderHomeworkList, {onlyThisSite: true});
(await subjectData.init()).on("update", renderHomeworkList, {onlyThisSite: true});
(await eventData.init()).on("update", () => {
  renderEventList();
  updateCalendarWeekContent("#calendar-week-old");
  renderTimetable();
}, {onlyThisSite: true});
(await lessonData.init()).on("update", renderTimetable, {onlyThisSite: true});
(await teamsData.init()).on("update", () => {
  renderHomeworkList();
  renderEventList();
  updateCalendarWeekContent("#calendar-week-old");
  renderTimetable();
}, {onlyThisSite: true});
(await joinedTeamsData.init()).on("update", () => {
  renderHomeworkList();
  renderEventList();
  updateCalendarWeekContent("#calendar-week-old");
  renderTimetable();
}, {onlyThisSite: true});
(await substitutionsData.init()).on("update", renderSubstitutionList, {onlyThisSite: true});
(await classSubstitutionsData.init()).on("update", () => {
  renderSubstitutionList();
  renderTimetable();
}, {onlyThisSite: true});

user.on("change", () => {
  if (getSite() === "main") {
    joinedTeamsData.reload({ silent: true });
    homeworkCheckedData.reload({ silent: true });
  }
})

export async function renderAllFn(): Promise<void> {
  await renderHomeworkList();
  await renderEventList();
  await renderSubstitutionList();
  await renderTimetable();
};
