let subjectData;

let homeworkData = [];

function msToDisplayDate(ms) {
  let date = new Date(parseInt(ms));
  let day = String(date.getDate());
  let month = String(date.getMonth() + 1);
  let year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function msToInputDate(ms) {
  let date = new Date(parseInt(ms));
  let day = String(date.getDate()).padStart(2, '0');
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

function dateToMs(dateStr) {
  let [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getTime();
}

function getSubjectName(id) {
  for (let subject of subjectData) {
    if (subject.id == id) {
      return subject.name;
    }
  }
}

async function updateHomeworkList() {
  await $.get('/homework/fetch', (data) => {
    homeworkData = data;
  });
  $("#homework-list").empty();
  
  let editEnabled = $("#edit-toggle").is(":checked");

  homeworkData.forEach(homework => {
    let homeworkID = homework.ha_id;
    let subject = getSubjectName(homework.subject_id);
    let content = homework.content;
    let assignmentDate = msToDisplayDate(homework.assignment_date).split('.').slice(0, 2).join('.');
    let submissionDate = msToDisplayDate(homework.submission_date).split('.').slice(0, 2).join('.');

    if (!$(`#filter-subject-${homework.subject_id}`).prop("checked")) {
      return;
    }

    if ($("#filter-date-assignment-from").val() != "") {
      let filterDate = Date.parse($("#filter-date-assignment-from").val());
      if (filterDate > parseInt(homework.assignment_date)) {
        return;
      }
    }

    if ($("#filter-date-assignment-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-assignment-until").val());
      if (filterDate < parseInt(homework.assignment_date)) {
        return;
      }
    }

    if ($("#filter-date-submission-from").val() != "") {
      let filterDate = Date.parse($("#filter-date-submission-from").val());
      if (filterDate > parseInt(homework.submission_date)) {
        return;
      }
    }

    if ($("#filter-date-submission-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-submission-until").val());
      if (filterDate < parseInt(homework.submission_date)) {
        return;
      }
    }

    let template = 
      `<div class="mb-1 form-check d-flex" id="${homeworkID}">
        <label class="form-check-label">
          <input type="checkbox" class="form-check-input">
          <b>${subject}</b> ${content}
          <span class="ms-4 d-block">Von ${assignmentDate} bis ${submissionDate}</span>
        </label>
        <div class="homework-edit-options ms-2 ${(editEnabled) ? "" : "d-none"}">
          <button class="btn btn-sm btn-tertiary homework-edit" data-id="${homeworkID}">
            <i class="fa-solid fa-edit text-secondary"></i>
          </button>
          <button class="btn btn-sm btn-tertiary homework-delete" data-id="${homeworkID}">
            <i class="fa-solid fa-trash text-secondary"></i>
          </button>
        </div>
      </div>`;

    $("#homework-list").append(template);
  });

  if ($("#homework-list").html() == "") {
    $("#homework-list").html(`<div class="text-secondary">Keine Hausaufgaben mit diesen Filtern gefunden!</div>`)
  }
}

function editHomework(homeworkID) {
  let data;
  for (let homeworkEntry of homeworkData) {
    if (homeworkEntry.ha_id == homeworkID) {
      data = homeworkEntry;
      break;
    }
  }

  $("#edit-homework-subject").val(data.subject_id);
  $("#edit-homework-content").val(data.content);
  $("#edit-homework-date-assignment").val(msToInputDate(data.assignment_date));
  $("#edit-homework-date-submission").val(msToInputDate(data.submission_date));
  $("#edit-homework-button").removeClass("disabled");

  $("#edit-homework-modal").modal("show");

  $("#edit-homework-button").off("click").on("click", () => {
    const subject = $("#edit-homework-subject").val();
    const content = $("#edit-homework-content").val().trim();
    const assignmentDate = $("#edit-homework-date-assignment").val();
    const submissionDate = $("#edit-homework-date-submission").val();

    let url = "/homework/edit";
    let data = {
      id: homeworkID,
      subjectID: subject,
      content: content,
      assignmentDate: dateToMs(assignmentDate),
      submissionDate: dateToMs(submissionDate)
    };
    let hasResponded = false;
    $.post(url, data, function (result) {
      hasResponded = true;
      if (result == "0") {
        $("#edit-homework-modal").modal("hide");
        $("#edit-homework-success-toast").toast("show");
        updateHomeworkList();
      }
      else if (result == "1") {
        $("#error-server-toast").toast("show");
      }
    });
    setTimeout(() => {
      if (!hasResponded) {
        $("#error-server-toast").toast("show");
      }
    }, 1000);
  });
}

function deleteHomework(homeworkID) {
  $("#delete-homework-confirm-toast").toast("show");

  $("#delete-homework-confirm-toast-button").off("click").on("click", () => {
    $("#delete-homework-confirm-toast").toast("hide");

    let url = "/homework/delete";
    let data = {
      id: homeworkID
    };
    let hasResponded = false;

    $.post(url, data, function (result) {
      hasResponded = true;
      if (result == "0") {
        updateAll();
        $("#delete-homework-success-toast").toast("show");
      }
      else if (result == "1") {
        $("#error-server-toast").toast("show");
      }
    });

    setTimeout(() => {
      if (!hasResponded) {
        $("#error-server-toast").toast("show");
      }
    }, 1000);
  });
}

function addHomework() {
  $("#add-homework-subject").val("");
  $("#add-homework-content").val("");
  $("#add-homework-date-assignment").val(msToInputDate(Date.now()));
  $("#add-homework-date-submission").val("");
  $("#add-homework-button").addClass("disabled");

  $("#add-homework-modal").modal("show");

  $("#add-homework-button").off("click").on("click", () => {
    const subject = $("#add-homework-subject").val();
    const content = $("#add-homework-content").val().trim();
    const assignmentDate = $("#add-homework-date-assignment").val();
    const submissionDate = $("#add-homework-date-submission").val();

    let url = "/homework/add";
    let data = {
      subjectID: subject,
      content: content,
      assignmentDate: dateToMs(assignmentDate),
      submissionDate: dateToMs(submissionDate)
    };
    let hasResponded = false;
    $.post(url, data, function (result) {
      hasResponded = true;
      if (result == "0") {
        $("#add-homework-modal").modal("hide");
        $("#add-homework-success-toast").toast("show");
        updateHomeworkList();
      }
      else if (result == "1") {
        $("#error-server-toast").toast("show");
      }
    });
    setTimeout(() => {
      if (!hasResponded) {
        $("#error-server-toast").toast("show");
      }
    }, 1000);
  });
}

function updateSubjectList() {
  $("#add-homework-subject").empty();
  $("#add-homework-subject").append('<option value="" disabled selected>Fach</option>');
  $("#edit-homework-subject-select").empty();
  $("#edit-homework-subject-select").append('<option value="" disabled selected>Fach</option>');
  $("#filter-subject-list").empty();

  subjectData.forEach(subject => {
    let subjectId = subject.id;
    let subjectName = subject.name;
    let template =
      `<div class="form-check">
        <input type="checkbox" class="form-check-input filter-subject-option" id="filter-subject-${subjectId}" checked>
        <label class="form-check-label" for="filter-subject-${subjectId}">
          ${subjectName}
        </label>
      </div>`;

    let templateFormSelect =
      `<option value="${subjectId}">${subjectName}</option>`;

    $("#add-homework-subject").append(templateFormSelect);
    $("#edit-homework-subject").append(templateFormSelect);
    $("#filter-subject-list").append(template)
  });

  $(".filter-subject-option").on("change", () => {
    updateHomeworkList();
  });
}

function updateAll() {
  updateSubjectList();
  updateHomeworkList();
}

function initFilters() {
  $("#filter-subject-all").on("click", () => {
    $(".filter-subject-option").prop("checked", true);
    updateHomeworkList();
  });

  $("#filter-subject-none").on("click", () => {
    $(".filter-subject-option").prop("checked", false);
    updateHomeworkList();
  });

  $(".filter-date").on("change", () => {
    updateHomeworkList();
  });
}

$(document).ready(() => {
  fetch('subjects.json')
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

  $("#filter-toggle").prop("checked", false);

  $("#filter-toggle").on("click", function () {
    if ($("#filter-toggle").is(":checked")) {
      $("#filter-content").removeClass("d-none");
    }
    else {
      $("#filter-content").addClass("d-none");
    }
  });

  $("#edit-toggle").prop("checked", false);

  $("#edit-toggle").on("click", function () {
    if ($("#edit-toggle").is(":checked")) {
      $("#show-add-homework-button").removeClass("d-none");
      $(".homework-edit-options").removeClass("d-none");
    }
    else {
      $("#show-add-homework-button").addClass("d-none");
      $(".homework-edit-options").addClass("d-none");
    }
  });

  if ($("#edit-toggle").is(":checked")) {
    $("#show-add-homework-button").removeClass("d-none");
    $(".homework-edit-options").removeClass("d-none");
  }


  $(".add-homework-input").on("input", () => {
    const subject = $("#add-homework-subject").val();
    const content = $("#add-homework-content").val().trim();
    const assignmentDate = $("#add-homework-date-assignment").val();
    const submissionDate = $("#add-homework-date-submission").val();

    if ([ subject, content, assignmentDate, submissionDate ].includes("")) {
      $("#add-homework-button").addClass("disabled");
    }
    else {
      $("#add-homework-button").removeClass("disabled");
    }
  })

  $(".edit-homework-input").on("input", () => {
    const subject = $("#edit-homework-subject").val();
    const content = $("#edit-homework-content").val().trim();
    const assignmentDate = $("#edit-homework-date-assignment").val();
    const submissionDate = $("#edit-homework-date-submission").val();

    if ([ subject, content, assignmentDate, submissionDate ].includes("")) {
      $("#edit-homework-button").addClass("disabled");
    }
    else {
      $("#edit-homework-button").removeClass("disabled");
    }
  })

  $(".dropdown-menu").each(function () {
    $(this).on('click', (ev) => {
      ev.stopPropagation();
    });
  });

  $(document).on("click", "#navbar-reload-button", () => {
    updateAll();
  });

  $(document).on('click', '.homework-delete', function () {
    const homeworkID = $(this).data('id');
    deleteHomework(homeworkID);
  });

  $(document).on('click', '.homework-edit', function () {
    const homeworkID = $(this).data('id');
    editHomework(homeworkID);
  });

  initFilters();

  $(document).on("click", "#show-add-homework-button", () => {
    addHomework();
  });
});
