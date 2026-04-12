import {
  dateToMs,
  eventData,
  eventTypeData,
  isSameDay,
  joinedTeamsData,
  getDisplayDate,
  msToInputDate,
  teamsData,
  lessonData,
  escapeHTML,
  dateDaysDifference,
  onlyThisSite,
  ajax,
  user,
  checkTeamInputForSuspicious,
  getInputValue
} from "../../global/global.js";
import { EventData, SingleEventData } from "../../global/types";
import { richTextToHtml, richTextToPlainText } from "../../snippets/richTextarea/richTextarea.js";
import { SearchBox } from "../../snippets/richInput/richInput.js";

async function renderEventList(): Promise<void> {
  async function getFilteredData(): Promise<EventData> {
    // Get the event data
    let data = await eventData();
    
    const pinned = data.filter(e => e.isPinned);
    data = data.filter(e => ! e.isPinned);
    // Filter by min. date
    const filterDateMin = Date.parse($("#filter-date-from").val()?.toString() ?? "");
    if (! Number.isNaN(filterDateMin)) {
      data = data.filter(e => filterDateMin <= Number.parseInt(e.endDate ?? e.startDate) || isSameDay(filterDateMin, e.endDate ?? e.startDate));
    }
    // Filter by max. date
    const filterDateMax = Date.parse($("#filter-date-until").val()?.toString() ?? "");
    if (! Number.isNaN(filterDateMax)) {
      data = data.filter(e => filterDateMax >= Number.parseInt(e.startDate) || isSameDay(filterDateMax, e.startDate));
    }
    // Filter by search
    const sb = ($("#search-events")[0] as SearchBox);
    data = data.filter(e => sb.searchMatches(e.name, richTextToPlainText(e.description ?? "")));
    // Filter by type
    data = data.filter(e => $(`#filter-type-${e.eventTypeId}`).prop("checked"));
    // Filter by team
    const currentJoinedTeamsData = await joinedTeamsData();
    data = data.filter(e => currentJoinedTeamsData.includes(e.teamId) || e.teamId === -1);

    data = pinned.concat(data);
    
    return data;
  }

  const newGalleryContent = $("<div></div>");
  const newTableContent = $("<div></div>");
  let showMoreButtonElements: JQuery<HTMLElement> = $();

  // Check if user is in edit mode
  const editEnabled = $("#edit-toggle").is(":checked");
  const editAllowed = user.permissionLevel >= 1;

  const data = await getFilteredData();

  for (const event of data) {
    const eventId = event.eventId;
    const eventTypeId = event.eventTypeId;
    const name = event.name;
    const description = event.description;
    const startDate = getDisplayDate(event.startDate);
    const lesson = event.lesson;

    const timeSpan = $("<span></span>");
    if (event.endDate !== null) {
      const endDate = getDisplayDate(event.endDate);
      if (isSameDay(event.startDate, event.endDate)) {
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
    // The template for an event with edit options
    const galleryTemplate = $(`
      <div class="col pb-3 px-2">
        <div class="card event-${eventTypeId} h-100">
          <div class="card-body p-2">
            <div class="d-flex justify-content-between">
              <div style="min-width: 0;">
                <span class="fw-bold event-${eventTypeId} event-title">${escapeHTML(name)}</span>
                <br>
                <span>${timeSpan.html()}</span>
              </div>
              <div>
                <div class="d-flex flex-nowrap">
                  <button class="edit-option btn btn-sm btn-semivisible event-edit"
                    data-id="${eventId}" aria-label="Bearbeiten">
                    <i class="fa-solid fa-edit event-${eventTypeId} opacity-75" aria-hidden="true"></i>
                  </button>
                  <button class="edit-option btn btn-sm btn-semivisible event-delete"
                    data-id="${eventId}" aria-label="Löschen">
                    <i class="fa-solid fa-trash event-${eventTypeId} opacity-75" aria-hidden="true"></i>
                  </button>
                </div>
                <div class="d-flex flex-nowrap justify-content-end">
                  <button class="btn btn-sm btn-semivisible event-share" data-id="${eventId}" aria-label="Teilen">
                    <i class="fa-solid fa-share-from-square event-${eventTypeId} opacity-75" aria-hidden="true"></i>
                  </button>
                  <button class="btn btn-sm btn-semivisible event-pin" data-id="${eventId}" aria-label="Anheften">
                    <i class="fa-solid fa-thumbtack${event.isPinned ? "-slash" : ""} event-${eventTypeId} opacity-75" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>
            <div class="event-description"></div>
          </div>
        </div>
      </div>
      `);
    galleryTemplate.find(".event-pin").toggle(event.isPinned || user.permissionLevel >= 1);
    galleryTemplate.find(".edit-option").toggle(editEnabled);

    const tableTemplate = $(`
      <tr>
        <td class="text-nowrap"><div class="color-display event-${eventTypeId}"></div></td>
        <td class="text-break">
          <span class="fw-bold event-${eventTypeId}">${escapeHTML(name)}</span>
          <br>
          <span class="badge badge-tertiary rounded-pill border"><i class="far fa-calendar me-1" aria-hidden="true"></i>${timeSpan.html()}</span>
        </td>
        <td class="text-break"><div class="event-description"></div></td>
        <td class="text-nowrap">
          <div class="d-flex flex-nowrap">
            <button class="edit-option btn btn-sm btn-semivisible event-edit" data-id="${eventId}" aria-label="Bearbeiten">
              <i class="fa-solid fa-edit event-${eventTypeId} opacity-75" aria-hidden="true"></i>
            </button>
            <button class="edit-option btn btn-sm btn-semivisible event-delete" data-id="${eventId}" aria-label="Löschen">
              <i class="fa-solid fa-trash event-${eventTypeId} opacity-75" aria-hidden="true"></i>
            </button>
            <button class="btn btn-sm btn-semivisible event-share" data-id="${eventId}" aria-label="Teilen">
              <i class="fa-solid fa-share-from-square event-${eventTypeId} opacity-75" aria-hidden="true"></i>
            </button>
            <button class="btn btn-sm btn-semivisible event-pin" data-id="${eventId}" aria-label="Anheften">
              <i class="fa-solid fa-thumbtack${event.isPinned ? "-slash" : ""} event-${eventTypeId} opacity-75" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>
    `);
    tableTemplate.find(".event-pin").toggle(event.isPinned || user.permissionLevel >= 1);
    tableTemplate.find(".edit-option").toggle(editAllowed);

    const templates = galleryTemplate.add(tableTemplate);

    // Add this event to the list
    newGalleryContent.append(galleryTemplate);
    newTableContent.append(tableTemplate);

    richTextToHtml(description, galleryTemplate.find(".event-description"), {
      showMoreButton: true,
      showMoreButtonChange: b => b.addClass("event-" + eventTypeId),
      parseLinks: true,
      merge: true
    });

    richTextToHtml(description, tableTemplate.find(".event-description"), {
      showMoreButton: true,
      showMoreButtonChange: b => b.addClass("event-" + eventTypeId),
      parseLinks: true,
      merge: true
    });

    showMoreButtonElements = showMoreButtonElements.add(templates.find(".event-description"));
  }

  newTableContent.children().last().find("td").addClass("border-bottom-0");

  // If no events match, add an explanation text
  $("#edit-toggle, #edit-toggle-label").prop("disabled", data.length === 0 || user.permissionLevel === 0);
  $("#no-events-found").toggle(data.length === 0);
  $("#event-gallery").empty().append(newGalleryContent.children()).toggleClass("d-none", data.length === 0);
  $("#event-table-body").empty().append(newTableContent.children());
  $("#event-table").toggleClass("d-none", data.length === 0);
  showMoreButtonElements.trigger("addedToDom");
};

async function renderEventTypeList(): Promise<void> {
  const currentEventTypeData = await eventTypeData();

  const addEventTypeVal = $("#add-event-type").val() ?? "";
  const editEventTypeVal = $("#edit-event-type").val() ?? "";
  // Clear the select element in the add & edit event modal
  $("#add-event-type, #edit-event-type").html('<option value="" disabled selected>Art</option>');
  // Clear the list for filtering by type
  $("#filter-type-list").empty();

  const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
  filterData.type ??= {};

  for (const eventType of currentEventTypeData) {
    // Get the event type data
    const eventTypeId = eventType.eventTypeId;
    const eventTypeName = escapeHTML(eventType.name);

    filterData.type[eventTypeId] ??= true;
    const checkedStatus = filterData.type[eventTypeId] ? "checked" : "";
    if (checkedStatus !== "checked") $("#filter-changed").show();

    // Add the template for filtering by type
    const templateFilterType = `
      <label class="form-check flex-grow-1 text-center mb-0 ps-2rem pe-2 py-1 border rounded bg-body-tertiary">
        <input type="checkbox" class="form-check-input filter-type-option me-2"
          id="filter-type-${eventTypeId}" data-id="${eventTypeId}" ${checkedStatus}>
        ${eventTypeName}
      </label>
      `;
    $("#filter-type-list").append(templateFilterType);

    // Add the template for the select elements
    $("#add-event-type, #edit-event-type").append(`<option value="${eventTypeId}">${eventTypeName}</option>`);
  };

  if (addEventTypeVal !== "") $("#add-event-type").val(addEventTypeVal);
  if (editEventTypeVal !== "") $("#edit-event-type").val(editEventTypeVal);

  localStorage.setItem("eventFilter", JSON.stringify(filterData));

  $("#add-event-no-types").toggleClass("d-none", currentEventTypeData.length !== 0).find("b").text(
    user.permissionLevel < 3 ?
      "Bitte einen Admin / ein:e Manager:in, welche hinzuzufügen!" :
      "Füge in den Einstellungen unter \"Klasse\" > \"Ereignisarten\" welche hinzu!"
  );
};

async function renderTeamList(): Promise<void> {
  const addEventTeamVal = $("#add-event-team").val() ?? "-1";
  const editEventTeamVal = $("#edit-event-team").val() ?? "-1";

  // Clear the select element in the add & edit event modal
  $("#add-event-team, #edit-event-team").html('<option value="-1" selected>Alle</option>');

  for (const team of (await teamsData())) {
    // Add the template for the select elements
    $("#add-event-team, #edit-event-team").append(`<option value="${team.teamId}">${escapeHTML(team.name)}</option>`);
  }

  $("#add-event-team").val(addEventTeamVal);
  $("#edit-event-team").val(editEventTeamVal);
};

function addEvent(): void {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS AN EVENT
  //

  // Reset the data inputs in the add event modal
  $("#add-event-type").val("");
  $("#add-event-name").val("");
  $("#add-event-description").val("");
  $("#add-event-description").trigger("change");
  $("#add-event-start-date").val("").removeClass("is-suspicious");
  $("#add-event-lesson").val("");
  $("#add-event-end-date").val("").removeClass("is-suspicious is-invalid");
  $("#add-event-team").val("-1").removeClass("is-suspicious");

  // Disable the actual "add" button, because not all information is given
  $("#add-event-button").prop("disabled", true);

  // Show the add event modal
  $("#add-event-modal").modal("show");

  // Called when the user clicks the "add" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#add-event-button").off("click").on("click", async () => {
    // Save the given information in variables
    const eventTypeId = $("#add-event-type").val();
    const name = $("#add-event-name").val()?.toString().trim();
    const description = $("#add-event-description").val()?.toString().trim();
    const startDate = $("#add-event-start-date").val()?.toString() ?? "";
    const lesson = $("#add-event-lesson").val()?.toString().trim();
    const endDate = $("#add-event-end-date").val()?.toString() ?? "";
    const teamId = $("#add-event-team").val();

    await ajax("POST", "/api/events", {
      body: {
        eventTypeId,
        name,
        description,
        startDate: dateToMs(startDate),
        lesson,
        endDate: dateToMs(endDate) ?? null,
        teamId
      },
      queueable: true
    });

    $("#add-event-success-toast").toast("show");
    $("#add-event-modal").modal("hide");
  });
}

async function shareEvent(eventId: number): Promise<void> {
  async function parseLessonEvent(event: SingleEventData, lesson: string): Promise<void> {
    async function findLessonWithLessonNumber(lessonNumber: number):
      Promise< {
        lessonId: number;
        lessonNumber: number;
        weekDay: 0 | 1 | 2 | 3 | 4;
        teamId: number;
        subjectId: number;
        room: string;
        startTime: string;
        endTime: string;
      } | undefined > {
      return (await lessonData()).find(lesson =>
        lesson.lessonNumber === lessonNumber
        && (lesson.teamId === -1 || currentJoinedTeamsData.includes(lesson.teamId))
        && lesson.weekDay === start.getDay() - 1
      );
    }
    const start = new Date(Number.parseInt(event.startDate));
    const end = new Date(Number.parseInt(event.startDate));
    const currentJoinedTeamsData = (await joinedTeamsData());
    
    let startLesson, endLesson;
    if (event.lesson?.includes("-")) {
      event.lesson = event.lesson.replace(" ", "");
      startLesson = await findLessonWithLessonNumber(Number.parseInt(event.lesson.split("-")[0]));
      endLesson = await findLessonWithLessonNumber(Number.parseInt(event.lesson.split("-")[1]));
    }
    else {
      startLesson = endLesson = await findLessonWithLessonNumber(Number.parseInt(lesson));
    }

    if (! (startLesson && endLesson)) {
      throw new Error("startLesson or endLesson is undefined");
    }
    const lessonStart = Number.parseInt(startLesson.startTime) / 1000 / 60;
    start.setHours(Math.trunc(lessonStart / 60), lessonStart % 60);
    
    const lessonEnd = Number.parseInt(endLesson.endTime) / 1000 / 60;
    end.setHours(Math.trunc(lessonEnd / 60), lessonEnd % 60);
    timeContent = `
      DTSTART:${formatDateAndTime(start)}
      DTEND:${formatDateAndTime(end)}
    `;
  }
  const event = (await eventData()).find(e => e.eventId === eventId);
  if (!event) throw new Error("No event with this id found");

  const name = event.name;
  let description = "";
  $(richTextToHtml(event.description ?? "")).each(function () {
    if ($(this).is("br")) {
      description += String.raw`\n`;
    }
    else {
      description += $(this).html();
    }
  });

  const format = (num: number): string => String(num).padStart(2, "0");

  function formatDateAndTime (date: Date): string {
    return date.getUTCFullYear().toString() +
      format(date.getUTCMonth() + 1) +
      format(date.getUTCDate()) + "T" +
      format(date.getUTCHours()) +
      format(date.getUTCMinutes()) +
      format(date.getUTCSeconds()) + "Z";
  };

  function formatDate (date: Date): string {
    return date.getUTCFullYear().toString() +
      format(date.getUTCMonth() + 1) +
      format(date.getUTCDate());
  };

  let timeContent = "";

  if (event.lesson !== null && event.lesson !== "") {
    try {
      await parseLessonEvent(event, event.lesson);
    }
    catch {
      $("#share-event-error-toast").toast("show");
      return;
    }
  }
  else {
    if (event.endDate === null || event.endDate === "") {
      event.endDate = event.startDate;
    }
    const start = new Date(Number.parseInt(event.startDate));
    const end = new Date(Number.parseInt(event.endDate) + 1000 * 60 * 60 * 24);
    timeContent = `
      DTSTART;VALUE=DATE:${formatDate(start)}
      DTEND;VALUE=DATE:${formatDate(end)}
    `;
  }

  const icsContent = `
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//https://taskminder.de
    BEGIN:VEVENT
    UID:event-${eventId}@taskminder.de
    DTSTAMP:${formatDateAndTime(new Date())}
    ${timeContent}
    SUMMARY:${name}
    DESCRIPTION:${description?.replaceAll("\n", String.raw`\n`)}
    END:VEVENT
    END:VCALENDAR
  `.split("\n").map(l => l.trim()).join("\n");

  const blob = new Blob([icsContent], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "event.ics";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  a.remove();
  URL.revokeObjectURL(url);
}

async function pinEvent(eventId: number): Promise<void> {
  const event = (await eventData()).find(e => e.eventId === eventId);
  if (!event) return;

  await ajax("PATCH", `/api/events/${eventId}/pin`, {
    body: {
      pinStatus: !event.isPinned
    },
    queueable: true
  });

  const actionText = event.isPinned ? "losgelöst" : "angeheftet";
  $("#pin-event-success-toast .toast-header b").text(`Erfolgreich ${actionText}`);
  $("#pin-event-success-toast .toast-body").text(`Das Ereignis wurde erfolgreich ${actionText}.`);
  $("#pin-event-success-toast").toast("show");
}

async function editEvent(eventId: number): Promise<void> {
  //
  // CALLED WHEN THE USER CLICKS THE "EDIT" OPTION OF AN EVENT, NOT WHEN USER ACTUALLY EDITS AN EVENT
  //

  // Get the data of the event
  const event = (await eventData()).find(e => e.eventId === eventId);
  if (!event) return;

  // Set the inputs on the already saved information
  $("#edit-event-type").val(event.eventTypeId);
  $("#edit-event-name").val(event.name);
  $("#edit-event-description").val(event.description ?? "");
  $("#edit-event-description").trigger("change");
  $("#edit-event-start-date").val(msToInputDate(event.startDate)).removeClass("is-suspicious");
  $("#edit-event-lesson").val(event.lesson ?? "");
  $("#edit-event-end-date").val(msToInputDate(event.endDate ?? "")).removeClass("is-suspicious is-invalid");
  $("#edit-event-team").val(event.teamId).removeClass("is-suspicious");

  // Enable the actual "edit" button, because all information is given
  $("#edit-event-button").prop("disabled", false);

  // Show the edit event modal
  $("#edit-event-modal").modal("show");

  // Called when the user clicks the "edit" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#edit-event-button")
    .off("click")
    .on("click", async () => {
      // Save the given information in variables
      const eventTypeId = $("#edit-event-type").val();
      const name = $("#edit-event-name").val();
      const description = $("#edit-event-description").val();
      const startDate = $("#edit-event-start-date").val()?.toString() ?? "";
      const lesson = $("#edit-event-lesson").val()?.toString().trim() ?? null;
      const endDate = $("#edit-event-end-date").val()?.toString() ?? "";
      const teamId = $("#edit-event-team").val();

      await ajax("PATCH", `/api/events/${eventId}`, {
        body: {
          eventTypeId,
          name,
          description,
          startDate: dateToMs(startDate),
          lesson,
          endDate: dateToMs(endDate),
          teamId
        },
        queueable: true
      });

      $("#edit-event-success-toast").toast("show");
      $("#edit-event-modal").modal("hide");
    });
}

function deleteEvent(eventId: number): void {
  //
  // CALLED WHEN THE USER CLICKS THE "DELETE" OPTION OF AN EVENT, NOT WHEN USER ACTUALLY DELETES AN EVENT
  //

  // Show a confirmation notification
  $("#delete-event-confirm-toast").toast("show");

  // Called when the user clicks the "confirm" button in the notification
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#delete-event-confirm-toast-button")
    .off("click")
    .on("click", async () => {
      // Hide the confirmation toast
      $("#delete-event-confirm-toast").toast("hide");

      await ajax("DELETE", `/api/events/${eventId}`, {
        queueable: true
      });
      
      $("#delete-event-success-toast").toast("show");
    });
}

async function updateFilters(ingoreEventTypes?: boolean): Promise<void> {
  return new Promise(res => {
    $("#filter-changed").hide();

    const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};

    filterData.dateFromOffset ??= 0;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() + filterData.dateFromOffset);
    $("#filter-date-from").val(msToInputDate(dateFrom.getTime()));
    if (filterData.dateFromOffset !== 0) $("#filter-changed").show();

    filterData.dateUntilOffset ??= 0;
    const dateUntil = new Date();
    dateUntil.setMonth(dateUntil.getMonth() + 1);
    dateUntil.setDate(dateUntil.getDate() + filterData.dateUntilOffset);
    $("#filter-date-until").val(msToInputDate(dateUntil.getTime()));
    if (filterData.dateUntilOffset !== 0) $("#filter-changed").show();

    if (! ingoreEventTypes) {
      renderEventTypeList();
    }
    res();
  });
}

function toggleShownButtons(): void {
  $("#edit-toggle-label").toggle(user.permissionLevel >= 1);
  $("#show-add-event-button").toggle(user.permissionLevel >= 1);
  if (user.permissionLevel < 1) {
    $(".edit-option").addClass("d-none");
  }
}

function toggleView(): void {
  if (view === View.Gallery || globalThis.innerWidth < 768) {
    $("#view-toggle").html("<i class=\"fa-solid fa-table-list\" aria-hidden=\"true\"></i> Tabelle");
    $("#event-gallery").show();
    $("#event-table").hide();
  }
  else {
    $("#view-toggle").html("<i class=\"fa-solid fa-grip\" aria-hidden=\"true\"></i> Galerie");
    $("#event-gallery").hide();
    $("#event-table").show();
  }
  localStorage.setItem("eventView", view);
}

export async function init(): Promise<void> {
  return new Promise(res => {
    $("#edit-toggle").on("change", function () {
      $("#event-gallery .edit-option").toggle($(this).is(":checked"));
    }).prop("checked", false);
    $("#event-gallery .edit-option").hide();

    function appendFilterContent(): void {
      $("#filter-content").appendTo(`#filter-${window.innerWidth >= 768 ? "modal" : "offcanvas"}-body`);
    }

    $("#filter-toggle").on("click", function () {
      appendFilterContent();
      if (window.innerWidth >= 768) $("#filter-modal").modal("show");
      else $("#filter-offcanvas").offcanvas("show");
    });
    appendFilterContent();

    $("#search-toggle").on("change", function () {
      const checked = $(this).is(":checked");
      $("#search-events").toggle(checked);
      if (checked) $("#search-events input").trigger("focus");
      else $("#search-events").val("");
    }).prop("checked", false).trigger("change");

    view = localStorage.getItem("eventView") as View ?? View.Gallery;
    toggleView();
    $("#view-toggle").on("click", () => {
      view = view === View.Gallery ? View.Table : View.Gallery;
      toggleView();
    });

    updateFilters(true);
    $(".filter-reset").on("click", () => {
      localStorage.setItem("eventFilter", "{}");
      updateFilters();
      renderEventList();
    });

    $("#search-events").on("input", renderEventList);

    const checkEndDateAfterStartDate = (addOrEdit: "add" | "edit"): void => {
      const start = getInputValue($(`#${addOrEdit}-event-start-date`));
      const end = getInputValue($(`#${addOrEdit}-event-end-date`));
      if (start === "" || end === "") return;
      $(`#${addOrEdit}-event-end-date`).toggleClass("is-invalid", new Date(start).getTime() > new Date(end).getTime());
    };

    function startDateInputCallback(this: HTMLElement, addOrEdit: "add" | "edit"): void {
      checkEndDateAfterStartDate(addOrEdit);
    }

    function endDateInputCallback(this: HTMLElement, addOrEdit: "add" | "edit"): void {
      const val = getInputValue($(this));
      if (val === "") {
        $(this).removeClass("is-suspicious");
        return;
      }

      checkEndDateAfterStartDate(addOrEdit);

      const date = new Date(val);
      const now = new Date();

      $(this).toggleClass("is-suspicious", date.getTime() < now.getTime() && !isSameDay(date, now));
    }
    
    $("#add-event-start-date").on("input autocomplete", function () {
      startDateInputCallback.call(this, "add");
    });
    $("#add-event-end-date").on("input autocomplete", function () {
      endDateInputCallback.call(this, "add");
    });
    $("#add-event-team").on("input autocomplete", checkTeamInputForSuspicious);

    // On changing any information in the add event modal, disable the add button if any information is empty
    $(".add-event-input").on("input", function () {
      console.log("Input");
      const type = $("#add-event-type").val();
      const name = $("#add-event-name").val()?.toString().trim();
      const startDate = $("#add-event-start-date").val();

      $("#add-event-button").prop("disabled", [name, startDate].includes("") || type === null || $("#add-event-end-date").hasClass("is-invalid"));

      if ($(this).is("#add-event-end-date")) {
        $("#add-event-lesson").val("");
      }
      if ($(this).is("#add-event-lesson")) {
        $("#add-event-end-date").val("");
      }
    });
    
    $("#edit-event-start-date").on("input autocomplete", function () {
      startDateInputCallback.call(this, "edit");
    });
    $("#edit-event-end-date").on("input autocomplete", function () {
      endDateInputCallback.call(this, "edit");
    });
    $("#edit-event-team").on("input autocomplete", checkTeamInputForSuspicious);

    // On changing any information in the edit event modal, disable the edit button if any information is empty
    $(".edit-event-input").on("input change", function () {
      const type = $("#edit-event-type").val();
      const name = $("#edit-event-name").val()?.toString().trim();
      const startDate = $("#edit-event-start-date").val();

      $("#edit-event-button").prop("disabled", [name, startDate].includes("") || type === null || $("#edit-event-end-date").hasClass("is-invalid"));

      if ($(this).is("#edit-event-end-date")) {
        $("#edit-event-lesson").val("");
      }
      if ($(this).is("#edit-event-lesson")) {
        $("#edit-event-end-date").val("");
      }
    });

    // Share the event on clicking its share icon
    $("#app").on("click", ".event-share", function () {
      shareEvent($(this).data("id"));
    });

    // Pin the event on clicking its pin icon
    $("#app").on("click", ".event-pin", function () {
      pinEvent($(this).data("id"));
    });

    // Request deleting the event on clicking its delete icon
    $("#app").on("click", ".event-delete", function () {
      deleteEvent($(this).data("id"));
    });

    // Request editing the event on clicking its edit icon
    $("#app").on("click", ".event-edit", function () {
      editEvent($(this).data("id"));
    });

    // On clicking the all types option, check all and update the event list
    $("#filter-type-all").on("click", () => {
      const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
      $(".filter-type-option").prop("checked", true);
      $(".filter-type-option").each(function () {
        filterData.type[$(this).data("id")] = true;
      });
      localStorage.setItem("eventFilter", JSON.stringify(filterData));
      updateFilters();
      renderEventList();
    });

    // On clicking the none types option, uncheck all and update the event list
    $("#filter-type-none").on("click", () => {
      const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
      $(".filter-type-option").prop("checked", false);
      $(".filter-type-option").each(function () {
        filterData.type[$(this).data("id")] = false;
      });
      localStorage.setItem("eventFilter", JSON.stringify(filterData));
      updateFilters();
      renderEventList();
    });

    // If any type filter gets changed, update the shown events
    $("#app").on("change", ".filter-type-option", function () {
      renderEventList();
      const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
      filterData.type ??= {};
      filterData.type[$(this).data("id")] = $(this).prop("checked");
      localStorage.setItem("eventFilter", JSON.stringify(filterData));
      updateFilters();
    });

    // On changing any filter date option, update the event list
    $("#filter-date-from").on("change", function () {
      const selectedDate = new Date($(this).val()?.toString() ?? "");
      const normalDate = new Date();
      const diff = dateDaysDifference(selectedDate, normalDate);

      const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
      filterData.dateFromOffset = Number.isNaN(diff) ? "NaN" : diff;
      localStorage.setItem("eventFilter", JSON.stringify(filterData));

      updateFilters();
      renderEventList();
    });

    // On changing any filter date option, update the event list
    $("#filter-date-until").on("change", function () {
      const selectedDate = new Date($(this).val()?.toString() ?? "");
      const normalDate = new Date();
      normalDate.setMonth(normalDate.getMonth() + 1);
      const diff = dateDaysDifference(selectedDate, normalDate);

      const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
      filterData.dateUntilOffset = Number.isNaN(diff) ? "NaN" : diff;
      localStorage.setItem("eventFilter", JSON.stringify(filterData));
      
      updateFilters();
      renderEventList();
    });

    const $filterOffcanvas = $("#filter-offcanvas");
    const $filterOffcanvasHeader = $("#filter-offcanvas .offcanvas-header");

    let startY = 0;
    let dragging = false;

    $filterOffcanvasHeader.on("pointerdown", ev => {
      if (ev.pointerType !== "touch") return;
      startY = ev.clientY ?? 0;
      dragging = true;
      $filterOffcanvas.css("transition", "none");
    });
    $filterOffcanvasHeader.on("pointermove", ev => {
      if (!dragging) return;
      const diff = (ev.clientY ?? 0) - startY;
      if (diff > 0) {
        $filterOffcanvas.css("transform", `translateY(${diff}px)`);
      }
    });
    $filterOffcanvasHeader.on("pointerup pointercancel", ev => {
      if (!dragging) return;
      dragging = false;
      const diff = (ev.clientY ?? 0) - startY;

      $filterOffcanvas.css({transition: "transform 0.3s ease-in-out", transform: ""});
      if (diff > 100) {
        $filterOffcanvas.offcanvas("hide");
      }
    });

    $("#app").on("click", "#show-add-event-button", () => {
      addEvent();
    });
    res();
  });
}

enum View {
  Gallery = "gallery",
  Table = "table"
}
let view: View;

$(globalThis).on("resize", toggleView);

(await eventData.init()).on("update", onlyThisSite(renderEventList));
(await eventTypeData.init()).on("update", onlyThisSite(renderEventTypeList));
(await teamsData.init()).on("update", onlyThisSite(() => {
  renderTeamList();
  renderEventList(); 
}));

(await joinedTeamsData.init()).on("update", onlyThisSite(renderEventList));

export async function renderAllFn(): Promise<void> {
  await renderEventTypeList();
  await renderEventList();
  await renderTeamList();

  toggleShownButtons();
};
