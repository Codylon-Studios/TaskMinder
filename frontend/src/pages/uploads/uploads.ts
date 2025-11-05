import {
  dateToMs,
  eventData,
  eventTypeData,
  joinedTeamsData,
  msToInputDate,
  teamsData,
  socket,
  csrfToken,
  lessonData,
  escapeHTML,
  dateDaysDifference,
  uploadData
} from "../../global/global.js";
import { EventData, SingleEventData } from "../../global/types";
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js";
import { richTextToHtml } from "../../snippets/richTextarea/richTextarea.js";

async function updateUploadList(): Promise<void> {
  async function getFilteredData(): Promise<EventData> {
    // Get the event data
    let data = await eventData();
    // Filter by min. date
    const filterDateMin = Date.parse($("#filter-date-from").val()?.toString() ?? "");
    if (! Number.isNaN(filterDateMin)) {
      data = data.filter(e => filterDateMin <= Number.parseInt(e.endDate ?? e.startDate));
    }
    // Filter by max. date
    const filterDateMax = Date.parse($("#filter-date-until").val()?.toString() ?? "");
    if (! Number.isNaN(filterDateMax)) {
      data = data.filter(e => filterDateMax >= Number.parseInt(e.startDate));
    }
    // Filter by type
    data = data.filter(e => $(`#filter-type-${e.eventTypeId}`).prop("checked"));
    // Filter by team
    const currentJoinedTeamsData = await joinedTeamsData();
    data = data.filter(e => currentJoinedTeamsData.includes(e.teamId) || e.teamId === -1);
    
    return data;
  }

  const newContent = $("<div></div>");

  // Check if user is in edit mode
  const editEnabled = $("#edit-toggle").is(":checked");

  const data = await uploadData(); // TODO @a26b25c24: await getFilteredData();

  for (const upload of data.uploads) {
    const uploadId = upload.uploadId;
    const uploadType = upload.uploadType;
    const name = upload.uploadName;
    const author = upload.accountName;
    const numberFiles = upload.filesCount;
    const fileIcon = {
      INFO_SHEET: `<span class="fa-stack fs-1 upload-icon-stack">
        <i class="far fa-file fa-stack-1x"></i>
        <i class="fas fa-info fa-stack-1x"></i>
      </span>`,
      LESSON_NOTE: "<i class=\"fs-1 far fa-note-sticky\"></i>",
      WORKSHEET: `<span class="fa-stack fs-1 upload-icon-stack">
        <i class="far fa-file fa-stack-1x"></i>
        <i class="fas fa-question fa-stack-1x"></i>
      </span>`,
      IMAGE: "<i class=\"fs-1 far fa-image\"></i>",
      FILE: "<i class=\"fs-1 far fa-file\"></i>",
      TEXT: "<i class=\"fs-1 far fa-file-lines\"></i>"
    }[uploadType] ?? "";

    // The template for an event with edit options
    const template = $(`
      <div class="col p-2 text-center">
        <div class="mb-2">
          <button class="edit-option btn btn-sm btn-semivisible event-edit"
            data-id="${uploadId}" aria-label="Bearbeiten">
            <i class="fa-solid fa-edit opacity-75" aria-hidden="true"></i>
          </button>
          <button class="edit-option btn btn-sm btn-semivisible event-delete"
            data-id="${uploadId}" aria-label="Löschen">
            <i class="fa-solid fa-trash opacity-75" aria-hidden="true"></i>
          </button>
        </div>
        <button class="view-upload btn btn-semivisible text-center mw-100" data-id="${uploadId}">
          ${fileIcon}
          <br>
          <span class="fw-bold word-wrap-break">${escapeHTML(name)}</span>
          <br>
          <span class="badge upload-badge rounded-pill"><i class="fas fa-at me-1" aria-hidden="true"></i>${author}</span>
          <span class="badge upload-badge rounded-pill"><i class="far fa-file me-1" aria-hidden="true"></i>${numberFiles}</span>
          </div>
        </button>
      </div>
      `);
    template.find(".edit-option").toggle(editEnabled);

    // Add this event to the list
    newContent.append(template);
  }

  // If no events match, add an explanation text
  $("#edit-toggle, #edit-toggle-label").toggle($("#upload-list").html() !== "" && (user.permissionLevel ?? 0) >= 1);
  $("#filter-toggle, #filter-toggle ~ label").toggle((await uploadData()).uploads.length > 0);
  if (newContent.html() === "") {
    newContent.html('<div class="text-secondary">Keine Dateien mit diesen Filtern.</div>');
  }
  $("#upload-list").empty().append(newContent.children());
};

async function updateEventTypeList(): Promise<void> {
  const currentEventTypeData = await eventTypeData();

  // Clear the select element in the add event modal
  $("#add-event-type").empty();
  $("#add-event-type").append('<option value="" disabled selected>Art</option>');
  // Clear the select element in the edit event modal
  $("#edit-event-type").empty();
  $("#edit-event-type").append('<option value="" disabled selected>Art</option>');
  // Clear the list for filtering by type
  $("#filter-type-list").empty();

  const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
  filterData.type ??= {};

  for (const eventType of currentEventTypeData) {
    // Get the event type data
    const eventTypeId = eventType.eventTypeId;
    const eventTypeName = eventType.name;

    filterData.type[eventTypeId] ??= true;
    const checkedStatus = filterData.type[eventTypeId] ? "checked" : "";
    if (checkedStatus !== "checked") $("#filter-changed").show();

    // Add the template for filtering by type
    const templateFilterType = `<div class="form-check">
        <input type="checkbox" class="form-check-input filter-type-option" id="filter-type-${eventTypeId}" data-id="${eventTypeId}" ${checkedStatus}>
        <label class="form-check-label" for="filter-type-${eventTypeId}">
          ${escapeHTML(eventTypeName)}
        </label>
      </div>`;
    $("#filter-type-list").append(templateFilterType);

    // Add the template for the select elements
    const templateFormSelect = `<option value="${eventTypeId}">${escapeHTML(eventTypeName)}</option>`;
    $("#add-event-type").append(templateFormSelect);
    $("#edit-event-type").append(templateFormSelect);
  };

  // If any type filter gets changed, update the shown events
  $(".filter-type-option").on("change", function () {
    updateUploadList();
    const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
    filterData.type ??= {};
    filterData.type[$(this).data("id")] = $(this).prop("checked");
    localStorage.setItem("eventFilter", JSON.stringify(filterData));
    updateFilters();
  });

  localStorage.setItem("eventFilter", JSON.stringify(filterData));

  $("#add-event-no-types").toggleClass("d-none", currentEventTypeData.length !== 0).find("b").text(
    (user.permissionLevel ?? 0) < 3 ?
      "Bitte einen Admin / ein:e Manager:in, welche hinzuzufügen!" :
      "Füge in den Einstellungen unter \"Klasse\" > \"Ereignisarten\" welche hinzu!"
  );
};

async function updateTeamList(): Promise<void> {
  // Clear the select element in the add event modal
  $("#add-upload-team").empty();
  $("#add-upload-team").append('<option value="-1" selected>Alle</option>');
  // Clear the select element in the edit event modal
  $("#edit-upload-team").empty();
  $("#edit-upload-team").append('<option value="-1" selected>Alle</option>');

  for (const team of (await teamsData())) {
    // Get the team data
    const teamName = team.name;

    // Add the template for the select elements
    const templateFormSelect = `<option value="${team.teamId}">${escapeHTML(teamName)}</option>`;
    $("#add-upload-team").append(templateFormSelect);
    $("#edit-upload-team").append(templateFormSelect);
  }
};

function addUpload(): void {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS AN UPLOAD
  //

  // Reset the data inputs in the add upload modal
  $("#add-upload-name").val("");
  $("#add-upload-files").val("");
  $("#add-upload-type").val("");
  $("#add-upload-team").val("-1");

  // Disable the actual "add" button, because not all information is given
  $("#add-upload-button").prop("disabled", true);

  // Show the add upload modal
  $("#add-upload-modal").modal("show");

  // Called when the user clicks the "add" button in the modal
  // Note: .off("click") removes the existing click upload listener from a previous call of this function
  $("#add-upload-button")
    .off("click")
    .on("click", async () => {
      // Save the given information in variables
      const name = $("#add-upload-name").val()?.toString().trim() ?? "";
      const type = $("#add-upload-type").val()?.toString() ?? "";
      const files = ($("#add-upload-files")[0] as HTMLInputElement).files ?? [];
      const team = $("#add-upload-team").val()?.toString() ?? "-1";

      // Prepare the POST request
      const data = new FormData();
      data.append("uploadName", name);
      data.append("uploadType", type);
      data.append("teamId", team);
      for (const f of files) {
        data.append("files", f);
      }

      // Save whether the server has responed
      let hasResponded = false;

      // Post the request
      $.ajax({
        url: "/uploads/upload",
        type: "POST",
        data: data,
        processData: false,
        contentType: false,
        headers: {
          "X-CSRF-Token": await csrfToken()
        },
        success: () => {
          // Show a success notification and update the shown uploads
          $("#add-upload-success-toast").toast("show");
          // Hide the add upload modal
          $("#add-upload-modal").modal("hide");
        },
        error: xhr => {
          if (xhr.status === 400) {
            console.log(xhr.responseText);
            if (xhr.responseText === "MIME-Type not supported") {
              $("#add-upload-unsupported-mime-type-toast").toast("show");
            }
          }
          else if (xhr.status === 401) {
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
    });
}

async function viewUpload(uploadId: number): Promise<void> {
  const upload = (await uploadData()).uploads.find(u => u.uploadId === uploadId);
  if (!upload) return;

  $("#view-upload-modal-label b").text(upload.uploadName);
  const route = `/uploads/upload/${upload.files[0].fileMetaDataId}?action=preview`;
  console.log(route);
  const mime = upload.files[0].mimeType;
  
  // Remove the existing object element and create a new one to force reload
  const $object = $("#view-upload-object");
  const $parent = $object.parent();
  $object.remove();
  
  const $newObject = $('<object id="view-upload-object" class="w-100 h-100"><a>Download</a></object>');
  $newObject.attr("data", route).attr("type", mime).find("a").attr("href", route);
  $parent.append($newObject);
  
  $("#view-upload-modal").modal("show");
  $("#pdf-modal").modal("show");
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
  $("#edit-event-start-date").val(msToInputDate(event.startDate));
  $("#edit-event-lesson").val(event.lesson ?? "");
  $("#edit-event-end-date").val(msToInputDate(event.endDate ?? ""));
  $("#edit-event-team").val(event.teamId);

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
      const team = $("#edit-event-team").val();

      const data = {
        eventId: eventId,
        eventTypeId: eventTypeId,
        name: name,
        description: description,
        startDate: dateToMs(startDate),
        lesson: lesson,
        endDate: dateToMs(endDate),
        teamId: team
      };
      // Save whether the server has responed
      let hasResponded = false;

      // Post the request
      $.ajax({
        url: "/events/edit_event",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        headers: {
          "X-CSRF-Token": await csrfToken()
        },
        success: () => {
          // Show a success notification and update the shown events
          $("#edit-event-success-toast").toast("show");
          $("#edit-event-modal").modal("hide");
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
      }, 5000);
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

      const data = {
        eventId: eventId
      };
      // Save whether the server has responed
      let hasResponded = false;

      // Post the request
      $.ajax({
        url: "/events/delete_event",
        type: "POST",
        data: data,
        headers: {
          "X-CSRF-Token": await csrfToken()
        },
        success: () => {
          // Show a success notification and update the shown events
          $("#delete-event-success-toast").toast("show");
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
      }, 5000);
    });
}

function updateFilters(ingoreEventTypes?: boolean): void {
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
    updateEventTypeList();
  }
}

function toggleShownButtons(): void {
  const loggedIn = user.loggedIn;
  $("#edit-toggle-label").toggle((user.permissionLevel ?? 0) >= 1);
  $("#show-add-event-button").toggle((user.permissionLevel ?? 0) >= 1);
  if (!loggedIn) {
    $(".edit-option").addClass("d-none");
  }
}

export async function init(): Promise<void> {
  return new Promise(res => {
    $(async function () {
      $("#edit-toggle").on("click", function () {
        $(".edit-option").toggle($("#edit-toggle").is(":checked"));
      });
      $("#edit-toggle").prop("checked", false);
      $(".edit-option").hide();

      $("#filter-toggle").on("click", function () {
        $("#filter-content, #filter-reset").toggle($("#filter-toggle").is(":checked"));
      });
      $("#filter-toggle").prop("checked", false);
      $("#filter-content, #filter-reset").hide();

      if (!localStorage.getItem("eventFilter")) {
        localStorage.setItem("eventFilter", "{}");
      }
      updateFilters(true);
      $("#filter-reset").on("click", () => {
        localStorage.setItem("eventFilter", "{}");
        updateFilters();
        updateUploadList();
      });

      // On changing any information in the add upload modal, disable the add button if any information is empty
      $(".add-upload-input").on("input", function () {
        const name = $("#add-upload-name").val()?.toString().trim();
        const type = $("#add-upload-type").val();
        const files = ($("#add-upload-files")[0] as HTMLInputElement).files ?? [];

        if (name === "" || type === null || files.length === 0) {
          $("#add-upload-button").prop("disabled", true);
        }
        else {
          $("#add-upload-button").prop("disabled", false);
        }
      });

      // On changing any information in the edit event modal, disable the edit button if any information is empty
      $(".edit-event-input").on("input", function () {
        const type = $("#edit-event-type").val();
        const name = $("#edit-event-name").val()?.toString().trim();
        const startDate = $("#edit-event-start-date").val();

        if ([name, startDate].includes("") || type === null) {
          $("#edit-event-button").prop("disabled", true);
        }
        else {
          $("#edit-event-button").prop("disabled", false);
        }

        if ($(this).is("#edit-event-end-date")) {
          $("#edit-event-lesson").val("");
        }
        if ($(this).is("#edit-event-lesson")) {
          $("#edit-event-end-date").val("");
        }
      });

      // Don't close the dropdown when the user clicked inside of it
      $(".dropdown-menu").each(function () {
        $(this).on("click", ev => {
          ev.stopPropagation();
        });
      });

      // View the upload on clicking it
      $(document).on("click", ".view-upload", function () {
        viewUpload($(this).data("id"));
      });

      // Share the event on clicking its share icon
      $(document).on("click", ".event-share", function () {
        shareEvent($(this).data("id"));
      });

      // Request deleting the event on clicking its delete icon
      $(document).on("click", ".event-delete", function () {
        deleteEvent($(this).data("id"));
      });

      // Request editing the event on clicking its edit icon
      $(document).on("click", ".event-edit", function () {
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
        updateUploadList();
      });

      // On clicking the none types option, uncheck all and update the event list
      $("#filter-type-none").on("click", () => {
        const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
        filterData.type ??= {};
        $(".filter-type-option").prop("checked", false);
        $(".filter-type-option").each(function () {
          filterData.type[$(this).data("id")] = false;
        });
        localStorage.setItem("eventFilter", JSON.stringify(filterData));
        updateFilters();
        updateUploadList();
      });

      // On changing any filter date option, update the event list
      $("#filter-date-from").on("change", function () {
        const selectedDate = new Date($(this).val()?.toString() ?? "");
        const normalDate = new Date();
        const diff = dateDaysDifference(selectedDate, normalDate);

        const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
        filterData.dateFromOffset = diff;
        localStorage.setItem("eventFilter", JSON.stringify(filterData));

        updateFilters();
        updateUploadList();
      });

      // On changing any filter date option, update the event list
      $("#filter-date-until").on("change", function () {
        const selectedDate = new Date($(this).val()?.toString() ?? "");
        const normalDate = new Date();
        normalDate.setMonth(normalDate.getMonth() + 1);
        const diff = dateDaysDifference(selectedDate, normalDate);

        const filterData = JSON.parse(localStorage.getItem("eventFilter") ?? "{}") ?? {};
        filterData.dateUntilOffset = diff;
        localStorage.setItem("eventFilter", JSON.stringify(filterData));
        
        updateFilters();
        updateUploadList();
      });

      $(document).on("click", "#show-add-upload-button", addUpload);
    });

    socket.on("updateEventData", () => {
      try {
        eventData.reload();
        updateUploadList();
      }
      catch (error) {
        console.error("Error handling updateEventData:", error);
      }
    });

    res();
  });
}

export const reloadAllFn = async (): Promise<void> => {
  eventData.reload();
  eventTypeData.reload();
  joinedTeamsData.reload();
  teamsData.reload();
  lessonData.reload();
  uploadData.reload();
  await updateEventTypeList();
  await updateUploadList();
  await updateTeamList();

  toggleShownButtons();
};
