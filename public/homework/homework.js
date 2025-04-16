async function updateHomeworkList() {
  await dataLoaded("subjectData")
  await dataLoaded("homeworkData")
  await dataLoaded("homeworkCheckedData")
  await dataLoaded("joinedTeamsData")

  // Note: homeworkCheckedData will have a different structure
  // Server: [{checkId: int, username: String, homeworkId: int, checked: boolean}, ...]
  // Local: {homeworkId: checked, ...}

  // Clear the list
  $ui.homeworkList.empty();
  
  // Check if user is in edit mode
  let editEnabled = $ui.editToggle.is(":checked");

  for (let homework of homeworkData) {
    // Get the information for the homework
    let homeworkId = homework.homeworkId;
    let subject = subjectData[homework.subjectId].name.long;
    let content = homework.content;
    let assignmentDate = msToDisplayDate(homework.assignmentDate).split('.').slice(0, 2).join('.');
    let submissionDate = msToDisplayDate(homework.submissionDate).split('.').slice(0, 2).join('.');

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
      let filterDate = Date.parse($("#filter-date-from").val());
      if (filterDate > parseInt(homework.submissionDate)) {
        continue;
      }
    }

    // Filter by max. date
    if ($("#filter-date-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-until").val());
      if (filterDate < parseInt(homework.assignmentDate)) {
        continue;
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
          <span class="ms-4 d-block">Von ${assignmentDate} bis ${submissionDate}</span>
        </label>
        <div class="homework-edit-options ms-2 ${(editEnabled) ? "" : "d-none"}">
          <button class="btn btn-sm btn-tertiary homework-edit" data-id="${homeworkId}">
            <i class="fa-solid fa-edit opacity-50"></i>
          </button>
          <button class="btn btn-sm btn-tertiary homework-delete" data-id="${homeworkId}">
            <i class="fa-solid fa-trash opacity-50"></i>
          </button>
        </div>
      </div>`;

    // Add this homework to the list
    $ui.homeworkList.append(template);

    //console.location()
  };

  // If no homeworks match, add an explanation text
  if ($ui.homeworkList.html() == "") {
    $ui.homeworkList.html(`<div class="text-secondary">Keine Hausaufgaben mit diesen Filtern.</div>`)
  }
}
updateHomeworkList = runOnce(updateHomeworkList);

async function updateSubjectList() {
  await dataLoaded("subjectData")

  // Clear the select element in the add homework modal
  $ui.addHomeworkSubject.empty();
  $ui.addHomeworkSubject.append('<option value="" disabled selected>Fach</option>');
  // Clear the select element in the edit homework modal
  $ui.editHomeworkSubject.empty();
  $ui.editHomeworkSubject.append('<option value="" disabled selected>Fach</option>');
  // Clear the list for filtering by subject
  $("#filter-subject-list").empty();

  let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))
  if (filterData.subject == undefined) {
    filterData.subject = {}
  }

  subjectData.forEach((subject, subjectId) => {
    // Get the subject data
    let subjectName = subject.name.long;

    if (filterData.subject[subjectId] == undefined) filterData.subject[subjectId] = true
    let checkedStatus = (filterData.subject[subjectId]) ? "checked" : ""
    if (checkedStatus != "checked") $("#filter-changed").removeClass("d-none")

    // Add the template for filtering by subject
    let templateFilterSubject =
      `<div class="form-check">
        <input type="checkbox" class="form-check-input filter-subject-option" id="filter-subject-${subjectId}" data-id="${subjectId}" ${checkedStatus}>
        <label class="form-check-label" for="filter-subject-${subjectId}">
          ${subjectName}
        </label>
      </div>`;
    $("#filter-subject-list").append(templateFilterSubject)

    // Add the template for the select elements
    let templateFormSelect =
      `<option value="${subjectId}">${subjectName}</option>`;
    $ui.addHomeworkSubject.append(templateFormSelect);
    $ui.editHomeworkSubject.append(templateFormSelect);
  });

  // If any subject filter gets changed, update the shown homework
  $(".filter-subject-option").on("change", function () {
    updateHomeworkList();
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))
    if (filterData.subject == undefined) {
      filterData.subject = {}
    }
    filterData.subject[$(this).data('id')] = $(this).prop("checked")
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
  });

  localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
}
updateSubjectList = runOnce(updateSubjectList);

async function updateTeamList() {
  await dataLoaded("teamsData");

  // Clear the select element in the add homework modal
  $("#add-homework-team").empty();
  $("#add-homework-team").append('<option value="-1" selected>Alle</option>');
  // Clear the select element in the edit homework modal
  $("#edit-homework-team").empty();
  $("#edit-homework-team").append('<option value="-1" selected>Alle</option>');

  teamsData.forEach((team, teamId) => {
    // Get the team data
    let teamName = team.name;

    // Add the template for the select elements
    let templateFormSelect =
      `<option value="${teamId}">${teamName}</option>`;
    $("#add-homework-team").append(templateFormSelect);
    $("#edit-homework-team").append(templateFormSelect);
  });
}
updateTeamList = runOnce(updateTeamList);

function addHomework() {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS A HOMEWORK
  //

  // Reset the data inputs in the add homework modal
  $ui.addHomeworkSubject.val("");
  $("#add-homework-content").val("");
  $("#add-homework-date-assignment").val(msToInputDate(Date.now())); // But set the assignment date to the current date
  $("#add-homework-date-submission").val("");
  $("#add-homework-team").val("-1");

  // Disable the actual "add" button, because not all information is given
  $ui.addHomeWorkButton.addClass("disabled");

  // Show the add homework modal
  $("#add-homework-modal").modal("show");

  // Called when the user clicks the "add" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $ui.addHomeWorkButton.off("click").on("click", () => {
    // Save the given information in variables
    const subject = $ui.addHomeworkSubject.val();
    const content = $("#add-homework-content").val().trim();
    const assignmentDate = $("#add-homework-date-assignment").val();
    const submissionDate = $("#add-homework-date-submission").val();
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
      success: () => {
        // Show a success notification and update the shown homework
        $("#add-homework-success-toast").toast("show");
        homeworkData = undefined;
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

function editHomework(homeworkId) {
  //
  // CALLED WHEN THE USER CLICKS THE "EDIT" OPTION OF A HOMEWORK, NOT WHEN USER ACTUALLY EDITS A HOMEWORK
  //

  // Get the data of the homework
  let data;
  for (let homeworkEntry of homeworkData) {
    if (homeworkEntry.homeworkId == homeworkId) {
      data = homeworkEntry;
      break;
    }
  }

  // Set the inputs on the already saved information
  $ui.editHomeworkSubject.val(data.subjectId);
  $("#edit-homework-content").val(data.content);
  $("#edit-homework-date-assignment").val(msToInputDate(data.assignmentDate));
  $("#edit-homework-date-submission").val(msToInputDate(data.submissionDate));
  $("#edit-homework-team").val(data.teamId);

  // Enable the actual "edit" button, because all information is given
  $ui.editHomeworkButton.removeClass("disabled");

  // Show the edit homework modal
  $("#edit-homework-modal").modal("show");

  // Called when the user clicks the "edit" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $ui.editHomeworkButton.off("click").on("click", () => {
    // Save the given information in variables>
    const subject = $ui.editHomeworkSubject.val();
    const content = $("#edit-homework-content").val().trim();
    const assignmentDate = $("#edit-homework-date-assignment").val();
    const submissionDate = $("#edit-homework-date-submission").val();
    const team = $("#edit-homework-team").val();

    let data = {
      id: homeworkId,
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
      success: () => {
        // Show a success notification and update the shown homework
        $("#edit-homework-success-toast").toast("show");
        homeworkData = undefined;
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

function deleteHomework(homeworkId) {
  //
  // CALLED WHEN THE USER CLICKS THE "DELETE" OPTION OF A HOMEWORK, NOT WHEN USER ACTUALLY DELETES A HOMEWORK
  //

  // Show a confirmation notification
  $("#delete-homework-confirm-toast").toast("show");

  // Called when the user clicks the "confirm" button in the notification
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#delete-homework-confirm-toast-button").off("click").on("click", () => {
    // Hide the confirmation toast
    $("#delete-homework-confirm-toast").toast("hide");

    let data = {
      id: homeworkId
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url : "/homework/delete",
      type: "POST",
      data: data,
      success: () => {
        // Show a success notification and update the shown homework
        $("#delete-homework-success-toast").toast("show");
        homeworkData = undefined;
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

  let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))

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

let $ui;

$(function(){
  updateAllFunctions.push(() => {
    updateSubjectList();
    updateHomeworkList();
    updateTeamList();
  })
  
  requiredData.push(
    "subjectData",
    "homeworkData",
    "homeworkCheckedData"
  )
  
  updateAll();
  
  // Initialize all jQuery variables
  $ui = {
    editToggle: $("#edit-toggle"),
    addHomeworkSubject: $("#add-homework-subject"),
    editHomeworkSubject: $("#edit-homework-subject"),
    editHomeworkButton: $("#edit-homework-button"),
    addHomeWorkButton: $("#add-homework-button"),
    homeworkList: $("#homework-list"),
  }

  $(window).on("userDataLoaded", () => {
    // If user is logged in, show the edit toggle button
    user.on("login", () => {
      $("#edit-toggle-label").removeClass("d-none");
    });

    user.on("logout", () => {
      $("#edit-toggle-label").addClass("d-none")
      $("#show-add-homework-button").addClass("d-none");
      $(".homework-edit-options").addClass("d-none");
    });
  });

  // Leave edit mode (if user entered it in a previous session)
  $ui.editToggle.prop("checked", false);

  $ui.editToggle.on("click", function () {
    if ($ui.editToggle.is(":checked")) {
      // On checking the edit toggle, show the add button and edit options
      $("#show-add-homework-button").removeClass("d-none");
      $(".homework-edit-options").removeClass("d-none");
    }
    else {
      // On unchecking the edit toggle, hide the add button and edit options
      $("#show-add-homework-button").addClass("d-none");
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
    const subject = $ui.addHomeworkSubject.val();
    const content = $("#add-homework-content").val().trim();
    const assignmentDate = $("#add-homework-date-assignment").val();
    const submissionDate = $("#add-homework-date-submission").val();

    if ([ content, assignmentDate, submissionDate ].includes("") || subject == null) {
      $ui.addHomeWorkButton.addClass("disabled");
    }
    else {
      $ui.addHomeWorkButton.removeClass("disabled");
    }
  })

  // On changing any information in the edit homework modal, disable the edit button if any information is empty
  $(".edit-homework-input").on("input", () => {
    const subject = $ui.editHomeworkSubject.val();
    const content = $("#edit-homework-content").val().trim();
    const assignmentDate = $("#edit-homework-date-assignment").val();
    const submissionDate = $("#edit-homework-date-submission").val();

    if ([ content, assignmentDate, submissionDate ].includes("") || subject == null) {
      $ui.editHomeworkButton.addClass("disabled");
    }
    else {
      $ui.editHomeworkButton.removeClass("disabled");
    }
  })

  // Don't close the dropdown when the user clicked inside of it
  $(".dropdown-menu").each(function () {
    $(this).on('click', (ev) => {
      ev.stopPropagation();
    });
  });

  // Request deleting the homework on clicking its delete icon
  $(document).on('click', '.homework-delete', function () {
    const homeworkId = $(this).data('id');
    deleteHomework(homeworkId);
  });

  // Request editing the homework on clicking its delete icon
  $(document).on('click', '.homework-edit', function () {
    const homeworkId = $(this).data('id');
    editHomework(homeworkId);
  });

  // Request checking the homework on clicking its checkbox
  $(document).on('click', '.homework-check', function () {
    const homeworkId = $(this).data('id');
    checkHomework(homeworkId);
  });

  // On changing the filter unchecked option, update the homework list & saved filters
  $("#filter-status-unchecked").on("change", () => {
    updateHomeworkList();
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))
    filterData.statusUnchecked = $("#filter-status-unchecked").prop("checked")
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
  });

  // On changing the filter checked option, update the homework list & saved filters
  $("#filter-status-checked").on("change", () => {
    updateHomeworkList();
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))
    filterData.statusChecked = $("#filter-status-checked").prop("checked")
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
  });

  // On clicking the all subjects option, check all and update the homework list
  $("#filter-subject-all").on("click", () => {
    updateHomeworkList();
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))
    if (filterData.subject == undefined) filterData.subject = {}
    $(".filter-subject-option").prop("checked", true);
    $(".filter-subject-option").each(function () {
      filterData.subject[$(this).data('id')] = true
    })
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
  });

  // On clicking the none subjects option, uncheck all and update the homework list
  $("#filter-subject-none").on("click", () => {
    updateHomeworkList();
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))
    if (filterData.subject == undefined) filterData.subject = {}
    $(".filter-subject-option").prop("checked", false);
    $(".filter-subject-option").each(function () {
      filterData.subject[$(this).data('id')] = false
    })
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
  });

  // On changing any filter date option, update the homework list
  $("#filter-date-from").on("change", () => {
    updateHomeworkList();
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))
    filterData.dateFrom = $("#filter-date-from").val()
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
  });

  // On changing any filter date option, update the homework list
  $("#filter-date-until").on("change", () => {
    updateHomeworkList();
    let filterData = JSON.parse(localStorage.getItem("homeworkFilter"))
    filterData.dateUntil = $("#filter-date-until").val()
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData))
    resetFilters();
  });

  $(document).on("click", "#show-add-homework-button", () => {
    addHomework();
  });
});

socket.on('updateHomeworkData', () => {
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
