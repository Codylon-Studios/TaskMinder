function msToDate(ms) {
  let date = new Date(ms);
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function dateToMs(dateStr) {
  let [day, month, year] = dateStr.split('.');
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getTime();
}

function updateHomeworkList() {
  function getSubjectName(id) {
    for (let subject of subjectData) {
      if (subject.id == id) {
        return subject.name;
      }
    }
  }

  $("#homework-list").empty();

  homeworkData.forEach(homework => {
    let subject = getSubjectName(homework.subjectId);
    let content = homework.content;
    let assignmentDate = msToDate(homework.assignmentDate).split('.').slice(0, 2).join('.');
    let submissionDate = msToDate(homework.submissionDate).split('.').slice(0, 2).join('.');

    if ( ! $(`#filter-subject-${homework.subjectId}`).prop("checked")) {
      return;
    }

    if ($("#filter-date-assignment-from").val() != "") {
      let filterDate = Date.parse($("#filter-date-assignment-from").val());
      if (filterDate > homework.assignmentDate) {
        return;
      }
    }

    if ($("#filter-date-assignment-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-assignment-until").val());
      if (filterDate < homework.assignmentDate) {
        return;
      }
    }

    if ($("#filter-date-submission-from").val() != "") {
      let filterDate = Date.parse($("#filter-date-submission-from").val());
      if (filterDate > homework.submissionDate) {
        return;
      }
    }

    if ($("#filter-date-submission-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-submission-until").val());
      if (filterDate < homework.submissionDate) {
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

function addHomework(){
  $("#add-homework-button").on("click", () => {
    console.log("Add homework");
    $('#add-homework-form').toggle(); 
    updateAddHomeworkSubjectList();
  })
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
    "id": 0,
    "name": "Deutsch"
  },
  {
    "id": 1,
    "name": "Mathe"
  },
  {
    "id": 2,
    "name": "Englisch"
  }
]
let homeworkData = [
  {
    "id": 1,
    "subjectId": 0,
    "content": "Buch Seite 57/6",
    "assignmentDate": 1745884800000,
    "submissionDate": 1745971200000
  },
  {
    "id": 2,
    "subjectId": 1,
    "content": "AA fertig",
    "assignmentDate": 1745884800000,
    "submissionDate": 1745971200000

  },
  {
    "id": 3,
    "subjectId": 0,
    "content": "Buch Seite 57/6",
    "assignmentDate": 1745884800000,
    "submissionDate": 1745971200000
  }
]

$(document).ready(() => {
  $("#filter-toggle").on("click", () => {
    $("#filter-content").toggleClass("d-none");
  });
  
  $(".dropdown-menu").each(function() {
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
