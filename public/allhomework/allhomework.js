function getCheckStatusServer(homeworkId) {
  for (let homework of homeworkCheckedData) {
    if (homework.homeworkId == homeworkId) {
      return homework.checked;
    }
  }
  return false;
}

function getCheckStatusLocal(homeworkId) {
  return homeworkCheckedData[homeworkId];
}

function updateAll() {
  // Update the subject data and homework data
  updateSubjectList();
  updateHomeworkList();
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
  $ui.homeworkList.empty();
  
  // Check if user is in edit mode
  let editEnabled = $ui.editToggle.is(":checked");

  homeworkData.forEach(homework => {
    // Get the information for the homework
    let homeworkId = homework.homeworkId;
    let subject = subjectData[homework.subjectId].name.long;
    let content = homework.content;
    let assignmentDate = msToDisplayDate(homework.assignmentDate).split('.').slice(0, 2).join('.');
    let submissionDate = msToDisplayDate(homework.submissionDate).split('.').slice(0, 2).join('.');

    let checked;
    if (user.loggedIn) {
      // If the user is logged in, get the check status using the server data
      checked = getCheckStatusServer(homeworkId);
    }
    else {
      // If the user is not logged in, get the check status using the local data
      checked = getCheckStatusLocal(homeworkId);
    }

    // Filter by checked status
    if ((checked) && ( ! $("#filter-status-checked").prop("checked"))) {
      return;
    }

    // Filter by checked status
    if (( ! checked) && ( ! $("#filter-status-unchecked").prop("checked"))) {
      return;
    }

    // Filter by subject
    if (!$(`#filter-subject-${homework.subjectId}`).prop("checked")) {
      return;
    }

    // Filter by min. assignment date
    if ($("#filter-date-assignment-from").val() != "") {
      let filterDate = Date.parse($("#filter-date-assignment-from").val());
      if (filterDate > parseInt(homework.assignmentDate)) {
        return;
      }
    }

    // Filter by max. assignment date
    if ($("#filter-date-assignment-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-assignment-until").val());
      if (filterDate < parseInt(homework.assignmentDate)) {
        return;
      }
    }

    // Filter by min. submission date
    if ($("#filter-date-submission-from").val() != "") {
      let filterDate = Date.parse($("#filter-date-submission-from").val());
      if (filterDate > parseInt(homework.submissionDate)) {
        return;
      }
    }

    // Filter by max. submission date
    if ($("#filter-date-submission-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-submission-until").val());
      if (filterDate < parseInt(homework.submissionDate)) {
        return;
      }
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
            <i class="fa-solid fa-edit text-secondary"></i>
          </button>
          <button class="btn btn-sm btn-tertiary homework-delete" data-id="${homeworkId}">
            <i class="fa-solid fa-trash text-secondary"></i>
          </button>
        </div>
      </div>`;

    // Add this homework to the list
    $ui.homeworkList.append(template);
  });

  // If no homeworks match, add an explanation text
  if ($ui.homeworkList.html() == "") {
    $ui.homeworkList.html(`<div class="text-secondary">Keine Hausaufgaben mit diesen Filtern.</div>`)
  }
}

function updateSubjectList() {
  // Clear the select element in the add homework modal
  $ui.addHomeworkSubject.empty();
  $ui.addHomeworkSubject.append('<option value="" disabled selected>Fach</option>');
  // Clear the select element in the edit homework modal
  $ui.editHomeworkSubject.empty();
  $ui.editHomeworkSubject.append('<option value="" disabled selected>Fach</option>');
  // Clear the list for filtering by subject
  $("#filter-subject-list").empty();

  subjectData.forEach((subject, subjectId) => {
    // Get the subject data
    let subjectName = subject.name.long;

    // Add the template for filtering by subject
    let templateFilterSubject =
      `<div class="form-check">
        <input type="checkbox" class="form-check-input filter-subject-option" id="filter-subject-${subjectId}" checked>
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
  $(".filter-subject-option").on("change", () => {
    updateHomeworkList();
  });
}

function addHomework() {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS A HOMEWORK
  //

  // Reset the data inputs in the add homework modal
  $ui.addHomeworkSubject.val("");
  $("#add-homework-content").val("");
  $("#add-homework-date-assignment").val(msToInputDate(Date.now())); // But set the assignment date to the current date
  $("#add-homework-date-submission").val("");

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

    // Prepare the POST request
    let url = "/homework/add";
    let data = {
      subjectId: subject,
      content: content,
      assignmentDate: dateToMs(assignmentDate),
      submissionDate: dateToMs(submissionDate)
    };
    // Save whether the server has responed
    let hasResponded = false;
    // Post the request

    $.post(url, data, function (result) {
      // The server has responded
      hasResponded = true;
      if (result == "0") { // Everything worked
        // Show a success notification and update the shown homework
        $("#add-homework-success-toast").toast("show");
        updateHomeworkList();
      }
      else if (result == "1") { // An internal server error occurred
        // Show an error notification
        $navbarToasts.serverError.toast("show");
      }
      else if (result == "2") { // The user has to be logged in but isn't
        // Show an error notification
        $navbarToasts.notLoggedIn.toast("show");
      }
      // Hide the add homework modal
      $("#add-homework-modal").modal("hide");
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

    // Prepare the POST request
    let url = "/homework/edit";
    let data = {
      id: homeworkId,
      subjectId: subject,
      content: content,
      assignmentDate: dateToMs(assignmentDate),
      submissionDate: dateToMs(submissionDate)
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.post(url, data, function (result) {
      // The server has responded
      hasResponded = true;
      if (result == "0") { // Everything worked
        // Show a success notification and update the shown homework
        $("#edit-homework-success-toast").toast("show");
        updateHomeworkList();
      }
      else if (result == "1") { // An internal server error occurred
        // Show an error notification
        $navbarToasts.serverError.toast("show");
      }
      else if (result == "2") { // The user has to be logged in but isn't
        // Show an error notification
        $navbarToasts.notLoggedIn.toast("show");
      }
      // Hide the add homework modal
      $("#edit-homework-modal").modal("hide");
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

    // Prepare the POST request
    let url = "/homework/delete";
    let data = {
      id: homeworkId
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.post(url, data, function (result) {
      // The server has responded
      hasResponded = true;
      if (result == "0") { // Everything worked
        // Show a success notification and update the shown homework
        $("#delete-homework-success-toast").toast("show");
        updateHomeworkList();
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
  });
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

function resetFilters() {
  $("#filter-status input").prop("checked", true)
  $("#filter-date-assignment-from").val("")
  $("#filter-date-assignment-until").val("")
  $("#filter-date-submission-from").val(msToInputDate(Date.now()))
  $("#filter-date-submission-until").val("")
}

let subjectData = [];
let homeworkData = [];
let homeworkCheckedData = [];
let $ui;

$(document).ready(() => {
  // Initialize all jQuery variables
  $ui = {
    editToggle: $("#edit-toggle"),
    addHomeworkSubject: $("#add-homework-subject"),
    editHomeworkSubject: $("#edit-homework-subject"),
    editHomeworkButton: $("#edit-homework-button"),
    addHomeWorkButton: $("#add-homework-button"),
    homeworkList: $("#homework-list"),
  }

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
    updateAll();
  })
  .catch(error => {
    console.error('Error loading the JSON file:', error);
  });

  window.addEventListener("userVariableDefined", () => {
    // If user is logged in, show the edit toggle button
    user.on("login", () => {
      $("#edit-toggle-label").removeClass("d-none");
      updateAll();
    });

    user.on("logout", () => {
      $("#edit-toggle-label").addClass("d-none")
      $("#show-add-homework-button").addClass("d-none");
      $(".homework-edit-options").addClass("d-none");
      updateAll();
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
    }
    else {
      // On checking the filter toggle, hide the filter options
      $("#filter-content").addClass("d-none");
    }
  });

  resetFilters();

  // On changing any information in the add homework modal, disable the add button if any information is empty
  $(".add-homework-input").on("input", () => {
    const subject = $ui.addHomeworkSubject.val();
    const content = $("#add-homework-content").val().trim();
    const assignmentDate = $("#add-homework-date-assignment").val();
    const submissionDate = $("#add-homework-date-submission").val();

    if ([ subject, content, assignmentDate, submissionDate ].includes("")) {
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

    if ([ subject, content, assignmentDate, submissionDate ].includes("")) {
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

  // Update everything on clicking the reload button
  $(document).on("click", "#navbar-reload-button", () => {
    updateAll();
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

  // On changing a filter checked option, update the homework list
  $("#filter-status input").on("change", () => {
    updateHomeworkList();
  });

  // On clicking the all subjects option, check all and update the homework list
  $("#filter-subject-all").on("click", () => {
    $(".filter-subject-option").prop("checked", true);
    updateHomeworkList();
  });

  // On clicking the none subjects option, uncheck all and update the homework list
  $("#filter-subject-none").on("click", () => {
    $(".filter-subject-option").prop("checked", false);
    updateHomeworkList();
  });

  // On changing any filter date option, update the homework list
  $(".filter-date").on("change", () => {
    updateHomeworkList();
  });

  $(document).on("click", "#show-add-homework-button", () => {
    addHomework();
  });
});
