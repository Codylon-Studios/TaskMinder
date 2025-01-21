let subjectData;

let homeworkData = [];

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

  if ($("#homework-list").html() == "") {
    $("#homework-list").html(`<div class="text-secondary">Keine Hausaufgaben mit diesen Filtern gefunden!</div>`)
  }
}

function editHomework(homeworkID) {
  $.get('/account/auth', (response) => {
    if (response.authenticated) {
      const editHomeworkModal = new bootstrap.Modal(document.getElementById('edit-homework-modal'));
      const modalElement = document.getElementById('edit-homework-modal');
      const oldButton = document.getElementById('edit-homework-confirmation-button');
      const newButton = oldButton.cloneNode(true);
      oldButton.parentNode.replaceChild(newButton, oldButton);

      modalElement.addEventListener('hidden.bs.modal', function () {
        document.getElementById('edit-homework-subject-select').value = '';
        document.getElementById('edit-homework-input').value = '';
        document.getElementById('edit-homework-date-submission-until').value = '';
        document.getElementById('edit-homework-no-data').classList.add('d-none');
      });

      newButton.addEventListener('click', () => {
        const checkedSubject = $("#edit-homework-subject-select").val();
        const homework = $("#edit-homework-input").val().trim();
        const dueDate = dateToMs($("#edit-homework-date-submission-until").val());

        if (checkedSubject && homework && dueDate) {
          $("#edit-homework-no-data").addClass("d-none");
          let url = "/homework/edit";
          let data = {
            id: homeworkID,
            subjectID: checkedSubject,
            content: homework,
            submissionDate: dueDate
          };
          let hasResponded = false;
          $.post(url, data, function (result) {
            hasResponded = true;
            if (result == "0") {
              editHomeworkModal.hide();
              $("#edit-homework-success-toast").toast("show");
              updateAll();
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
          $("#edit-homework-no-data").removeClass("d-none");
        }
      });

      editHomeworkModal.show();

    } else {
      $("#error-auth-toast").toast("show");
    }
  });
};

function deleteHomework(homeworkID) {
  $.get('/account/auth', (response) => {
    if (response.authenticated) {
      const modal = new bootstrap.Modal(document.getElementById('delete-homework-confirmation'));
      const confirmation = document.getElementById('delete-homework-confirmation-confirmation');

      confirmation.replaceWith(confirmation.cloneNode(true));
      const newConfirmation = document.getElementById('delete-homework-confirmation-confirmation');

      newConfirmation.addEventListener('click', () => {
        modal.hide();

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
      modal.show();
    } else {
      $("#error-auth-toast").toast("show");
    }
  });
}

function addHomework() {
  const addHomeworkModal = new bootstrap.Modal(document.getElementById('add-homework-modal'));
  const modalElement = document.getElementById('add-homework-modal');
  const oldButton = document.getElementById('add-homework-confirmation-button');
  const newButton = oldButton.cloneNode(true);
  oldButton.parentNode.replaceChild(newButton, oldButton);

  modalElement.addEventListener('hidden.bs.modal', function () {
    document.getElementById('add-homework-subject-select').value = '';
    document.getElementById('add-homework-input').value = '';
    document.getElementById('add-homework-date-submission-until').value = '';
    document.getElementById('add-homework-no-data').classList.add('d-none');
  });

  newButton.addEventListener('click', () => {
    const checkedSubject = $("#add-homework-subject-select").val();
    const homework = $("#add-homework-input").val().trim();
    const dueDate = dateToMs($("#add-homework-date-submission-until").val());

    if (checkedSubject && homework && dueDate) {
      $("#add-homework-no-data").addClass("d-none");
      let url = "/homework/add";
      let data = {
        subjectID: checkedSubject,
        content: homework,
        assignmentDate: Date.now(),
        submissionDate: dueDate
      };
      let hasResponded = false;
      $.post(url, data, function (result) {
        hasResponded = true;
        if (result == "0") {
          addHomeworkModal.hide();
          $("#add-homework-success-toast").toast("show");
          updateAll();
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
      $("#add-homework-no-data").removeClass("d-none");
    }
  });

  addHomeworkModal.show();
}

function updateSubjectList() {
  $("#add-homework-subject-select").empty();
  $("#add-homework-subject-select").append('<option value="" disabled selected>Fach</option>');
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

    let templateAddHomeworkFormSelect =
      `<option value="${subjectId}">${subjectName}</option>`;

    let templateEditHomeworkFormSelect =
      `<option value="${subjectId}">${subjectName}</option>`;

    $("#add-homework-subject-select").append(templateAddHomeworkFormSelect);
    $("#edit-homework-subject-select").append(templateEditHomeworkFormSelect);
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

  $("#filter-toggle").on("click", () => {
    $("#filter-content").toggleClass("d-none");
  });

  $(".dropdown-menu").each(function () {
    $(this).on('click', (ev) => {
      ev.stopPropagation();
    });
  });

  $(document).on("click", "#navbar-reload-button", () => {
    updateAll();
  });

  $(document).on('click', '.fa-trash', function () {
    const homeworkID = $(this).data('id');
    deleteHomework(homeworkID);
  });

  $(document).on('click', '.fa-pen-to-square', function () {
    const homeworkID = $(this).data('id');
    editHomework(homeworkID);
  });

  initFilters();

  $(document).on("click", "#add-homework-button", () => {
    $.get('/account/auth', (response) => {
      if (response.authenticated) {
        addHomework();
      } else {
        $("#error-auth-toast").toast("show");
      }
    });
  });
});
