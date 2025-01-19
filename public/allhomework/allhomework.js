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
    let homeworkID = homework.ha_id;
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
    `<div class="mb-1 form-check d-flex align-items-center" id="${homeworkID}">
      <label class="form-check-label">
        <input type="checkbox" class="form-check-input">
        <b>${subject}</b> ${content}
        <span class="ms-4 d-block">Von ${assignmentDate} bis ${submissionDate}</span>
      </label>
      <div class="mb-4 ms-2">
        <i class="fa-solid fa-pen-to-square" style="cursor: pointer; margin-right: 8px; color: grey" data-id="${homeworkID}"></i>
        <i class="fa-solid fa-trash" style="cursor: pointer; color: grey" data-id="${homeworkID}"></i>
      </div>
    </div>`;

    $("#homework-list").append(template)
  });

  $('.fa-pen-to-square').on('click', function() {
    const id = $(this).data('id');
  });

  $('.fa-trash').on('click', function() {
    const id = $(this).data('id');
    deleteHomework(id);
  });

  if ($("#homework-list").html() == "") {
    $("#homework-list").html(`<div class="text-secondary">Keine Hausaufgaben mit diesen Filtern gefunden!</div>`)
  }
}

function editHomework() {

};

function deleteHomework(homeworkID){
  $.get('/account/auth', (response) => {
    if (response.authenticated) {
          let url = "/homework/delete";
          let data = {
            id: homeworkID
          };
          let hasResponded = false;
          $.post(url, data, function (result) {
            hasResponded = true;
            if (result == "0") {
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
        } else {
      $("#error-auth-toast").toast("show");
    }
  });
};

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
  $("#add-homework-subject-select").empty();
  $("#add-homework-subject-select").append('<option value="" disabled selected>Fach</option>');
  
  subjectData.forEach(subject => {
    let subjectId = subject.id;
    let subjectName = subject.name;
    let option = `<option value="${subjectId}">${subjectName}</option>`;
    $("#add-homework-subject-select").append(option);
  });
}

function addHomework() {
  let isFormVisible = false;

  $("#add-homework-cancel-button").on("click", () => {
    $("#add-homework-subject-select").val("");
    $("#add-homework-input").val("");
    $("#add-homework-date-submission-until").val("");
    $('#add-homework-form').hide();
    $('#add-homework-cancel-button').hide();
    $('#add-homework-button').show();
    $("#add-homework-no-data").addClass("d-none"); 
    isFormVisible = false;
});
  $("#add-homework-button").on("click", () => {
    $.get('/account/auth', (response) => {
      if (response.authenticated) {
        if (!isFormVisible) {
          $('#add-homework-form').toggle();
          $('#add-homework-cancel-button').show();
          updateAddHomeworkSubjectList();
          isFormVisible = true;
        } else {
          const checkedSubject = $("#add-homework-subject-select").val();
          const homework = $("#add-homework-input").val().trim();
          const dueDate = dateToMs($("#add-homework-date-submission-until").val());
    
          if (checkedSubject && homework && dueDate) {
            $("#add-homework-no-data").addClass("d-none"); 
    
            ToBackendSubject = checkedSubject;
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
    
            $(".add-homework-subject-option").prop("checked", false);
            $("#add-homework-input").val("");
            $("#add-homework-date-submission-until").val("");
    
            $('#add-homework-form').toggle();
            isFormVisible = false;
          } else {
            $("#add-homework-no-data").removeClass("d-none").addClass("d-flex");
          }
        }
      } else {
        $("#error-auth-toast").toast("show");
      }
    });
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
