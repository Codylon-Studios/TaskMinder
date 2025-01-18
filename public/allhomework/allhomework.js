function msToDate(ms) {
  let date = new Date(parseInt(ms));
  let day = String(date.getDate()).padStart(2, '0');
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function dateToMs(dateStr) {
  let [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getTime();
}

function getSubjectID(name) {
  for (let subject of subjectData) {
    if (subject.name == name) {
      return subject.id;
    }
  }
}

async function updateHomeworkList() {
  await $.get('/homework/fetch', (data) => {
    homeworkData = data;
  });

  function getSubjectName(id) {
    for (let subject of subjectData) {
      if (subject.id == id) {
        return subject.name;
      }
    }
  }

  $("#homework-list").empty();

  homeworkData.forEach(homework => {
    let subject = getSubjectName(homework.subject_id);
    let content = homework.content;
    let assignmentDate = msToDate(homework.assignment_date).split('.').slice(0, 2).join('.');
    let submissionDate = msToDate(homework.submission_date).split('.').slice(0, 2).join('.');

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
      `<div class="mb-1 form-check">
        <label class="form-check-label">
          <input type="checkbox" class="form-check-input">
          <b>${subject}</b> ${content}
          <span class="ms-4 d-block">Von ${assignmentDate} bis ${submissionDate}</span>
        </label>
      </div>`;

    $("#homework-list").append(template)
  });

  if ($("#homework-list").html() == "") {
    $("#homework-list").html(`<div class="text-secondary">Keine Hausaufgaben mit diesen Filtern gefunden!</div>`)
  }
}

function updateFilterSubjectList() {
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

    $("#filter-subject-list").append(template)
  });

  $(".filter-subject-option").on("change", () => {
    updateHomeworkList();
  });
}

function updateAll() {
  updateFilterSubjectList();
  updateHomeworkList();
}

function updateAddHomeworkSubjectList() {
  $("#add-homework-subject-list").empty();
  subjectData.forEach(subject => {
    let subjectId = subject.id;
    let subjectName = subject.name;
    let template =
      `<div class="form-check">
        <input type="checkbox" class="form-check-input add-homework-subject-option" id="add-homework-subject-${subjectId}">
        <label class="form-check-label" for="add-homework-subject-${subjectId}">
          ${subjectName}
        </label>
      </div>`;
    $("#add-homework-subject-list").append(template);
  });
  $(".add-homework-subject-option").on("change", function () {
    if (this.checked) {
      $(".add-homework-subject-option").not(this).prop("checked", false);
    }
  });
}

function addHomework() {
  let isFormVisible = false;
  $("#add-homework-button").on("click", () => {
    if (!isFormVisible) {
      $('#add-homework-form').toggle();
      updateAddHomeworkSubjectList();
      isFormVisible = true;
    } else {
      const checkedSubject = $(".add-homework-subject-option:checked").closest('.form-check').find('.form-check-label').text().trim();
      const homework = $("#add-homework-input").val().trim();
      const dueDate = dateToMs($("#add-homework-date-submission-until").val());

      if (checkedSubject && homework && dueDate) {

        ToBackendSubject = getSubjectID(checkedSubject);
        ToBackendContent = homework;
        ToBackendSubmissionDate = dueDate;
        ToBackendAssignmentDate = Date.now();

        let url = "/homework/add";
        let data = {
          subjectID: ToBackendSubject,
          content:ToBackendContent,
          assignmentDate: ToBackendAssignmentDate,
          submissionDate:ToBackendSubmissionDate
        };
        let hasResponded = false;
        $.post(url, data, function (result) {
          hasResponded = true;
          if (result == "0") {
            $("#add-homework-success-toast").toast("show");
            console.log("stored success");
          }
          else if (result == "1") {
            //Unknown error on server side
            $("#error-server-toast").toast("show");
          }
        });
        setTimeout(() => {
          if (!hasResponded) {
            $("#error-server-toast").toast("show");
          }
        }, 1000);

        $(".add-homework-subject-option").prop("checked", false);
        $("#add-homework-input").val("");
        $("#add-homework-date-submission-until").val("");

        $('#add-homework-form').toggle();
        isFormVisible = false;
      } else {
        alert("Bitte füllen Sie alle Felder aus.");
      }
    }
  });
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

  $("#filter-subject-none").on("click", () => {
    $(".filter-subject-option").prop("checked", false);
    updateHomeworkList();
  });

  $(".filter-date").on("change", () => {
    updateHomeworkList();
  });
}

let subjectData = [
  {
    "id": 1,
    "name": "Deutsch"
  },
  {
    "id": 2,
    "name": "Mathe"
  },
  {
    "id": 3,
    "name": "Englisch"
  }
]
let homeworkData = []

$(document).ready(() => {
  $("#filter-toggle").on("click", () => {
    $("#filter-content").toggleClass("d-none");
  });

  $(".dropdown-menu").each(function () {
    $(this).on('click', (ev) => {
      ev.stopPropagation();
    });
  });

  updateAll();

  $(document).on("click", "#navbar-reload-button", () => {
    updateAll();
  });

  initFilters();
  addHomework();
});
