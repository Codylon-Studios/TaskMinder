import {
  joinedTeamsData,
  msToInputDate,
  teamsData,
  escapeHTML,
  dateDaysDifference,
  uploadData,
  getDisplayDate,
  getSimpleDisplayDate,
  onlyThisSite,
  isSameDay,
  ajax,
  uploadRequestsData,
  bootstrap,
  user,
  forceAutocomplete,
  bytesToText,
  getCurrentLesson,
  checkTeamInputForSuspicious,
  isIOS
} from "../../global/global.js";
import { AjaxError, SingleUploadData } from "../../global/types";
import { richTextToHtml, richTextToPlainText } from "../../snippets/richTextarea/richTextarea.js";
import { FileInput, SearchBox } from "../../snippets/richInput/richInput.js";

async function renderUploadList(): Promise<void> {
  async function getFilteredData(): Promise<SingleUploadData[]> {
    // Get the upload data
    let data = (await uploadData()).uploads;

    const pinned = data.filter(u => u.isPinned);
    data = data.filter(u => ! u.isPinned);
    // Filter by min. date
    const filterDateMin = Date.parse($("#filter-date-from").val()?.toString() ?? "");
    if (! Number.isNaN(filterDateMin)) {
      data = data.filter(u => filterDateMin <= Number.parseInt(u.createdAt) || isSameDay(filterDateMin, u.createdAt));
    }
    // Filter by max. date
    const filterDateMax = Date.parse($("#filter-date-until").val()?.toString() ?? "");
    if (! Number.isNaN(filterDateMax)) {
      data = data.filter(u => filterDateMax >= Number.parseInt(u.createdAt) || isSameDay(filterDateMax, u.createdAt));
    }
    // Filter by search
    const sb = ($("#search-uploads")[0] as SearchBox);
    data = data.filter(u => sb.searchMatches(u.accountName ?? "", u.uploadName, richTextToPlainText(u.uploadDescription ?? "")));
    // Filter by type
    data = data.filter(u => $(`#filter-type-${u.uploadType}`).prop("checked"));
    // Filter by team
    const currentJoinedTeamsData = await joinedTeamsData();
    data = data.filter(u => currentJoinedTeamsData.includes(u.teamId) || u.teamId === -1);

    data = pinned.concat(data);

    return data;
  }

  const newGalleryContent = $("<div></div>");
  const newTableContent = $("<div></div>");

  // Check if user is in edit mode
  const editEnabled = $("#edit-toggle").is(":checked");
  const editAllowed = user.permissionLevel >= 1;

  const currentUploadData = await uploadData();
  const data = await getFilteredData();

  const usedStorage = Number.parseInt(currentUploadData.usedStorage);
  const totalStorage = Number.parseInt(currentUploadData.totalStorage);
  const storageUsed = Math.round(usedStorage / totalStorage * 100);
  $("#storage-bar").attr("aria-valuenow", storageUsed).find("div").css("width", storageUsed + "%").text(storageUsed < 5 ? "" : storageUsed + "%")
    .toggleClass("text-bg-success", storageUsed < 75)
    .toggleClass("text-bg-warning", storageUsed >= 75 && storageUsed < 90)
    .toggleClass("text-bg-danger", storageUsed >= 90)
    .end().find("span").text(storageUsed + "%").toggle(storageUsed < 5);
  
  $("#storage-description b").eq(0).text(bytesToText(usedStorage)).end().eq(1).text(bytesToText(totalStorage));
  
  $("#storage-limit-exceeded-toast .toast-body b").text(bytesToText(totalStorage));
  $("file-input").attr("max-size", currentUploadData.sizeLimitPerFile);
  $("#file-limit-exceeded-toast .toast-body b").text(currentUploadData.maxFilesPerClass);

  for (const upload of data) {
    const uploadId = upload.uploadId;
    const uploadType = upload.uploadType;
    const name = upload.uploadName;
    const author = upload.accountName ? escapeHTML(upload.accountName) : "<i>Unbekannt</i>";
    const numberFiles = upload.filesCount;
    const fileIconLarge = {
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

    const fileIconSmall = {
      INFO_SHEET: `<span class="fa-stack fs-3 w-75 upload-icon-stack" aria-hidden="true">
        <i class="far fa-file fa-stack-1x"></i>
        <i class="fas fa-info fa-stack-1x"></i>
      </span>`,
      LESSON_NOTE: "<i class=\"fs-3 far fa-note-sticky\" aria-hidden='true'></i>",
      WORKSHEET: `<span class="fa-stack fs-3 w-75 upload-icon-stack" aria-hidden="true">
        <i class="far fa-file fa-stack-1x"></i>
        <i class="fas fa-question fa-stack-1x"></i>
      </span>`,
      IMAGE: "<i class=\"fs-3 far fa-image\" aria-hidden='true'></i>",
      FILE: "<i class=\"fs-3 far fa-file\" aria-hidden='true'></i>",
      TEXT: "<i class=\"fs-3 far fa-file-lines\" aria-hidden='true'></i>"
    }[uploadType] ?? "";

    const galleryTemplate = $(`
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
          <button class="btn btn-sm btn-semivisible upload-copy-link" aria-label="Link kopieren" data-id="${uploadId}">
            <i class="fa-solid fa-copy opacity-75" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm btn-semivisible upload-pin" data-id="${uploadId}" aria-label="Anheften">
            <i class="fa-solid fa-thumbtack${upload.isPinned ? "-slash" : ""} opacity-75" aria-hidden="true"></i>
          </button>
        </div>

        <div class="upload-failed">
          <span class="form-text text-danger">
            <i class="fas fa-circle-xmark" aria-hidden="true"></i>
            <b>Hochladen fehlgeschlagen!</b>
            <span class="upload-failed-reason"></span>
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
          ${fileIconLarge}
          <br>
          <span class="fw-bold word-wrap-break">${escapeHTML(name)}</span>
          <br>
          <span class="badge badge-tertiary rounded-pill border"><i class="fas fa-at me-1" aria-hidden="true"></i>${author}</span>
          <span class="badge badge-tertiary rounded-pill border"><i class="far fa-file me-1" aria-hidden="true"></i>${numberFiles}</span>
          <span class="badge badge-tertiary rounded-pill border">
            <i class="far fa-calendar me-1" aria-hidden="true"></i>${getDisplayDate(upload.createdAt)}
          </span>
          ${upload.uploadDescription === "" || upload.uploadDescription === null ? ""
    : '<span class="badge badge-tertiary rounded-pill border"><i class="far fa-message me-1" aria-hidden="true"></i>Beschreibung</span>'
}
          </div>
        </button>
      </div>
      `);
    galleryTemplate.find(".upload-pin").toggle(upload.isPinned || user.permissionLevel >= 1);
    galleryTemplate.find(".edit-option").toggle(editEnabled);
    galleryTemplate.find(".upload-failed").toggle(upload.status === "failed");
    galleryTemplate.find(".upload-failed-reason").text({
      "MIME-Type is not supported": "Einer der Dateitypen wird nicht unterstützt!"
    }[upload.errorReason ?? ""] ?? "Ein unbekannter Fehler ist aufgetreten.");
    galleryTemplate.find(".upload-processing").toggle(["processing", "queued"].includes(upload.status));
    galleryTemplate.find(".view-upload").prop("disabled", upload.status !== "completed");

    const tableTemplate = $(`
      <tr>
        <td class="text-nowrap text-center align-middle">
          ${$(fileIconSmall).addClass("cursor-pointer view-upload").attr("data-id", uploadId).prop("outerHTML")}
        </td>
        <td class="text-break">
          <span class="fw-bold cursor-pointer view-upload" data-id="${uploadId}">${escapeHTML(name)}</span>
          <br>
          <span class="badge badge-tertiary rounded-pill border"><i class="fas fa-at me-1" aria-hidden="true"></i>${author}</span>
          ${upload.uploadDescription === "" || upload.uploadDescription === null ? ""
    : '<span class="badge badge-tertiary rounded-pill border"><i class="far fa-message me-1" aria-hidden="true"></i>Beschreibung</span>'
}
          <div class="upload-failed">
            <span class="form-text text-danger">
              <i class="fas fa-circle-xmark" aria-hidden="true"></i>
              <b>Hochladen fehlgeschlagen!</b>
              <span class="upload-failed-reason"></span>
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
        </td>
        <td class="text-nowrap">${getDisplayDate(upload.createdAt)}</td>
        <td>
          <div class="d-flex flex-column flex-sm-row">
            <div class="d-flex flex-nowrap">
              <button class="edit-option btn btn-sm btn-semivisible upload-edit" data-id="${uploadId}" aria-label="Bearbeiten">
                <i class="fa-solid fa-edit opacity-75" aria-hidden="true"></i>
              </button>
              <button class="edit-option btn btn-sm btn-semivisible upload-delete" data-id="${uploadId}" aria-label="Löschen">
                <i class="fa-solid fa-trash opacity-75" aria-hidden="true"></i>
              </button>
            </div>
            <div class="d-flex flex-nowrap">
              <button class="btn btn-sm btn-semivisible upload-copy-link" aria-label="Link kopieren" data-id="${uploadId}">
                <i class="fa-solid fa-copy opacity-75" aria-hidden="true"></i>
              </button>
              <button class="btn btn-sm btn-semivisible upload-pin" data-id="${uploadId}" aria-label="Anheften">
                <i class="fa-solid fa-thumbtack${upload.isPinned ? "-slash" : ""} opacity-75" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </td>
      </tr>
    `);
    tableTemplate.find(".upload-pin").toggle(upload.isPinned || user.permissionLevel >= 1);
    tableTemplate.find(".edit-option").toggle(editAllowed);
    tableTemplate.find(".upload-failed").toggle(upload.status === "failed");
    tableTemplate.find(".upload-failed-reason").text({
      "MIME-Type is not supported": "Einer der Dateitypen wird nicht unterstützt!"
    }[upload.errorReason ?? ""] ?? "Ein unbekannter Fehler ist aufgetreten.");
    tableTemplate.find(".upload-processing").toggle(["processing", "queued"].includes(upload.status));
    tableTemplate.find(".view-upload").prop("disabled", upload.status !== "completed");

    // Add this upload to the list
    newGalleryContent.append(galleryTemplate);
    newTableContent.append(tableTemplate);
  }

  newTableContent.children().last().find("td").addClass("border-bottom-0");

  // If no uploads match, add an explanation text
  $("#edit-toggle, #edit-toggle-label").prop("disabled", data.length === 0 || user.permissionLevel === 0);
  $("#no-uploads-found").toggle(data.length === 0);
  $("#upload-gallery").empty().append(newGalleryContent.children()).toggleClass("d-none", data.length === 0);
  $("#upload-table-body").empty().append(newTableContent.children());
  $("#upload-table").toggleClass("d-none", data.length === 0);

  renderUploadRequests();
};

async function renderUploadRequests(): Promise<void> {
  const currentUploadRequestsData = await uploadRequestsData();
  const currentJoinedTeamsData = await joinedTeamsData();
  const data = currentUploadRequestsData.filter(u => currentJoinedTeamsData.includes(u.teamId) || u.teamId === -1);

  const length = data.length;
  if (length === 0) {
    $("#upload-requests-done").show();
    $("#upload-requests-todo").hide();
    $("#upload-requests-body").text("Keine Anfragen für Dateien vorhanden.");
  }
  else {
    $("#upload-requests-done").hide();
    $("#upload-requests-todo").show();
    const newContent = $("<div></div>");
    newContent.append(`<div><b>${length}</b> Anfrage${length === 1 ? "" : "n"} für Dateien vorhanden. Sei nett und lade das Gewünschte hoch!</div>`);

    const ul = $("<ul class='mb-0'></ul>");
    for (const r of data) {
      const template = $(`
        <li><span class="d-flex">
          <span class="flex-grow-1">${escapeHTML(r.uploadRequestName)}</span>
          <button class="btn btn-sm btn-semivisible upload-request-delete" data-id="${r.uploadRequestId}" aria-label="Löschen">
            <i class="fa-solid fa-trash opacity-75" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm btn-semivisible upload-request-add" data-id="${r.uploadRequestId}" aria-label="Hinzufügen">
            <i class="fa-solid fa-circle-plus opacity-75" aria-hidden="true"></i>
          </button>
        </span></li>
      `);
      ul.append(template);
    }
    newContent.append(ul);
    $("#upload-requests-body").empty().append(newContent.children());
  }
}

async function renderUploadTypeList(): Promise<void> {
  const uploadTypes = [
    {uploadTypeId: "LESSON_NOTE", name: "Hefteintrag"},
    {uploadTypeId: "WORKSHEET", name: "Arbeitsblatt"},
    {uploadTypeId: "INFO_SHEET", name: "Infozettel"},
    {uploadTypeId: "TEXT", name: "Text"},
    {uploadTypeId: "FILE", name: "Andere Datei"},
    {uploadTypeId: "IMAGE", name: "Anderes Bild"}
  ];

  const addUploadTypeVal = $("#add-upload-type").val() ?? "";
  const editUploadTypeVal = $("#edit-upload-type").val() ?? "";

  // Clear the select element in the add & edit upload modal
  $("#add-upload-type, #edit-upload-type").html('<option value="" disabled selected>Art</option>');
  // Clear the list for filtering by type
  $("#filter-type-list").empty();

  const filterData = JSON.parse(localStorage.getItem("uploadFilter") ?? "{}") ?? {};
  filterData.type ??= {};

  for (const uploadType of uploadTypes) {
    // Get the upload type data
    const uploadTypeId = uploadType.uploadTypeId;
    const uploadTypeName = uploadType.name;

    filterData.type[uploadTypeId] ??= true;
    const checkedStatus = filterData.type[uploadTypeId] ? "checked" : "";
    if (checkedStatus !== "checked") $("#filter-changed").show();

    // Add the template for filtering by type
    const templateFilterType = `
      <label class="form-check flex-grow-1 text-center mb-0 ps-2rem pe-2 py-1 border rounded bg-body-tertiary">
        <input type="checkbox" class="form-check-input filter-type-option me-2"
          id="filter-type-${uploadTypeId}" data-id="${uploadTypeId}" ${checkedStatus}>
        ${uploadTypeName}
      </label>`;
    $("#filter-type-list").append(templateFilterType);

    // Add the template for the select elements
    $("#add-upload-type, #edit-upload-type").append(`<option value="${uploadTypeId}">${uploadTypeName}</option>`);
  };

  if (addUploadTypeVal !== "") $("#add-upload-type").val(addUploadTypeVal);
  if (editUploadTypeVal !== "") $("#edit-upload-type").val(editUploadTypeVal);

  localStorage.setItem("uploadFilter", JSON.stringify(filterData));
};

async function renderTeamList(): Promise<void> {
  const addUploadTeamVal = $("#add-upload-team").val() ?? "-1";
  const editUploadTeamVal = $("#edit-homework-team").val() ?? "-1";
  const addUploadRequestTeamVal = $("#add-upload-request-team").val() ?? "-1";

  // Clear the select element in the add & edit upload modal
  $("#add-upload-team, #edit-upload-team, #add-upload-request-team").html('<option value="-1" selected>Alle</option>');

  for (const team of (await teamsData())) {
    // Add the template for the select elements
    $("#add-upload-team, #edit-upload-team, #add-upload-request-team").append(`<option value="${team.teamId}">${escapeHTML(team.name)}</option>`);
  }

  $("#add-upload-team").val(addUploadTeamVal);
  $("#edit-homework-team").val(editUploadTeamVal);
  $("#add-upload-request-team").val(addUploadRequestTeamVal);
};

async function addUpload(uploadRequestId?: number): Promise<void> {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS AN UPLOAD
  //

  // Reset the data inputs in the add upload modal
  const currentLesson = await getCurrentLesson();
  
  $("#add-upload-name").val("").removeClass("is-autocompleted");
  $("#add-upload-team").val("-1").removeClass("is-autocompleted is-suspicious");
  $("#add-upload-description").val("");
  ($("#add-upload-files")[0] as FileInput).files = [];
  $("#add-upload-type").val("");

  if (uploadRequestId) {
    const uploadRequest = (await uploadRequestsData()).find(r => r.uploadRequestId === uploadRequestId);
    if (uploadRequest) {
      forceAutocomplete($("#add-upload-name"), uploadRequest.uploadRequestName);
      forceAutocomplete($("#add-upload-team"), uploadRequest.teamId);
      $("#add-upload-name, #add-upload-team").find("~ .autocompleted-feedback").text("Automatisch: Aus der Anfrage");
    }
  }
  else if (currentLesson !== undefined) {
    const subjectName = currentLesson.lessons[0].substitution?.subject ?? currentLesson.lessons[0].subjectNameLong;
    forceAutocomplete($("#add-upload-name"), subjectName + " vom " + getSimpleDisplayDate(new Date()));
    $("#add-upload-name ~ .autocompleted-feedback").text("Automatisch: Das aktuelle Fach");
    const teamId = currentLesson.lessons[0].teamId;
    if (teamId !== -1) {
      forceAutocomplete($("#add-upload-team"), teamId);
      $("#add-upload-team ~ .autocompleted-feedback").html(`Automatisch: Das Team, das <b>${escapeHTML(subjectName)}</b> hat`);
    }
  }

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
      const files = ($("#add-upload-files")[0] as FileInput).files;
      const description = $("#add-upload-description").val()?.toString().trim() ?? "";
      const type = $("#add-upload-type").val()?.toString() ?? "";
      const teamId = $("#add-upload-team").val()?.toString() ?? "-1";

      // Prepare the POST request
      const data = new FormData();
      data.append("uploadName", name);
      data.append("uploadDescription", description);
      data.append("uploadType", type);
      data.append("teamId", teamId);
      for (const f of files) {
        data.append("files", f);
      }

      try {
        await ajax("POST", "/api/uploads", {
          body: data,
          queueable: true,
          expectedErrors: [
            { status: 413, responseText: "Upload limit reached: this class already has the maximum number of files allowed." },
            { status: 413, responseText: "Class storage quota will be exceeded" }
          ]
        });
        
        $("#add-upload-success-toast").toast("show");
        $("#add-upload-modal").modal("hide");

        if (uploadRequestId) {
          await ajax("DELETE", `/api/uploads/requests/${uploadRequestId}`, {
            queueable: true
          });
        }
      }
      catch (e) {
        const err = e as AjaxError;
        if (err.status === 413) {
          if (err.responseText === "Upload limit reached: this class already has the maximum number of files allowed.") {
            $("#file-limit-exceeded-toast").toast("show");
          }
          else if (err.responseText === "Class storage quota will be exceeded") {
            $("#storage-limit-exceeded-toast").toast("show");
          }
        }
      }
    });
}

function getFilenameFromContentDisposition(header: string): string | null {
  if (!header) return null;

  const filenameStarMatch = new RegExp(/filename\*\s*=\s*([^;]+)/i).exec(header);
  if (!filenameStarMatch) return null;
  const value = filenameStarMatch[1].trim();

  const parts = value.split("''");
  if (parts.length === 2) {
    return decodeURIComponent(parts[1]);
  }

  return decodeURIComponent(value);
}

async function getFileAndUrl(fileMetaDataId: number): Promise<{file: File, blobUrl: string} | null> {
  const route = `/api/uploads/${fileMetaDataId}`;
  try {
    const response = await fetch(route + "?action=preview");
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const filename = getFilenameFromContentDisposition(response.headers.get("content-disposition") ?? "Datei") ?? "Datei";
      const file = new File([blob], filename, { type: blob.type });
      return {file, blobUrl};
    }
    else {
      return null;
    }
  }
  catch {
    return null;
  }
}

async function viewUpload(uploadId: number): Promise<void> {
  async function showFile(fileNumber: number): Promise<void> {
    if (!upload) return;

    $("#view-upload-nav-info").text(fileNumber + 1 + "/" + upload.filesCount);
    $("#view-upload-nav-back").prop("disabled", fileNumber === 0);
    $("#view-upload-nav-next").prop("disabled", upload.filesCount === fileNumber + 1);

    $("#view-upload-download").off("click").addClass("disabled");
    $("#view-upload-open").attr("href", null).addClass("disabled");

    $("#view-upload-loading").show();
    $("#view-upload-object").hide();
    $("#view-upload-error").hide();
    $("#view-upload-unavailable").hide();

    const fileMetaDataId = upload.files[fileNumber].fileMetaDataId;
    const route = `/api/uploads/${fileMetaDataId}`;
    const fileAndUrl = await getFileAndUrl(fileMetaDataId);

    if (fileAndUrl === null) {
      $("#view-upload-loading").hide();
      const b = await bootstrap();
      const unavailable = (! b.online) || b.maintenance;
      $("#view-upload-object").hide();
      $("#view-upload-error").toggle(!unavailable);
      $("#view-upload-unavailable").toggle(unavailable);
    }
    else {
      $("#view-upload-loading").hide();
      $("#view-upload-error").hide();
      $("#view-upload-unavailable").hide();

      const mime = upload.files[fileNumber].mimeType;
      $("#view-upload-first-page-note").toggle(mime === "application/pdf");
      
      const $obj = $("#view-upload-object");
      const $newObj = $obj.clone().attr("data", fileAndUrl.blobUrl).attr("type", mime).toggleClass("ios", isIOS);
      $obj.replaceWith($newObj);
      $newObj.show();

      $("#view-upload-unavailable").hide();

      $("#view-upload-download").removeClass("disabled").on("click", ev => {
        if (navigator.canShare?.({ files: [fileAndUrl.file] })) {
          ev.preventDefault();
          navigator.share({ files: [fileAndUrl.file] });
        }
      });
      $("#view-upload-download").attr("href", fileAndUrl.blobUrl).attr("download", fileAndUrl.file.name);

      $("#view-upload-open").removeClass("disabled").attr("href", route + "?action=preview");
    }
  }

  const upload = (await uploadData()).uploads.find(u => u.uploadId === uploadId);
  if (!upload) return;

  $("#view-upload-modal-label b").text(upload.uploadName);
  $("#view-upload-modal").modal("show");

  $("#view-upload-description-wrapper").toggle((upload.uploadDescription ?? "") !== "");
  richTextToHtml(upload.uploadDescription, $("#view-upload-description"), {
    showMoreButton: true,
    parseLinks: true,
    merge: true
  });

  let shownFileNumber = 0;
  showFile(shownFileNumber);

  $("#view-upload-nav-back").off("click").on("click", () => showFile(--shownFileNumber));
  $("#view-upload-nav-next").off("click").on("click", () => showFile(++shownFileNumber));
}

async function copyLinkUpload(uploadId: number) : Promise<void> {
  const upload = (await uploadData()).uploads.find(u => u.uploadId === uploadId);
  if (!upload) return;

  const $el = $(`.upload-copy-link[data-id=${uploadId}]`);
  try {
    const url = `${location.protocol}//${location.host}/uploads?view-upload=${uploadId}`;
    const html = `<a href="${url}" class="taskminder-link">${upload.uploadName}</a>`;

    await navigator.clipboard.write([new ClipboardItem({
      "text/plain": new Blob([url], { type: "text/plain" }),
      "text/html": new Blob([html], { type: "text/html" })
    })]);

    $el.prop("disabled", true).html("<i class=\"fas fa-check opacity-75\" aria-hidden=\"true\"></i>");

    setTimeout(() => {
      $el.prop("disabled", false).html("<i class=\"fas fa-copy opacity-75\" aria-hidden=\"true\"></i>");
    }, 2000);
  }
  catch (err) {
    console.error("Error copying upload link to clipboard:", err);
  }
}

async function pinUpload(uploadId: number): Promise<void> {
  const upload = (await uploadData()).uploads.find(u => u.uploadId === uploadId);
  if (!upload) return;

  await ajax("PATCH", `/api/uploads/${uploadId}/pin`, {
    body: {
      pinStatus: !upload.isPinned
    },
    queueable: true
  });
  
  const actionText = upload.isPinned ? "losgelöst" : "angeheftet";
  $("#pin-upload-success-toast .toast-header b").text(`Erfolgreich ${actionText}`);
  $("#pin-upload-success-toast .toast-body").text(`Die Datei wurde erfolgreich ${actionText}.`);
  $("#pin-upload-success-toast").toast("show");
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

  const files: File[] = [];
  for (const f of upload.files) {
    const fileAndUrl = await getFileAndUrl(f.fileMetaDataId);
    if (fileAndUrl !== null) files.push(fileAndUrl.file);
  }
  ($("#edit-upload-files")[0] as FileInput).files = files;
  $("#edit-upload-description").val(upload.uploadDescription ?? "").trigger("change");
  $("#edit-upload-type").val(upload.uploadType);
  $("#edit-upload-team").val(upload.teamId);

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
      const name = $("#edit-upload-name").val()?.toString().trim() ?? "";
      const files = ($("#edit-upload-files")[0] as FileInput).files;
      const description = $("#edit-upload-description").val()?.toString().trim() ?? "";;
      const type = $("#edit-upload-type").val()?.toString() ?? "";
      const teamId = $("#edit-upload-team").val()?.toString() ?? "-1";

      // Prepare the POST request
      const data = new FormData();
      data.append("uploadName", name);
      data.append("uploadDescription", description);
      data.append("uploadType", type);
      data.append("teamId", teamId);
      for (const f of files) {
        data.append("files", f);
      }

      try {
        await ajax("PATCH", `/api/uploads/${uploadId}`, {
          body: data,
          queueable: true,
          expectedErrors: [
            { status: 413, responseText: "Upload limit reached: this class already has the maximum number of files allowed." },
            { status: 413, responseText: "Class storage quota will be exceeded" }
          ]
        });
        
        $("#edit-upload-success-toast").toast("show");
        $("#edit-upload-modal").modal("hide");
      }
      catch (e) {
        const err = e as AjaxError;
        if (err.status === 413) {
          if (err.responseText === "Upload limit reached: this class already has the maximum number of files allowed.") {
            $("#file-limit-exceeded-toast").toast("show");
          }
          else if (err.responseText === "Class storage quota will be exceeded") {
            $("#storage-limit-exceeded-toast").toast("show");
          }
        }
      }
    });
}

function deleteUpload(uploadId: number, force?: boolean): void {
  async function deleteConfirmed(): Promise<void> {
    // Hide the confirmation toast
    $("#delete-upload-confirm-toast").toast("hide");

    await ajax("DELETE", `/api/uploads/${uploadId}`, {
      queueable: true
    });

    $("#delete-upload-success-toast").toast("show");
  }

  //
  // CALLED WHEN THE USER CLICKS THE "DELETE" OPTION OF AN UPLOAD, NOT WHEN USER ACTUALLY DELETES AN UPLOAD
  //

  if (force) deleteConfirmed();
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

function updateFilters(ingoreUploadTypes?: boolean): void {
  $("#filter-changed").hide();

  const filterData = JSON.parse(localStorage.getItem("uploadFilter") ?? "{}") ?? {};

  filterData.dateFromOffset ??= 0;
  const dateFrom = new Date();
  dateFrom.setMonth(dateFrom.getMonth() - 1);
  dateFrom.setDate(dateFrom.getDate() + filterData.dateFromOffset);
  $("#filter-date-from").val(msToInputDate(dateFrom.getTime()));
  if (filterData.dateFromOffset !== 0) $("#filter-changed").show();

  filterData.dateUntilOffset ??= 0;
  const dateUntil = new Date();
  dateUntil.setDate(dateUntil.getDate() + filterData.dateUntilOffset);
  $("#filter-date-until").val(msToInputDate(dateUntil.getTime()));
  if (filterData.dateUntilOffset !== 0) $("#filter-changed").show();

  if (! ingoreUploadTypes) {
    renderUploadTypeList();
  }
}

function toggleShownButtons(): void {
  const loggedIn = user.loggedIn;
  $("#edit-toggle-label").toggle(user.permissionLevel >= 1);
  $("#show-add-upload-button").toggle(user.permissionLevel >= 1);
  if (!loggedIn) {
    $(".edit-option").addClass("d-none");
  }
}

function toggleView(): void {
  if (view === View.Gallery) {
    $("#view-toggle").html("<i class=\"fa-solid fa-table-list\" aria-hidden=\"true\"></i> Tabelle");
    $("#upload-gallery").show();
    $("#upload-table").hide();
  }
  else {
    $("#view-toggle").html("<i class=\"fa-solid fa-grip\" aria-hidden=\"true\"></i> Galerie");
    $("#upload-gallery").hide();
    $("#upload-table").show();
  }
  localStorage.setItem("uploadView", view);
}

export async function init(): Promise<void> {
  return new Promise(res => {
    const urlParams = new URLSearchParams(globalThis.location.search);

    if (urlParams.get("view-upload")) {
      viewUpload(Number.parseInt(urlParams.get("view-upload") ?? ""));
    }

    if (!isIOS) {
      $("#view-upload-first-page-note").remove();
    }

    $("#edit-toggle").on("click", function () {
      $("#upload-gallery .edit-option").toggle($(this).is(":checked"));
    }).prop("checked", false);
    $("#upload-gallery .edit-option").hide();

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
      $("#search-uploads").toggle(checked);
      if (checked) $("#search-uploads input").trigger("focus");
      else $("#search-uploads").val("");
    }).prop("checked", false).trigger("change");

    view = localStorage.getItem("uploadView") as View ?? View.Gallery;
    toggleView();
    $("#view-toggle").on("click", () => {
      view = view === View.Gallery ? View.Table : View.Gallery;
      toggleView();
    });

    updateFilters(true);
    $(".filter-reset").on("click", () => {
      localStorage.setItem("uploadFilter", "{}");
      updateFilters();
      renderUploadList();
    });

    $("#search-uploads").on("input", renderUploadList);

    $("#add-upload-team").on("input autocomplete", checkTeamInputForSuspicious);

    // On changing any information in the add upload modal, disable the add button if any information is empty
    $(".add-upload-input").on("input", function () {
      const name = $("#add-upload-name").val()?.toString().trim();
      const type = $("#add-upload-type").val();
      const fileInput = $("#add-upload-files")[0] as FileInput;

      $("#add-upload-button").prop("disabled", name === "" || type === null || !fileInput.isValid());
    });

    $("#edit-upload-team").on("input autocomplete", checkTeamInputForSuspicious);

    // On changing any information in the edit upload modal, disable the add button if any information is empty
    $(".edit-upload-input").on("input", function () {
      const name = $("#edit-upload-name").val()?.toString().trim();
      const type = $("#edit-upload-type").val();
      const fileInput = $("#edit-upload-files")[0] as FileInput;

      $("#edit-upload-button").prop("disabled", name === "" || type === null || !fileInput.isValid());
    });

    // View the upload on clicking it
    $("#app").on("click", ".view-upload", function () {
      viewUpload($(this).data("id"));
    });

    // Copy the upload link on clicking its copy link icon
    $("#app").on("click", ".upload-copy-link", function () {
      copyLinkUpload($(this).data("id"));
    });

    // Pin the upload on clicking its pin icon
    $("#app").on("click", ".upload-pin", function () {
      pinUpload($(this).data("id"));
    });

    // Request deleting the upload on clicking its delete icon
    $("#app").on("click", ".upload-delete", function () {
      deleteUpload($(this).data("id"));
    });
    $("#app").on("click", ".upload-failed-delete", function () {
      deleteUpload($(this).data("id"), true);
    });

    // Request editing the upload on clicking its edit icon
    $("#app").on("click", ".upload-edit", function () {
      editUpload($(this).data("id"));
    });

    $("#show-add-upload-request-button").on("click", () => {
      $("#add-upload-request-name").val("");
      $("#add-upload-request-team").val("-1").removeClass("is-suspicious");
      $("#add-upload-request-button").prop("disabled", true);
      $("#add-upload-request-modal").modal("show");
    });

    $("#add-upload-request-name").on("input", function () {
      $("#add-upload-request-button").prop("disabled", $(this).val()?.toString().trim() === "");
    });

    $("#add-upload-request-team").on("input autocomplete", checkTeamInputForSuspicious);

    $("#add-upload-request-button").on("click", async () => {
      const uploadRequestName = $("#add-upload-request-name").val()?.toString().trim();
      const teamId = $("#add-upload-request-team").val();
      await ajax("POST", "/api/uploads/requests", {
        body: {
          uploadRequestName,
          teamId
        },
        queueable: true
      });

      $("#add-upload-request-modal").modal("hide");
    });

    $("#app").on("click", ".upload-request-delete", async function () {
      await ajax("DELETE", `/api/uploads/requests/${$(this).data("id")}`, {
        queueable: true
      });
    });

    $("#app").on("click", ".upload-request-add", async function () {
      await addUpload($(this).data("id"));
    });

    // On clicking the all types option, check all and update the upload list
    $("#filter-type-all").on("click", () => {
      const filterData = JSON.parse(localStorage.getItem("uploadFilter") ?? "{}") ?? {};
      $(".filter-type-option").prop("checked", true);
      $(".filter-type-option").each(function () {
        filterData.type[$(this).data("id")] = true;
      });
      localStorage.setItem("uploadFilter", JSON.stringify(filterData));
      updateFilters();
      renderUploadList();
    });

    // On clicking the none types option, uncheck all and update the upload list
    $("#filter-type-none").on("click", () => {
      const filterData = JSON.parse(localStorage.getItem("uploadFilter") ?? "{}") ?? {};
      filterData.type ??= {};
      $(".filter-type-option").prop("checked", false);
      $(".filter-type-option").each(function () {
        filterData.type[$(this).data("id")] = false;
      });
      localStorage.setItem("uploadFilter", JSON.stringify(filterData));
      updateFilters();
      renderUploadList();
    });

    // If any type filter gets changed, update the shown uploads
    $("#app").on("change", ".filter-type-option", function () {
      renderUploadList();
      const filterData = JSON.parse(localStorage.getItem("uploadFilter") ?? "{}") ?? {};
      filterData.type ??= {};
      filterData.type[$(this).data("id")] = $(this).prop("checked");
      localStorage.setItem("uploadFilter", JSON.stringify(filterData));
      updateFilters();
    });

    // On changing any filter date option, update the upload list
    $("#filter-date-from").on("change", function () {
      const selectedDate = new Date($(this).val()?.toString() ?? "");
      const normalDate = new Date();
      normalDate.setMonth(normalDate.getMonth() - 1);
      const diff = dateDaysDifference(selectedDate, normalDate);

      const filterData = JSON.parse(localStorage.getItem("uploadFilter") ?? "{}") ?? {};
      filterData.dateFromOffset = Number.isNaN(diff) ? "NaN" : diff;
      localStorage.setItem("uploadFilter", JSON.stringify(filterData));

      updateFilters();
      renderUploadList();
    });

    // On changing any filter date option, update the upload list
    $("#filter-date-until").on("change", function () {
      const selectedDate = new Date($(this).val()?.toString() ?? "");
      const normalDate = new Date();
      const diff = dateDaysDifference(selectedDate, normalDate);

      const filterData = JSON.parse(localStorage.getItem("uploadFilter") ?? "{}") ?? {};
      filterData.dateUntilOffset = Number.isNaN(diff) ? "NaN" : diff;
      localStorage.setItem("uploadFilter", JSON.stringify(filterData));
      
      updateFilters();
      renderUploadList();
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

    $("#app").on("click", "#show-add-upload-button", () => {
      addUpload();
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

(await uploadData.init()).on("update", onlyThisSite(renderUploadList));
(await uploadRequestsData.init()).on("update", onlyThisSite(renderUploadRequests));
(await teamsData.init()).on("update", onlyThisSite(() => {
  renderTeamList(); 
  renderUploadList(); 
}));

(await joinedTeamsData.init()).on("update", onlyThisSite(renderUploadList));

export async function renderAllFn(): Promise<void> {
  await renderUploadTypeList();
  await renderUploadList();
  await renderTeamList();

  toggleShownButtons();
};
