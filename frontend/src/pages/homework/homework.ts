import { addUpdateAllFunction, dateToMs, getHomeworkCheckStatus, homeworkCheckedData, homeworkData, isSameDay, joinedTeamsData, loadHomeworkCheckedData,
         loadHomeworkData, msToDisplayDate, msToInputDate, runOnce, subjectData, teamsData, updateAll, socket, 
         reloadAll,
         csrfToken} from "../../global/global.js";
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js";
import { richTextToHtml } from "../../snippets/richTextarea/richTextarea.js"

const updateHomeworkList = runOnce(async (): Promise<void> => {
  let newContent = $("<div></div>")
  let addedElements: JQuery<HTMLElement> = $();
  
  // Check if user is in edit mode
  let editEnabled = $("#edit-toggle").is(":checked");

  for (let homework of await homeworkData()) {
    // Get the information for the homework
    let homeworkId = homework.homeworkId;
    let subject = (await subjectData()).find((s) => s.subjectId == homework.subjectId)?.subjectNameLong;
    let content = homework.content;
    let assignmentDate = msToDisplayDate(parseInt(homework.assignmentDate)).split(".").slice(0, 2).join(".");
    let submissionDate = msToDisplayDate(parseInt(homework.submissionDate)).split(".").slice(0, 2).join(".");

    let checked = await getHomeworkCheckStatus(homeworkId);

    // Filter by checked status
    if ((checked) && ( ! $("#filter-status-checked").prop("checked"))) {
      continue;
    }

    // Filter by checked status
    if (( ! checked) && ( ! $("#filter-status-unchecked").prop("checked"))) {
      continue;
    }

    // Filter by subject
    if (!$(`#filter-subject-${homework.subjectId}`).prop("checked")) {
      continue;
    }

    // Filter by min. date
    if ($("#filter-date-from").val() != "") {
      let filterDate = Date.parse($("#filter-date-from").val()?.toString() ?? "");
      if (filterDate > parseInt(homework.submissionDate)) {
        continue;
      }
    }

    // Filter by max. date
    if ($("#filter-date-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-until").val()?.toString() ?? "1.1.1970");
      if (filterDate < parseInt(homework.assignmentDate)) {
        continue;
      }
    }

    // Filter by team
    if (! (await joinedTeamsData()).includes(homework.teamId) && homework.teamId != -1) {
      continue;
    }

    // The template for a homework with checkbox and edit options
    let template = 
      $(`
        <div class="mb-1 d-flex">
          <div class="form-check mt-1">
            <label class="form-check-label">
              <input type="checkbox" class="form-check-input homework-check" data-id="${homeworkId}" ${(checked) ? "checked" : ""}>
              <span class="fw-bold">${$.formatHtml(subject ?? "")}</span>
            </label>
            <span class="homework-content"></span>
            <span class="ms-4 d-block">Von ${assignmentDate} bis ${submissionDate}</span>
          </div>

          <div class="homework-edit-options ms-2 text-nowrap ${(editEnabled) ? "" : "d-none"}">
            <button class="btn btn-sm btn-semivisible homework-edit" data-id="${homeworkId}">
              <i class="fa-solid fa-edit opacity-75"></i>
            </button>
            <button class="btn btn-sm btn-semivisible homework-delete" data-id="${homeworkId}">
              <i class="fa-solid fa-trash opacity-75"></i>
            </button>
          </div>
        </div>
      `);

    // Add this homework to the list
    newContent.append(template);

    richTextToHtml(content, template.find(".homework-content"), { showMoreButton: true, parseLinks: true, displayBlockIfNewline: true })
    addedElements = addedElements.add(template.find(".homework-content"))
  };

  // If no homeworks match, add an explanation text
  if (newContent.html() == "") {
    newContent.html(`<div class="text-secondary">Keine Hausaufgaben mit diesen Filtern.</div>`)
  }
  $("#homework-list").empty().append(newContent.children())
  addedElements.trigger("addedToDom")
})

const  updateSubjectList = runOnce(async (): Promise<void> => {
  // Clear the select element in the add homework modal
  $("#add-homework-subject").empty();
  $("#add-homework-subject").append('<option value="" disabled selected>Fach</option>');
  // Clear the select element in the edit homework modal
  $("#edit-homework-subject").empty();
  $("#edit-homework-subject").append('<option value="" disabled selected>Fach</option>');
  // Clear the list for filtering by subject
  $("#filter-subject-list").empty();

  let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
  filterData.subject ??= {};

  (await subjectData()).forEach(subject => {
    // Get the subject data
    let subjectId = subject.subjectId;
    let subjectName = subject.subjectNameLong;

    filterData.subject[subjectId] ??= true
    let checkedStatus = (filterData.subject[subjectId]) ? "checked" : ""
    if (checkedStatus != "checked") $("#filter-changed").removeClass("d-none")

    // Add the template for filtering by subject
    let templateFilterSubject =
      `<div class="form-check">
        <input type="checkbox" class="form-check-input filter-subject-option" id="filter-subject-${subjectId}" data-id="${subjectId}" ${checkedStatus}>
        <label class="form-check-label" for="filter-subject-${subjectId}">
          ${$.formatHtml(subjectName)}
        </label>
      </div>`;
    $("#filter-subject-list").append(templateFilterSubject)

    // Add the template for the select elements
    let templateFormSelect =
      `<option value="${subjectId}">${$.formatHtml(subjectName)}</option>`;
    $("#add-homework-subject").append(templateFormSelect);
    $("#edit-homework-subject").append(templateFormSelect);
  });

  // If any subject filter gets changed, update the shown homework
  $(".filter-subject-option").on("change", function () {
    updateHomeworkList();
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {}
    filterData.subject ??= {}
    filterData.subject[$(this).data("id")] = $(this).prop("checked")
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
  });

  localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
})

const  updateTeamList = runOnce(async (): Promise<void> => {
  // Clear the select element in the add homework modal
  $("#add-homework-team").empty();
  $("#add-homework-team").append('<option value="-1" selected>Alle</option>');
  // Clear the select element in the edit homework modal
  $("#edit-homework-team").empty();
  $("#edit-homework-team").append('<option value="-1" selected>Alle</option>');

  (await teamsData()).forEach(team => {
    // Get the team data
    let teamName = team.name;

    // Add the template for the select elements
    let templateFormSelect =
      `<option value="${team.teamId}">${$.formatHtml(teamName)}</option>`;
    $("#add-homework-team").append(templateFormSelect);
    $("#edit-homework-team").append(templateFormSelect);
  });
})

function addHomework() {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS A HOMEWORK
  //

  // Reset the data inputs in the add homework modal
  $("#add-homework-subject").val("");
  $("#add-homework-content").val("");
  $("#add-homework-content").trigger("change")
  $("#add-homework-date-assignment").val(msToInputDate(Date.now())); // But set the assignment date to the current date
  $("#add-homework-date-submission").val("");
  $("#add-homework-team").val("-1");

  // Disable the actual "add" button, because not all information is given
  $("#add-homework-button").addClass("disabled");

  // Show the add homework modal
  $("#add-homework-modal").modal("show");

  // Called when the user clicks the "add" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#add-homework-button").off("click").on("click", async () => {
    // Save the given information in variables
    const subject = $("#add-homework-subject").val();
    const content = $("#add-homework-content").val()?.toString().trim();
    const assignmentDate = $("#add-homework-date-assignment").val()?.toString() ?? "";
    const submissionDate = $("#add-homework-date-submission").val()?.toString() ?? "";
    const team = $("#add-homework-team").val();

    // Prepare the POST request
    let data = {
      subjectId: subject,
      content: content,
      assignmentDate: dateToMs(assignmentDate),
      submissionDate: dateToMs(submissionDate),
      teamId: team
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url : "/homework/add",
      type: "POST",
      data: data,
      headers: {
        "X-CSRF-Token": await csrfToken(),
      },
      success: () => {
        // Show a success notification and update the shown homework
        $("#add-homework-success-toast").toast("show");
        homeworkData(null);
        loadHomeworkData();
        updateHomeworkList();
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
        // Hide the add homework modal
        $("#add-homework-modal").modal("hide");
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

async function editHomework(homeworkId: number) {
  //
  // CALLED WHEN THE USER CLICKS THE "EDIT" OPTION OF A HOMEWORK, NOT WHEN USER ACTUALLY EDITS A HOMEWORK
  //

  let homework = (await homeworkData()).find((h) => h.homeworkId == homeworkId)
  if (! homework) return

  // Set the inputs on the already saved information
  $("#edit-homework-subject").val(homework.subjectId);
  $("#edit-homework-content").val(homework.content).trigger("change")
  $("#edit-homework-date-assignment").val(msToInputDate(homework.assignmentDate));
  $("#edit-homework-date-submission").val(msToInputDate(homework.submissionDate));
  $("#edit-homework-team").val(homework.teamId);

  // Enable the actual "edit" button, because all information is given
  $("#edit-homework-button").removeClass("disabled");

  // Show the edit homework modal
  $("#edit-homework-modal").modal("show");

  // Called when the user clicks the "edit" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#edit-homework-button").off("click").on("click", async () => {
    // Save the given information in variables
    const subject = $("#edit-homework-subject").val();
    const content = $("#edit-homework-content").val()?.toString().trim();
    const assignmentDate = $("#edit-homework-date-assignment").val()?.toString() ?? "";
    const submissionDate = $("#edit-homework-date-submission").val()?.toString() ?? "";
    const team = $("#edit-homework-team").val();

    let data = {
      homeworkId: homeworkId,
      subjectId: subject,
      content: content,
      assignmentDate: dateToMs(assignmentDate),
      submissionDate: dateToMs(submissionDate),
      teamId: team
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url : "/homework/edit",
      type: "POST",
      data: data,
      headers: {
        "X-CSRF-Token": await csrfToken(),
      },
      success: () => {
        // Show a success notification and update the shown homework
        $("#edit-homework-success-toast").toast("show");
        homeworkData(null);
        loadHomeworkData();
        updateHomeworkList();
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
        $("#edit-homework-modal").modal("hide");
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

function deleteHomework(homeworkId: number) {
  //
  // CALLED WHEN THE USER CLICKS THE "DELETE" OPTION OF A HOMEWORK, NOT WHEN USER ACTUALLY DELETES A HOMEWORK
  //

  // Show a confirmation notification
  $("#delete-homework-confirm-toast").toast("show");

  // Called when the user clicks the "confirm" button in the notification
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#delete-homework-confirm-toast-button").off("click").on("click", async () => {
    // Hide the confirmation toast
    $("#delete-homework-confirm-toast").toast("hide");

    let data = {
      homeworkId: homeworkId
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url : "/homework/delete",
      type: "POST",
      data: data,
      headers: {
        "X-CSRF-Token": await csrfToken(),
      },
      success: () => {
        // Show a success notification and update the shown homework
        $("#delete-homework-success-toast").toast("show");
        homeworkData(null);
        loadHomeworkData();
        updateHomeworkList();
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
  });
}

async function checkHomework(homeworkId: number) {
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

    if (dataString != null && dataString != undefined) {
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

function resetFilters() {
  $("#filter-changed").addClass("d-none")

  let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};

  if (filterData.statusUnchecked == undefined) {
   $("#filter-status-unchecked").prop("checked", true)
  }
  else {
    $("#filter-status-unchecked").prop("checked", filterData.statusUnchecked)
    if (! filterData.statusUnchecked) $("#filter-changed").removeClass("d-none")
  }

  if (filterData.statusChecked == undefined) {
   $("#filter-status-checked").prop("checked", true)
  }
  else {
    $("#filter-status-checked").prop("checked", filterData.statusChecked)
    if (! filterData.statusChecked) $("#filter-changed").removeClass("d-none")
  }

  if (filterData.dateFrom == undefined) {
    $("#filter-date-from").val(msToInputDate(Date.now()))
  }
  else {
    $("#filter-date-from").val(filterData.dateFrom)
    if (! isSameDay(new Date(filterData.dateFrom), new Date())) $("#filter-changed").removeClass("d-none")
  }

  if (filterData.dateUntil == undefined) {
    let nextMonth = new Date(Date.now())
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    $("#filter-date-until").val(msToInputDate(nextMonth.getTime()))
  }
  else {
    $("#filter-date-from").val(filterData.dateUntil)
    let nextMonth = new Date(Date.now())
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    if (! isSameDay(new Date(filterData.dateUntil), nextMonth)) $("#filter-changed").removeClass("d-none")
  }

  updateSubjectList()
}

$(function(){
  addUpdateAllFunction(
    updateSubjectList,
    updateHomeworkList,
    updateTeamList
  )
  reloadAll();

  // If user is logged in, show the edit toggle button
  user.on("login", () => {
    $("#edit-toggle-label").removeClass("d-none");
    $("#show-add-homework-button").removeClass("d-none");
  });
  user.on("logout", () => {
    $("#edit-toggle-label").addClass("d-none")
    $("#show-add-homework-button").addClass("d-none");
    $(".homework-edit-options").addClass("d-none");
  });

  if (user.loggedIn) {
    $("#edit-toggle-label").removeClass("d-none");
    $("#show-add-homework-button").removeClass("d-none");
  }
  else {
    $("#edit-toggle-label").addClass("d-none")
    $("#show-add-homework-button").addClass("d-none");
    $(".homework-edit-options").addClass("d-none");
  }

  // Leave edit mode (if user entered it in a previous session)
  $("#edit-toggle").prop("checked", false);

  $("#edit-toggle").on("click", function () {
    if ($("#edit-toggle").is(":checked")) {
      // On checking the edit toggle, show the add button and edit options
      $(".homework-edit-options").removeClass("d-none");
    }
    else {
      // On unchecking the edit toggle, hide the add button and edit options
      $(".homework-edit-options").addClass("d-none");
    }
  });

  // Leave filter mode (if user entered it in a previous session)
  $("#filter-toggle").prop("checked", false);

  $("#filter-toggle").on("click", function () {
    if ($("#filter-toggle").is(":checked")) {
      // On checking the filter toggle, show the filter options
      $("#filter-content").removeClass("d-none");
      $("#filter-reset").removeClass("d-none");
    }
    else {
      // On checking the filter toggle, hide the filter options
      $("#filter-content").addClass("d-none");
      $("#filter-reset").addClass("d-none");
    }
  });

  if (! localStorage.getItem("homeworkFilter")) {
    localStorage.setItem("homeworkFilter", `{}`)
  }
  resetFilters();
  $("#filter-reset").on("click", () => {
    localStorage.setItem("homeworkFilter", `{}`)
    resetFilters()
    updateAll()
  })

  // On changing any information in the add homework modal, disable the add button if any information is empty
  $(".add-homework-input").on("input", () => {
    const subject = $("#add-homework-subject").val();
    const content = $("#add-homework-content").val()?.toString().trim();
    const assignmentDate = $("#add-homework-date-assignment").val();
    const submissionDate = $("#add-homework-date-submission").val();

    if ([ content, assignmentDate, submissionDate ].includes("") || subject == null) {
      $("#add-homework-button").addClass("disabled");
    }
    else {
      $("#add-homework-button").removeClass("disabled");
    }
  })

  // On changing any information in the edit homework modal, disable the edit button if any information is empty
  $(".edit-homework-input").on("input", () => {
    const subject = $("#edit-homework-subject").val();
    const content = $("#edit-homework-content").val()?.toString().trim();
    const assignmentDate = $("#edit-homework-date-assignment").val();
    const submissionDate = $("#edit-homework-date-submission").val();

    if ([ content, assignmentDate, submissionDate ].includes("") || subject == null) {
      $("#edit-homework-button").addClass("disabled");
    }
    else {
      $("#edit-homework-button").removeClass("disabled");
    }
  })

  // Don't close the dropdown when the user clicked inside of it
  $(".dropdown-menu").each(function () {
    $(this).on("click", (ev) => {
      ev.stopPropagation();
    });
  });

  // Request deleting the homework on clicking its delete icon
  $(document).on("click", ".homework-delete", function () {
    const homeworkId = $(this).data("id");
    deleteHomework(homeworkId);
  });

  // Request editing the homework on clicking its delete icon
  $(document).on("click", ".homework-edit", function () {
    const homeworkId = $(this).data("id");
    editHomework(homeworkId);
  });

  // Request checking the homework on clicking its checkbox
  $(document).on("click", ".homework-check", function () {
    const homeworkId = $(this).data("id");
    checkHomework(homeworkId);
  });

  // On changing the filter unchecked option, update the homework list & saved filters
  $("#filter-status-unchecked").on("change", () => {
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
    filterData.statusUnchecked = $("#filter-status-unchecked").prop("checked")
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
    updateHomeworkList();
  });

  // On changing the filter checked option, update the homework list & saved filters
  $("#filter-status-checked").on("change", () => {
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
    filterData.statusChecked = $("#filter-status-checked").prop("checked")
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
    updateHomeworkList();
  });

  // On clicking the all subjects option, check all and update the homework list
  $("#filter-subject-all").on("click", () => {
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
    filterData.subject ??= {}
    $(".filter-subject-option").prop("checked", true);
    $(".filter-subject-option").each(function () {
      filterData.subject[$(this).data("id")] = true
    })
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
    updateHomeworkList();
  });

  // On clicking the none subjects option, uncheck all and update the homework list
  $("#filter-subject-none").on("click", () => {
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
    filterData.subject ??= {}
    $(".filter-subject-option").prop("checked", false);
    $(".filter-subject-option").each(function () {
      filterData.subject[$(this).data("id")] = false
    })
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
    updateHomeworkList();
  });

  // On changing any filter date option, update the homework list
  $("#filter-date-from").on("change", () => {
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
    filterData.dateFrom = $("#filter-date-from").val()
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
    updateHomeworkList();
  });

  // On changing any filter date option, update the homework list
  $("#filter-date-until").on("change", () => {
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
    filterData.dateUntil = $("#filter-date-until").val()
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
    updateHomeworkList();
  });

  $(document).on("click", "#show-add-homework-button", () => {
    addHomework();
  });
});

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
