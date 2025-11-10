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
  uploadData,
  createDataAccessor,
  msToDisplayDate
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

  const usedStorage = Number.parseInt(data.usedStorage);
  const totalStorage = Number.parseInt(data.totalStorage);
  const storageUsed = Math.round(usedStorage / totalStorage * 100);
  $("#storage-bar").attr("aria-valuenow", storageUsed).find("div").css("width", storageUsed + "%").text(storageUsed < 5 ? "" : storageUsed + "%")
    .toggleClass("text-bg-success", storageUsed < 75)
    .toggleClass("text-bg-warning", storageUsed >= 75 && storageUsed < 90)
    .toggleClass("text-bg-danger", storageUsed >= 90)
    .end().find("span").text(storageUsed + "%").toggle(storageUsed < 5)
  
  const byteToText = (b: number): string => {
    b /= 1024
    if (b < 100) {
      return Math.round(b * 10) / 10 + "KB"
    }
    else {
    b /= 1024
      if (b < 100) {
        return Math.round(b * 10) / 10 + "MB"
      }
      else {
        return Math.round(b / 1024 * 10) / 10 + "GB"
      }
    }
  }
  $("#storage-description b").eq(0).text(byteToText(usedStorage)).end().eq(1).text(byteToText(totalStorage))

  for (const upload of data.uploads) {
    const uploadId = upload.uploadId;
    const uploadType = upload.uploadType;
    const name = upload.uploadName;
    const author = upload.accountName;
    const numberFiles = upload.filesCount;
    const fileIcon = {
      INFO_SHEET: `<span class="fa-stack fs-1 upload-icon-stack" aria-hidden="true">
        <i class="far fa-file fa-stack-1x"></i>
        <i class="fas fa-info fa-stack-1x"></i>
      </span>`,
      LESSON_NOTE: "<i class=\"fs-1 far fa-note-sticky\" aria-hidden='true'></i>",
      WORKSHEET: `<span class="fa-stack fs-1 upload-icon-stack" aria-hidden="true">
        <i class="far fa-file fa-stack-1x"></i>
        <i class="fas fa-question fa-stack-1x"></i>
      </span>`,
      IMAGE: "<i class=\"fs-1 far fa-image\" aria-hidden='true'></i>",
      FILE: "<i class=\"fs-1 far fa-file\" aria-hidden='true'></i>",
      TEXT: "<i class=\"fs-1 far fa-file-lines\" aria-hidden='true'></i>"
    }[uploadType] ?? "";

    const template = $(`
      <div class="col p-2 text-center">
        <div class="mb-2">
          <button class="edit-option btn btn-sm btn-semivisible upload-edit"
            data-id="${uploadId}" aria-label="Bearbeiten">
            <i class="fa-solid fa-edit opacity-75" aria-hidden="true"></i>
          </button>
          <button class="edit-option btn btn-sm btn-semivisible upload-delete"
            data-id="${uploadId}" aria-label="Löschen">
            <i class="fa-solid fa-trash opacity-75" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm btn-semivisible upload-copy-link" aria-label="Teilen" data-id="${uploadId}">
            <i class="fa-solid fa-copy opacity-75" aria-hidden="true"></i>
          </button>
        </div>

        <div class="upload-failed">
          <span class="form-text text-danger">
            <i class="fas fa-circle-xmark" aria-hidden="true"></i>
            Hochladen fehlgeschlagen!
          </span>
          <br>
          <button class="btn btn-sm btn-danger fw-bold mt-1 upload-failed-delete" data-id="${uploadId}">Löschen</button>
        </div>

        <div class="upload-processing">
          <span class="form-text text-primary">
            <div class="spinner-border spinner-border-sm" aria-hidden="true"></div>
            Wird hochgeladen...
          </span>
        </div>

        <button class="view-upload btn btn-semivisible text-center mw-100" data-id="${uploadId}">
          ${fileIcon}
          <br>
          <span class="fw-bold word-wrap-break">${escapeHTML(name)}</span>
          <br>
          <span class="badge badge-tertiary rounded-pill"><i class="fas fa-at me-1" aria-hidden="true"></i>${author}</span>
          <span class="badge badge-tertiary rounded-pill"><i class="far fa-file me-1" aria-hidden="true"></i>${numberFiles}</span>
          <span class="badge badge-tertiary rounded-pill">
            <i class="far fa-calendar me-1" aria-hidden="true"></i>${msToDisplayDate(upload.createdAt)}
          </span>
          </div>
        </button>
      </div>
      `);
    template.find(".edit-option").toggle(editEnabled);
    template.find(".upload-failed").toggle(upload.status === "failed");
    template.find(".upload-processing").toggle(["processing", "queued"].includes(upload.status));
    template.find(".view-upload").prop("disabled", upload.status !== "completed");

    // Add this event to the list
    newContent.append(template);
  }

  // If no events match, add an explanation text
  $("#edit-toggle, #edit-toggle-label").toggle($("#upload-list").html() !== "" && (user.permissionLevel ?? 0) >= 1);
  $("#filter-toggle, #filter-toggle ~ label").toggle((await uploadData()).uploads.length > 0);
  if (newContent.html() === "") {
    newContent.html('<div class="text-secondary">Keine Dateien mit diesen Filtern.</div>');
  }
  $("#upload-load-more").toggle((await uploadData()).hasMore)
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
  function showFile(fileId: number): void {
    if (!upload) return;

    const route = `/uploads/${upload.files[fileId].fileMetaDataId}`;
    const mime = upload.files[fileId].mimeType;
    $("#view-upload-first-page-note").toggle(mime == "application/pdf")
    
    const $object = $("#view-upload-object");
    const $newObject = $(`<object id="view-upload-object" class="w-100 border border-secondary ${/iPhone/.test(navigator.userAgent) ? "ios" : ""}">
      <a>Download</a>
    </object>`);
    $newObject.attr("data", route + "?action=preview").attr("type", mime).find("a").attr("href", route + "?action=preview");
    $object.replaceWith($newObject);

    $("#view-upload-nav-info").text(fileId + 1 + "/" + upload.filesCount)
    $("#view-upload-nav-back").prop("disabled", fileId == 0)
    $("#view-upload-nav-next").prop("disabled", upload.filesCount == fileId + 1)

    $("#view-upload-download").attr("href", route + "?action=download")
    $("#view-upload-open").attr("href", route + "?action=preview")
  }

  const upload = (await uploadData()).uploads.find(u => u.uploadId === uploadId);
  if (!upload) return;

  $("#view-upload-modal-label b").text(upload.uploadName);
  $("#view-upload-modal").modal("show");

  let shownFileId = 0;
  showFile(shownFileId);

  $("#view-upload-nav-back").off("click").on("click", () => showFile(--shownFileId))
  $("#view-upload-nav-next").off("click").on("click", () => showFile(++shownFileId))
}

async function copyLinkUpload(uploadId: number) : Promise<void> {
  const $el = $(`.upload-copy-link[data-id=${uploadId}]`)
  try {
    await navigator.clipboard.writeText(location.host + `/uploads?view-upload=` + uploadId);

    $el.prop("disabled", true).html(`<i class="fas fa-check opacity-75" aria-hidden="true"></i>`);

    setTimeout(() => {
      $el.prop("disabled", false).html(`<i class="fas fa-copy opacity-75" aria-hidden="true"></i>`);
    }, 2000);
  }
  catch (err) {
    console.error("Error copying upload link to clipboard:", err);
  }
}

async function editUpload(uploadId: number): Promise<void> {
  //
  // CALLED WHEN THE USER CLICKS THE "EDIT" OPTION OF AN UPLOAD, NOT WHEN USER ACTUALLY EDITS AN UPLOAD
  //

  // Get the data of the upload
  const upload = (await uploadData()).uploads.find(u => u.uploadId === uploadId);
  if (!upload) return;

  // Set the inputs on the already saved information
  $("#edit-upload-name").val(upload.uploadName);
  $("#edit-upload-type").val(upload.uploadType);
  $("#edit-upload-team").val(-1); // TODO: real teamid

  // Enable the actual "edit" button, because all information is given
  $("#edit-upload-button").prop("disabled", false);

  // Show the edit upload modal
  $("#edit-upload-modal").modal("show");

  // Called when the user clicks the "edit" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#edit-upload-button")
    .off("click")
    .on("click", async () => {
      // Save the given information in variables
      const name = $("#edit-upload-name").val();
      const type = $("#edit-upload-type").val();
      const team = $("#edit-upload-team").val();

      const data = {
        uploadId,
        uploadName: name,
        uploadType: type,
        teamId: team
      };
      // Save whether the server has responed
      let hasResponded = false;

      // Post the request
      $.ajax({
        url: "/uploads/edit",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(data),
        headers: {
          "X-CSRF-Token": await csrfToken()
        },
        success: () => {
          // Show a success notification
          $("#edit-upload-success-toast").toast("show");
          $("#edit-upload-modal").modal("hide");
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

function deleteUpload(uploadId: number, force?: boolean): void {
  async function deleteConfirmed() {
    // Hide the confirmation toast
    $("#delete-upload-confirm-toast").toast("hide");

    const data = {
      uploadId: uploadId
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url: "/uploads/delete",
      type: "POST",
      data: data,
      headers: {
        "X-CSRF-Token": await csrfToken()
      },
      success: () => {
        // Show a success notification
        $("#delete-upload-success-toast").toast("show");
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
  }

  //
  // CALLED WHEN THE USER CLICKS THE "DELETE" OPTION OF AN UPLOAD, NOT WHEN USER ACTUALLY DELETES AN UPLOAD
  //

  if (force) deleteConfirmed()
  else {
    // Show a confirmation notification
    $("#delete-upload-confirm-toast").toast("show");

    // Called when the user clicks the "confirm" button in the notification
    // Note: .off("click") removes the existing click event listener from a previous call of this function
    $("#delete-upload-confirm-toast-button")
      .off("click")
      .on("click", deleteConfirmed);
  }
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
      const urlParams = new URLSearchParams(globalThis.location.search);

      if (urlParams.get("view-upload")) {
        viewUpload(Number.parseInt(urlParams.get("view-upload") ?? ""))
      }

      if (!/iPhone/.test(navigator.userAgent)) {
        $("#view-upload-first-page-note").remove()
      }

      $("#upload-load-more-btn").on("click", () => {
        showAllUploads(true);
        uploadData.reload();
        updateUploadList();
      })

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

      // Copy the upload link on clicking its copy link icon
      $(document).on("click", ".upload-copy-link", function () {
        copyLinkUpload($(this).data("id"));
      });

      // Request deleting the upload on clicking its delete icon
      $(document).on("click", ".upload-delete", function () {
        deleteUpload($(this).data("id"));
      });
      $(document).on("click", ".upload-failed-delete", function () {
        deleteUpload($(this).data("id"), true);
      });

      // Request editing the upload on clicking its edit icon
      $(document).on("click", ".upload-edit", function () {
        editUpload($(this).data("id"));
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
    
    socket.on("updateUploads", () => {
      try {
        uploadData.reload();

        updateUploadList();
      }
      catch (error) {
        console.error("Error handling updateUploads:", error);
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

export const showAllUploads = createDataAccessor<boolean>("showAllUploads");
showAllUploads(false)
