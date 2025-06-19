import {
  colorTheme,
  EventTypeData,
  eventTypeData,
  JoinedTeamsData,
  joinedTeamsData,
  msToTime,
  reloadAll,
  SubjectData,
  subjectData,
  substitutionsData,
  TeamsData,
  teamsData,
  lessonData,
  timeToMs,
  LessonData,
  csrfToken,
  reloadAllFn
} from "../../global/global.js";
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js";

async function updateColorTheme() {
  if ($("#color-theme-dark").prop("checked")) {
    colorTheme("dark");
    localStorage.setItem("colorTheme", "dark");
  }
  else if ($("#color-theme-light").prop("checked")) {
    colorTheme("light");
    localStorage.setItem("colorTheme", "light");
  }
  else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      colorTheme("dark");
    }
    else {
      colorTheme("light");
    }
    localStorage.setItem("colorTheme", "auto");
  }

  if ((await colorTheme()) == "light") {
    $("html").css({ background: "#ffffff" });
    document.body.setAttribute("data-bs-theme", "light");
    $('meta[name="theme-color"]').attr("content", "#f8f9fa");
  }
  else {
    $("html").css({ background: "#212529" });
    document.body.setAttribute("data-bs-theme", "dark");
    $('meta[name="theme-color"]').attr("content", "#2b3035");
  }
}

async function updateTeamLists() {
  let newTeamSelectionContent = "";
  let newTeamsContent = "";

  const currentTeamsData = await teamsData();

  for (const team of currentTeamsData) {
    const teamId = team.teamId;
    const selected = (await joinedTeamsData()).includes(teamId);
    let template = `
      <div class="form-check">
        <input type="checkbox" class="form-check-input" data-id="${teamId}" id="team-selection-team-${teamId}" ${selected ? "checked" : ""}>
        <label class="form-check-label" for="team-selection-team-${teamId}">
          ${$.formatHtml(team.name)}
        </label>
      </div>`;
    newTeamSelectionContent += template;

    template = `
      <div class="card m-2 p-2 flex-row justify-content-between align-items-center">
        <div class="d-flex flex-column flex-md-row align-items-md-center">
        <div>
          <input class="form-control form-control-sm d-inline w-fit-content me-3 team-name-input"
            type="text" value="${$.formatHtml(team.name)}" placeholder="${$.formatHtml(team.name)}" data-id="${teamId}">
          <div class="invalid-feedback">
            Teamnamen dürfen nicht leer sein!
          </div>
        </div>
          <span class="text-warning fw-bold mt-2 mt-md-0 d-none team-renamed" data-id="${teamId}">
            Umbenannt
            <span class="text-secondary fw-normal team-renamed-name" data-id="${teamId}">(${$.formatHtml(team.name)} zu <b></b>)</span>
          </span>
          <span class="text-danger fw-bold mt-2 mt-md-0 d-none team-deleted" data-id="${teamId}">Gelöscht</span>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end team-delete" data-id="${teamId}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
    newTeamsContent += template;
  }

  if ((await teamsData()).length == 0) {
    $("#team-selection-list, #teams-list").append('<span class="text-secondary no-teams">Keine Teams vorhanden</span>');
  }

  $("#team-selection-list").html(newTeamSelectionContent);
  $("#teams-list").html(newTeamsContent);

  $(document)
    .off("change", ".team-name-input")
    .on("change", ".team-name-input", async function () {
      $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");

      if ($(this).val().trim() == "") {
        $(this).addClass("is-invalid");
        $("#teams-save").addClass("disabled");
      }

      const teamId = $(this).data("id");
      if (teamId !== "") {
        const newName = $(this).val();
        const oldName = (await teamsData()).find(team => team.teamId == teamId)?.name;
        if (newName != oldName) {
          if ($(`.team-deleted[data-id="${teamId}"]`).hasClass("d-none")) {
            $(`.team-renamed[data-id="${teamId}"]`)
              .removeClass("d-none")
              .find("*")
              .removeClass("d-none")
              .find("b")
              .text(newName);
          }
        }
        else {
          $(`.team-renamed[data-id="${teamId}"]`).addClass("d-none").find("*").addClass("d-none");
        }
      }
    });

  $(document)
    .off("input", ".team-name-input")
    .on("input", ".team-name-input", function () {
      $(this).removeClass("is-invalid");
      if (!$(".team-name-input").hasClass("is-invalid")) {
        $("#teams-save").removeClass("disabled");
      }
    });

  $(".team-delete").on("click", function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");

    const teamId = $(this).data("id");
    if ($(this).hasClass("btn-danger")) {
      $(`.team-deleted[data-id="${teamId}"]`).removeClass("d-none");
      $(`.team-renamed[data-id="${teamId}"]`).addClass("d-none").find("*").addClass("d-none");

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo"></i>');
    }
    else {
      $(`.team-deleted[data-id="${teamId}"]`).addClass("d-none");
      $(`.team-name-input[data-id="${teamId}"]`).trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash"></i>');
    }
  });
}

async function updateEventTypeList() {
  let newEventTypesContent = "";

  for (const eventType of await eventTypeData()) {
    const eventTypeId = eventType.eventTypeId;

    const template = `
      <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="${eventTypeId}">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center">
          <div class="d-flex">
            <div>
              <input class="form-control form-control-sm d-inline w-fit-content me-3 event-type-name-input"
                type="text" value="${$.formatHtml(eventType.name)}" placeholder="${$.formatHtml(eventType.name)}" data-id="${eventTypeId}">
              <div class="invalid-feedback">Der Name darf nicht leer sein!</div>
            </div>
            <input type="text" value="${$.formatHtml(eventType.color)}" class="color-picker event-type-color-input" data-id="${eventTypeId}">
          </div>
          <span class="text-warning fw-bold mt-2 mt-md-0 d-none me-2 event-type-renamed" data-id="${eventTypeId}">
            Umbenannt
            <span class="text-secondary fw-normal event-type-renamed-name" data-id="${eventTypeId}">
              (${$.formatHtml(eventType.name)} zu <b></b>)
            </span>
          </span>
          <span class="text-warning fw-bold mt-2 mt-md-0 d-none event-type-recolored" data-id="${eventTypeId}">
            Farbe gändert
            <span class="text-secondary fw-normal event-type-recolored-color" data-id="${eventTypeId}">
              (<div class="event-type-recolored-color-display"></div>
              zu
              <div class="event-type-recolored-color-display"></div>)
            </span>
          </span>
          <span class="text-danger fw-bold mt-2 mt-md-0 d-none event-type-deleted" data-id="${eventTypeId}">Gelöscht</span>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end event-type-delete" data-id="${eventTypeId}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
    newEventTypesContent += template;
  }

  if ((await eventTypeData()).length == 0) {
    newEventTypesContent += '<span class="text-secondary no-event-types">Keine Ereignisarten vorhanden</span>';
  }
  $("#event-types-list").html(newEventTypesContent);

  $(document)
    .off("change", ".event-type-name-input")
    .on("change", ".event-type-name-input", async function () {
      $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");

      if ($(this).val().trim() == "") {
        $(this).addClass("is-invalid");
        $("#event-types-save").addClass("disabled");
      }

      const eventTypeId = $(this).data("id");
      if (eventTypeId !== "") {
        const newName = $(this).val();
        const oldName = (await eventTypeData()).find(eventType => eventType.eventTypeId == eventTypeId)?.name;
        if (newName != oldName) {
          if ($(`.event-type-deleted[data-id="${eventTypeId}"]`).hasClass("d-none")) {
            $(`.event-type-renamed[data-id="${eventTypeId}"]`)
              .removeClass("d-none")
              .find("*")
              .removeClass("d-none")
              .find("b")
              .text(newName);
          }
        }
        else {
          $(`.event-type-renamed[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none");
        }
      }
    });

  $(document)
    .off("input", ".event-type-name-input")
    .on("input", ".event-type-name-input", function () {
      $(this).removeClass("is-invalid");
      if (!$(".event-type-name-input").hasClass("is-invalid")) {
        $("#event-types-save").removeClass("disabled");
      }
    });

  $(document)
    .off("change", ".event-type-color-input")
    .on("change", ".event-type-color-input", async function () {
      $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");

      const eventTypeId = $(this).data("id");
      if (eventTypeId !== "") {
        const newColor = $(this).val();
        const oldColor = (await eventTypeData()).find(eventType => eventType.eventTypeId == eventTypeId)?.color ?? "";
        if (newColor != oldColor) {
          if ($(`.event-type-deleted[data-id="${eventTypeId}"]`).hasClass("d-none")) {
            const $recoloredElement = $(`.event-type-recolored[data-id="${eventTypeId}"]`);
            $recoloredElement.removeClass("d-none").find("*").removeClass("d-none");
            $recoloredElement.find(".event-type-recolored-color-display").first().css("background-color", oldColor);
            $recoloredElement.find(".event-type-recolored-color-display").last().css("background-color", newColor);
          }
        }
        else {
          $(`.event-type-recolored[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none");
        }
      }
    });

  $(".event-type-delete").on("click", function () {
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");

    const eventTypeId = $(this).data("id");
    if ($(this).hasClass("btn-danger")) {
      $(`.event-type-deleted[data-id="${eventTypeId}"]`).removeClass("d-none");
      $(`.event-type-renamed[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none");
      $(`.event-type-recolored[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none");

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo"></i>');
    }
    else {
      $(`.event-type-deleted[data-id="${eventTypeId}"]`).addClass("d-none");
      $(`.event-type-name-input[data-id="${eventTypeId}"]`).trigger("change");
      $(`.event-type-color-input[data-id="${eventTypeId}"]`).trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash"></i>');
    }
  });
}

async function updateSubjectList() {
  if ((await substitutionsData()) !== "No data") {
    dsbActivated = true;
  }

  let newSubjectsContent = "";

  let currentSubjectData = await subjectData();
  currentSubjectData = currentSubjectData.sort((a, b) => a.subjectId - b.subjectId);
  for (const subject of currentSubjectData) {
    const subjectId = subject.subjectId;
    const subjectNameLong = $.formatHtml(subject.subjectNameLong);
    const subjectNameShort = $.formatHtml(subject.subjectNameShort);
    const teacherNameLong = $.formatHtml(subject.teacherNameLong);
    const teacherNameShort = $.formatHtml(subject.teacherNameShort);
    const template = $(`
      <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="${subjectId}">
        <div class="d-flex flex-column flex-md-row align-items-md-center w-100 me-3">
          <div class="me-3 w-md-50">
            <div class="d-flex gap-3 mb-2">
              <div class="subject-inputs-label d-flex align-items-center">
                <span class="d-none d-lg-inline">Name</span>
                <a class="d-lg-none" data-bs-toggle="tooltip" data-bs-title="Name des Fachs"><i class="fa-solid fa-circle-info"></i></a>
              </div>
              <div class="d-inline-block">
                <input class="form-control form-control-sm subject-name-long-input"
                  type="text" value="${subjectNameLong}" placeholder="${subjectNameLong}" data-id="${subjectId}">
                <div class="invalid-feedback">Der Fachname darf nicht leer sein!</div>
              </div>
              <input class="form-control form-control-sm h-fit-content d-inline-block subject-name-short-input"
                type="text" value="${subjectNameShort}" placeholder="${subjectNameShort}" data-id="${subjectId}">
            </div>
            <div class="d-flex gap-3 ${dsbActivated ? "mb-2" : ""}">
              <div class="subject-inputs-label d-flex align-items-center">
                <span class="d-none d-lg-inline">Lehrkraft</span>
                <a class="d-lg-none" data-bs-toggle="tooltip" data-bs-title="Name der Lehrkraft"><i class="fa-solid fa-circle-info"></i></a>
              </div>
              <div class="d-inline-block">
                <select class="form-control form-control-sm subject-teacher-gender-input" data-id="${subjectId}">
                  <option value="d" ${subject.teacherGender == "d" ? "selected" : ""}>-</option>
                  <option value="w" ${subject.teacherGender == "w" ? "selected" : ""}>Frau</option>
                  <option value="m" ${subject.teacherGender == "m" ? "selected" : ""}>Herr</option>
                </select>
              </div>
              <div class="d-inline-block">
                <input class="form-control form-control-sm h-fit-content subject-teacher-long-input"
                  type="text" value="${teacherNameLong}" placeholder="${teacherNameLong}" data-id="${subjectId}">
                <div class="invalid-feedback">Der Lehrkraftname darf nicht leer sein!</div>
              </div>
              <input class="form-control form-control-sm h-fit-content subject-teacher-short-input"
                type="text" value="${teacherNameShort}" placeholder="${teacherNameShort}" data-id="${subjectId}">
            </div>
            <div class="d-flex gap-3 ${dsbActivated ? "" : "d-none"}">
              <div class="subject-inputs-label d-flex align-items-center">
                <span class="d-none d-lg-inline">Vertretung</span>
                <a class="d-lg-none" data-bs-toggle="tooltip" data-bs-title="Vertretungsoptionen"><i class="fa-solid fa-circle-info"></i></a>
              </div>
              <input class="form-control form-control-sm d-inline-block subject-name-substitution-input" data-id="${subjectId}"
                type="text" value="${$.formatHtml(subject.subjectNameSubstitution?.toString() ?? "")}"
                placeholder="${$.formatHtml(subject.subjectNameSubstitution?.toString() ?? "keine Angabe")}">
              <input class="form-control form-control-sm d-inline-block subject-teacher-substitution-input" data-id="${subjectId}"
                type="text" value="${$.formatHtml(subject.teacherNameSubstitution?.toString() ?? "")}"
                placeholder="${$.formatHtml(subject.teacherNameSubstitution?.toString() ?? "keine Angabe")}">
            </div>
          </div>
          <div class="w-md-50">
            <span class="text-warning fw-bold mt-2 mt-md-0 d-none subject-changed" data-id="${subjectId}">
              Geändert
              <span class="subject-changed-name-long">
                ${$.formatHtml(subject.subjectNameLong)} zu <b></b>
              </span>
              <span class="subject-changed-name-short">
                ${$.formatHtml(subject.subjectNameShort)} zu <b></b>
              </span>
              <span class="subject-changed-name-substitution">
                ${$.formatHtml(subject.subjectNameSubstitution?.toString() ?? "keine Angabe")} zu <b></b>
              </span>
              <span class="subject-changed-teacher-gender">
                ${{ w: "Frau", m: "Herr", d: "Keine Anrede" }[subject.teacherGender]} zu <b></b>
              </span>
              <span class="subject-changed-teacher-long">
                ${$.formatHtml(subject.teacherNameLong)} zu <b></b>
              </span>
              <span class="subject-changed-teacher-short">
                ${$.formatHtml(subject.teacherNameShort)} zu <b></b>
              </span>
              <span class="subject-changed-teacher-substitution">
                ${$.formatHtml(subject.teacherNameSubstitution?.toString() ?? "keine Angabe")} zu <b></b>
              </span>
            </span>
            <span class="text-danger fw-bold mt-2 mt-md-0 d-none subject-deleted" data-id="${subjectId}">Gelöscht</span>
          </div>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end subject-delete" data-id="${subjectId}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`);
    template.find(".subject-changed").last().find("span").addClass("d-none").attr("data-id", subjectId);
    newSubjectsContent += template[0].outerHTML;
  }

  if ((await subjectData()).length == 0) {
    newSubjectsContent += '<span class="text-secondary no-subjects">Keine Fächer vorhanden</span>';
  }
  $("#subjects-list").html(newSubjectsContent);

  $(document)
    .off("change", ".subject-name-long-input")
    .on("change", ".subject-name-long-input", async function () {
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

      if ($(this).val().trim() == "") {
        $(this).addClass("is-invalid");
        $("#subjects-save").addClass("disabled");
      }

      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newName = $(this).val();
        const oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.subjectNameLong;
        if (newName != oldName) {
          if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
            $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
            $(`.subject-changed-name-long[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName);
          }
        }
        else {
          $(`.subject-changed-name-long[data-id="${subjectId}"]`).addClass("d-none");
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });

  $(document)
    .off("input", ".subject-name-long-input")
    .on("input", ".subject-name-long-input", function () {
      $(this).removeClass("is-invalid");
      if (!$(".subject-name-long-input, .subject-teacher-long-input").hasClass("is-invalid")) {
        $("#subjects-save").removeClass("disabled");
      }
    });

  $(document)
    .off("change", ".subject-name-short-input")
    .on("change", ".subject-name-short-input", async function () {
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newName = $(this).val();
        const oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.subjectNameShort;
        if (newName != oldName) {
          if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
            $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
            $(`.subject-changed-name-short[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName);
          }
        }
        else {
          $(`.subject-changed-name-short[data-id="${subjectId}"]`).addClass("d-none");
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });

  $(document)
    .off("change", ".subject-teacher-gender-input")
    .on("change", ".subject-teacher-gender-input", async function () {
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newGender = $(this).val() as "d" | "w" | "m";
        const oldGender = (await subjectData()).find(subject => subject.subjectId == subjectId)?.teacherGender;
        if (newGender != oldGender) {
          if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
            $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
            $(`.subject-changed-teacher-gender[data-id="${subjectId}"]`)
              .removeClass("d-none")
              .find("b")
              .text({ d: "Keine Anrede", w: "Frau", m: "Herr" }[newGender]);
          }
        }
        else {
          $(`.subject-changed-teacher-gender[data-id="${subjectId}"]`).addClass("d-none");
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });

  $(document)
    .off("change", ".subject-teacher-long-input")
    .on("change", ".subject-teacher-long-input", async function () {
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

      if ($(this).val().trim() == "") {
        $(this).addClass("is-invalid");
        $("#subjects-save").addClass("disabled");
      }

      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newName = $(this).val();
        const oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.teacherNameLong;
        if (newName != oldName) {
          if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
            $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
            $(`.subject-changed-teacher-long[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName);
          }
        }
        else {
          $(`.subject-changed-teacher-long[data-id="${subjectId}"]`).addClass("d-none");
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });

  $(document)
    .off("input", ".subject-teacher-long-input")
    .on("input", ".subject-teacher-long-input", function () {
      $(this).removeClass("is-invalid");
      if (!$(".subject-name-long-input, .subject-teacher-long-input").hasClass("is-invalid")) {
        $("#subjects-save").removeClass("disabled");
      }
    });

  $(document)
    .off("change", ".subject-teacher-short-input")
    .on("change", ".subject-teacher-short-input", async function () {
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newName = $(this).val();
        const oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.teacherNameShort;
        if (newName != oldName) {
          if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
            $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
            $(`.subject-changed-teacher-short[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName);
          }
        }
        else {
          $(`.subject-changed-teacher-short[data-id="${subjectId}"]`).addClass("d-none");
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });

  $(document)
    .off("change", ".subject-name-substitution-input")
    .on("change", ".subject-name-substitution-input", async function () {
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newName = $(this).val();
        const oldName =
          (await subjectData()).find(subject => subject.subjectId == subjectId)?.subjectNameSubstitution ??
          "keine Angabe";
        if (newName != oldName) {
          if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
            $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
            $(`.subject-changed-name-substitution[data-id="${subjectId}"]`)
              .removeClass("d-none")
              .find("b")
              .text(newName);
          }
        }
        else {
          $(`.subject-changed-name-substitution[data-id="${subjectId}"]`).addClass("d-none");
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });

  $(document)
    .off("change", ".subject-teacher-substitution-input")
    .on("change", ".subject-teacher-substitution-input", async function () {
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newName = $(this).val();
        const oldName =
          (await subjectData()).find(subject => subject.subjectId == subjectId)?.teacherNameSubstitution ??
          "keine Angabe";
        if (newName != oldName) {
          if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
            $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
            $(`.subject-changed-teacher-substitution[data-id="${subjectId}"]`)
              .removeClass("d-none")
              .find("b")
              .text(newName);
          }
        }
        else {
          $(`.subject-changed-teacher-substitution[data-id="${subjectId}"]`).addClass("d-none");
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });

  $(".subject-delete").on("click", function () {
    $("#subjects-save-confirm-container, #subjectss-save-confirm").addClass("d-none");

    const subjectId = $(this).data("id");
    if ($(this).hasClass("btn-danger")) {
      $(`.subject-deleted[data-id="${subjectId}"]`).removeClass("d-none");
      $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo"></i>');
    }
    else {
      $(`.subject-deleted[data-id="${subjectId}"]`).addClass("d-none");
      $(`.subject-name-long-input[data-id="${subjectId}"]`).trigger("change");
      $(`.subject-name-short-input[data-id="${subjectId}"]`).trigger("change");
      $(`.subject-teacher-gender-input[data-id="${subjectId}"]`).trigger("change");
      $(`.subject-teacher-long-input[data-id="${subjectId}"]`).trigger("change");
      $(`.subject-teacher-short-input[data-id="${subjectId}"]`).trigger("change");
      $(`.subject-name-substitution-input[data-id="${subjectId}"]`).trigger("change");
      $(`.subject-teacher-substitution-input[data-id="${subjectId}"]`).trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash"></i>');
    }
  });
}

async function updateTimetable() {
  const newTimetableContent = $("<div></div>");

  let subjectOptions: string = "";
  (await subjectData()).forEach(subject => {
    subjectOptions += `<option value="${subject.subjectId}">${$.formatHtml(subject.subjectNameLong)}</option>`;
  });

  let teamOptions: string = "";

  (await teamsData()).forEach(team => {
    teamOptions += `<option value="${team.teamId}">${$.formatHtml(team.name)}</option>`;
  });

  for (let dayId = 0; dayId < 5; dayId++) {
    const dayTemplate = $(`
      <div class="col p-1">
        <div class="card p-2">
          <div>${["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"][dayId]}</div>
          <hr class="mt-2">
          <div class="timetable-lesson-list">
          </div>
        </div>
      </div>
    `);
    dayTemplate
      .find(".card")
      .append('<button class="btn btn-sm btn-success fw-semibold timetable-new-lesson">Neue Stunde</button>');
    $("#timetable").append(dayTemplate);
    newTimetableContent.append(dayTemplate);
  }

  (await lessonData()).forEach(lesson => {
    const lessonTemplate = $(`
      <div class="timetable-lesson card p-2 mb-2">
        <div class="d-flex mb-2 align-items-center">
          <label class="form-label form-label-sm mb-0 me-2">
            Stundennummer
          </label>
          <input class="timetable-lesson-number form-control form-control-sm me-2" type="text" value="${lesson.lessonNumber}">
          <button class="btn btn-sm btn-danger timetable-lesson-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <input class="timetable-start-time form-control form-control-sm me-4" type="time" value="${msToTime(lesson.startTime)}">
          <input class="timetable-end-time form-control form-control-sm" type="time" value="${msToTime(lesson.endTime)}">
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="form-label form-label-sm mb-0 me-2">
            Fach
          </label>
          <select class="timetable-subject-select form-select form-select-sm">
            <option value="" disabled>Fach</option>
            <option value="-1">Pause</option>
            ${subjectOptions}
          </select>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="form-label form-label-sm mb-0 me-2">
            Raum
          </label>
          <input class="timetable-room form-control form-control-sm" type="text" value="${$.formatHtml(lesson.room)}">
        </div>
        <div class="d-flex align-items-center">
          <label class="form-label form-label-sm mb-0 me-2">
            Team
          </label>
          <select class="timetable-team-select form-select form-select-sm">
            <option value="-1">Alle</option>
            ${teamOptions}
          </select>
        </div>
      </div>
    `);
    lessonTemplate.find(`.timetable-subject-select option[value=${lesson.subjectId}]`).attr("selected", "true");
    lessonTemplate.find(`.timetable-team-select option[value=${lesson.teamId}]`).attr("selected", "true");
    newTimetableContent.find(".timetable-lesson-list").eq(lesson.weekDay).append(lessonTemplate);
  });

  $(document)
    .off("click", ".timetable-new-lesson")
    .on("click", ".timetable-new-lesson", function () {
      const lessonTemplate = $(`
      <div class="timetable-lesson card p-2 mb-2">
        <div class="d-flex mb-2 align-items-center">
          <label class="form-label form-label-sm mb-0 me-2">
            Stundennummer
          </label>
          <input class="timetable-lesson-number form-control form-control-sm me-2" type="text">
          <button class="btn btn-sm btn-danger timetable-lesson-delete"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <input class="timetable-start-time form-control form-control-sm me-4" type="time">
          <input class="timetable-end-time form-control form-control-sm" type="time">
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="form-label form-label-sm mb-0 me-2">
            Fach
          </label>
          <select class="timetable-subject-select form-select form-select-sm">
            <option value="" disabled selected>Fach</option>
            <option value="-1">Pause</option>
            ${subjectOptions}
          </select>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="form-label form-label-sm mb-0 me-2">
            Raum
          </label>
          <input class="timetable-room form-control form-control-sm" type="text">
        </div>
        <div class="d-flex align-items-center">
          <label class="form-label form-label-sm mb-0 me-2">
            Team
          </label>
          <select class="timetable-team-select form-select form-select-sm">
            <option value="-1">Alle</option>
            ${teamOptions}
          </select>
        </div>
      </div>
    `);
      function updateTimeInputs(newBtn: JQuery<HTMLElement>) {
        newBtn
          .parent()
          .parent()
          .parent()
          .find(".timetable-lesson")
          .each(function () {
            if ($(this).find(".timetable-lesson-number").val() == lessonNumber.toString()) {
              lessonTemplate.find(".timetable-start-time").val($(this).find(".timetable-start-time").val() ?? "--:--");
              lessonTemplate.find(".timetable-end-time").val($(this).find(".timetable-end-time").val() ?? "--:--");
            }
          });
      }

      const lessonList = $(this).parent().find(".timetable-lesson-list");
      const previousLesson = lessonList.find(".timetable-lesson").last();
      let lessonNumber = parseInt(previousLesson.find(".timetable-lesson-number").val()?.toString() ?? "0") + 1;
      lessonTemplate.find(".timetable-lesson-number").val(lessonNumber);
      lessonTemplate.find(".timetable-lesson-number").on("change", () => {
        lessonNumber = parseInt(lessonTemplate.find(".timetable-lesson-number").val()?.toString() ?? "1");
        updateTimeInputs($(this));
      });
      lessonTemplate.find(".timetable-start-time").val(previousLesson.find(".timetable-end-time").val() ?? "--:--");
      updateTimeInputs($(this));
      lessonList.append(lessonTemplate);
    });

  $("#timetable").html(newTimetableContent.html());

  $(document)
    .off("click", ".timetable-lesson-delete")
    .on("click", ".timetable-lesson-delete", function () {
      $(this).parent().parent().remove();
    });
}

let dsbActivated = false;

$(async () => {
  reloadAllFn.set(async () => {
    if (user.classJoined) {
      eventTypeData.reload();
      joinedTeamsData.reload();
      subjectData.reload();
      substitutionsData.reload();
      teamsData.reload();
      lessonData.reload();
      await updateTeamLists();
      await updateEventTypeList();
      await updateSubjectList();
      await updateTimetable();
    }
  });
  if (user.loggedIn !== null) reloadAll();
});

user.on("change", () => {
  if (user.loggedIn !== null) {
    $(".not-logged-in-info").toggleClass("d-none", user.loggedIn);
    $("#settings-account").toggleClass("d-none", !user.loggedIn);

    $("#change-password-button").show();
    $("#change-password").hide();

    $("#delete-account-button").show();
    $("#delete-account").hide();
  }
  if (user.classJoined) {
    $(".not-joined-info").addClass("d-none");
    $("#settings-student, #settings-class").removeClass("d-none");

    const $classcodeCopyLink = $("#classcode-copy-link");
    const $classcode = $("#classcode");
    const $classcodeCopyText = $("#classcode-copy-text");
    const $classcodeCopiedText = $("#classcode-copied-text");

    $.get("/class/get_classcode")
      .done((classCode: string) => {
        $classcode.val(classCode);
        $classcodeCopyLink.prop("disabled", false);
      })
      .fail(() => {
        $classcode.val("Fehler beim Laden");
        $classcodeCopyLink.prop("disabled", true);
      });

    $classcodeCopyLink.on("click", async () => {
      const value = $classcode.val();

      try {
        await navigator.clipboard.writeText(`https://codylon.de/join?classcode=${value}&action=join`);

        $classcodeCopyText.addClass("d-none");
        $classcodeCopiedText.removeClass("d-none");
        $classcodeCopyLink.prop("disabled", true);

        setTimeout(() => {
          $classcodeCopyText.removeClass("d-none");
          $classcodeCopiedText.addClass("d-none");
          $classcodeCopyLink.prop("disabled", false);
        }, 2000);
      }
      catch (err) {
        console.error("Error copying classcode to clipboard:", err);
      }
    });
  }
});


let animations = JSON.parse(localStorage.getItem("animations") ?? "true") ?? true;
$("#animations input").prop("checked", animations);
$("#animations input").on("click", function () {
  animations = $(this).prop("checked");
  localStorage.setItem("animations", animations);
});

let displayFooter = JSON.parse(localStorage.getItem("displayFooter") ?? "true") ?? true;
$("#display-footer input").prop("checked", displayFooter);
$("#display-footer input").on("click", function () {
  displayFooter = $(this).prop("checked");
  localStorage.setItem("displayFooter", displayFooter);
  if (displayFooter) {
    $("footer").show();
    $("body").css({
      paddingBottom: Math.max($(".bottombar").height() ?? 0, 0) + "px"
    });
  }
  else {
    $("footer").hide();
    $("body").css({
      paddingBottom: Math.max($(".bottombar").height() ?? 0, 0) + 70 + "px"
    });
  }
});

const colorThemeSetting = localStorage.getItem("colorTheme") ?? "auto";
document.body.setAttribute("data-bs-theme", await colorTheme());
$("#color-theme-auto").prop("checked", colorThemeSetting == "auto");
$("#color-theme-dark").prop("checked", colorThemeSetting == "dark");
$("#color-theme-light").prop("checked", colorThemeSetting == "light");

$("#color-theme input").each(function () {
  $(this).on("click", () => {
    updateColorTheme();
  });
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", updateColorTheme);
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateColorTheme);

// ACCOUNT SETTINGS

// Logout
$("#logout-button").on("click", async () => {
  let hasResponded = false;

  $.ajax({
    url: "/account/logout",
    type: "POST",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#logout-success-toast").toast("show");

      user.loggedIn = false;
      user.username = null;
      user.trigger("change");
    },
    error: xhr => {
      if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
});

// Change password
$("#change-password-button").on("click", function () {
  $(this).hide();
  $("#change-password").show();
  $("#change-password input").val("");
  $("#change-password-confirm").addClass("disabled")
  $("#change-password-invalid-password").addClass("d-none").removeClass("d-flex");
  $("#change-password-not-matching-passwords").addClass("d-none").removeClass("d-flex");
  $("#change-password-insecure-password").addClass("d-none").removeClass("d-flex");
});

$("#change-password-cancel").on("click", () => {
  $("#change-password").hide();
  $("#change-password-button").show();
});

$("#change-password-old").on("input", () => {
  $("#change-password-invalid-password").addClass("d-none").removeClass("d-flex");
});

$("#change-password-new, #change-password-repeat").on("change", function () {
  if ($("#change-password-new").val() != $("#change-password-repeat").val()) {
    $("#change-password-not-matching-passwords").removeClass("d-none").addClass("d-flex");
    $("#change-password-confirm").addClass("disabled")
  }
  if ($(this).val() == "") {
    $("#change-password-confirm").addClass("disabled")
  }
});

$("#change-password-new, #change-password-repeat").on("input", () => {
  if ($("#change-password-new").val() == $("#change-password-repeat").val()) {
    $("#change-password-not-matching-passwords").addClass("d-none").removeClass("d-flex");
  }
});

function checkSecurePassword(password: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"<>,.?/-]).{8,}$/.test(password);
}

$("#change-password-new").on("change", () => {
  if (! checkSecurePassword($("#change-password-new").val()?.toString() ?? "")) {
    $("#change-password-insecure-password").removeClass("d-none").addClass("d-flex");
  }
});

$("#change-password-new").on("input", () => {
  if (checkSecurePassword($("#change-password-new").val()?.toString() ?? "")) {
    $("#change-password-insecure-password").addClass("d-none").removeClass("d-flex");
  }
});

$("#change-password-old, #change-password-new, #change-password-repeat").on("input", function () {
  if (! ($("#change-password-old, #change-password-new, #change-password-repeat").map(
          function () { return $(this).val() }
         ).get().includes("")
        || $("#change-password-invalid-password").hasClass("d-flex")
        || $("#change-password-not-matching-passwords").hasClass("d-flex"))
     ) {
    $("#change-password-confirm").removeClass("disabled")
  }
});

$("#change-password-confirm").on("click", async () => {
  const data = {
    passwordOld: $("#change-password-old").val(),
    passwordNew: $("#change-password-new").val(),
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/change_password",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#change-password-success-toast").toast("show");
    },
    error: xhr => {
      if (xhr.status === 401) {
        $("#change-password-invalid-password").removeClass("d-none").addClass("d-flex");
        $("#change-password-confirm").addClass("disabled")
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
});

// Delete account
$("#delete-account-button").on("click", function () {
  $(this).hide();
  $("#delete-account").show();
  $("#delete-account-password").val("");
  $("#delete-account-confirm").addClass("disabled")
  $("#delete-account-invalid-password").addClass("d-none").removeClass("d-flex");
});

$("#delete-account-cancel").on("click", () => {
  $("#delete-account").hide();
  $("#delete-account-button").show();
});

$("#delete-account-password").on("change", function () {
  console.log("change")
  if ($(this).val() == "") {
    $("#delete-account-confirm").addClass("disabled")
  }
});

$("#delete-account-password").on("input", function () {
  $("#delete-account-invalid-password").addClass("d-none").removeClass("d-flex");
  if ($(this).val() != "") {
    $("#delete-account-confirm").removeClass("disabled")
  }
});

$("#delete-account-confirm").on("click", async () => {
  const data = {
    password: $("#delete-account-password").val()
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/delete",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#delete-account-success-toast").toast("show");
      
      user.loggedIn = false;
      user.username = null;
      user.trigger("change");
    },
    error: xhr => {
      if (xhr.status === 401) {
        $("#delete-account-invalid-password").removeClass("d-none").addClass("d-flex");
        $("#delete-account-confirm").addClass("disabled")
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
});

// TEAM SELECTION

$("#team-selection-save").on("click", async () => {
  const newJoinedTeamsData: JoinedTeamsData = [];
  $("#team-selection-list input").each(function () {
    if ($(this).prop("checked")) {
      newJoinedTeamsData.push(parseInt($(this).data("id")));
    }
  });

  if (user.loggedIn) {
    const data = {
      teams: newJoinedTeamsData
    };
    let hasResponded = false;

    $.ajax({
      url: "/teams/set_joined_teams_data",
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      headers: {
        "X-CSRF-Token": await csrfToken()
      },
      success: () => {
        teamsData.reload();
        joinedTeamsData.reload();
        updateTeamLists();
        $("#team-selection-save").html('<i class="fa-solid fa-circle-check"></i>').prop("disabled", true);
        setTimeout(() => {
          $("#team-selection-save").text("Speichern").prop("disabled", false);
        }, 1000);
      },
      error: xhr => {
        if (xhr.status === 401) {
          $navbarToasts.serverError.toast("show");
        }
        else if (xhr.status === 500) {
          $navbarToasts.serverError.toast("show");
        }
        else {
          $navbarToasts.unknownError.toast("show");
        }
      },
      complete: () => {
        hasResponded = true;
      }
    });

    setTimeout(() => {
      if (!hasResponded) {
        $navbarToasts.serverError.toast("show");
      }
    }, 1000);
  }
  else {
    localStorage.setItem("joinedTeamsData", JSON.stringify(newJoinedTeamsData));
    teamsData.reload();
    joinedTeamsData.reload();
    updateTeamLists();
    $("#team-selection-save").html('<i class="fa-solid fa-circle-check"></i>').prop("disabled", true);
    setTimeout(() => {
      $("#team-selection-save").text("Speichern").prop("disabled", false);
    }, 1000);
  }
});

// TEAMS

$("#teams-toggle").on("click", function () {
  $("#teams-list").toggleClass("d-none");
  $(this).toggleClass("rotate-90");
});

$("#new-team").on("click", () => {
  $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");

  $("#teams-list .no-teams").remove();

  const template = `
    <div class="card m-2 p-2 flex-row justify-content-between align-items-center">
      <div class="d-flex flex-column flex-md-row align-items-md-center">
        <div>
          <input class="form-control form-control-sm d-inline w-fit-content me-3 team-name-input"
            type="text" value="" placeholder="Neues Team" data-id="">
          <div class="invalid-feedback">
            Teamnamen dürfen nicht leer sein!
          </div>
        </div>
        <span class="text-success fw-bold mt-2 mt-md-0" data-id="">Neu</span>
      </div
      <div>
        <button class="btn btn-sm btn-sm-square btn-danger float-end new-team-delete" data-id="">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`;
  $("#teams-list").append(template);
  $(".team-name-input").last().trigger("focus");

  $(".team-name-input")
    .last()
    .on("focusout", function () {
      if ($(this).val()?.toString().trim() == "") {
        $(this).addClass("is-invalid");
        $("#teams-save").addClass("disabled");
      }
    });

  $(".new-team-delete")
    .off("click")
    .on("click", function () {
      $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");
      $(this).parent().remove();
      if ($("#teams-list").children().length == 0) {
        $("#teams-list").append('<span class="text-secondary no-teams">Keine Teams vorhanden</span>');
      }
    });
});

$("#teams-cancel").on("click", () => {
  updateTeamLists();
  $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");
});

async function saveTeams() {
  const newTeamsData: TeamsData = [];
  $(".team-name-input").each(function () {
    if ($(this).parent().parent().find("~ .btn-success").length > 0) return;
    newTeamsData.push({
      teamId: $(this).data("id"),
      name: $(this).val()?.toString() ?? ""
    });
  });

  const data = {
    teams: newTeamsData
  };
  let hasResponded = false;

  $.ajax({
    url: "/teams/set_teams_data",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      teamsData.reload();
      joinedTeamsData.reload();
      updateTeamLists();
      $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");
      $("#teams-save").html('<i class="fa-solid fa-circle-check"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#teams-save").text("Speichern").prop("disabled", false);
      }, 1000);
    },
    error: xhr => {
      if (xhr.status === 401) {
        $navbarToasts.serverError.toast("show");
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
}

$("#teams-save").on("click", () => {
  const deleted: string[] = [];
  $(".team-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "");
  });

  if (deleted.length == 0) {
    saveTeams();
  }
  else {
    $("#teams-save-confirm-container, #teams-save-confirm").removeClass("d-none");
    if (deleted.length == 1) {
      $("#teams-save-confirm-list").html(`des Teams <b>${$.formatHtml(deleted[0])}</b>`);
    }
    else {
      $("#teams-save-confirm-list").html(
        "der Teams " +
          deleted
            .map(e => `<b>${$.formatHtml(e)}</b>`)
            .join(", ")
            .replace(/,(?!.*,)/, " und")
      );
    }
  }
});

$("#teams-save-confirm").on("click", saveTeams);

// EVENT TYPES

$("#event-types-toggle").on("click", function () {
  $("#event-types-list").toggleClass("d-none");
  $(this).toggleClass("rotate-90");
});

$("#new-event-type").on("click", () => {
  $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");

  $("#event-types-list .no-event-types").remove();

  const template = `
    <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="">
      <div class="d-flex flex-column flex-md-row align-items-md-center">
        <div class="d-flex">
          <div>
            <input class="form-control form-control-sm d-inline w-fit-content me-3 event-type-name-input"
              type="text" value="" placeholder="Neue Ereignisart" data-id="">
            <div class="invalid-feedback">
              Der Name darf nicht leer sein!
            </div>
          </div>
          <input type="text" value="#3bb9ca" class="color-picker event-type-color-input" data-id="">
        </div>
        <span class="text-success fw-bold mt-2 mt-md-0" data-id="">Neu</span>
      </div
      <div>
        <button class="btn btn-sm btn-sm-square btn-danger float-end new-event-type-delete" data-id="">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`;
  $("#event-types-list").append(template);
  $(".event-type-name-input").last().trigger("focus");

  $(".event-type-name-input")
    .last()
    .on("focusout", function () {
      if ($(this).val()?.toString().trim() == "") {
        $(this).addClass("is-invalid");
        $("#event-types-save").addClass("disabled");
      }
    });

  $(".new-event-type-delete")
    .off("click")
    .on("click", function () {
      $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");
      $(this).parent().remove();
      if ($("#event-types-list").children().length == 0) {
        $("#event-types-list").append(
          '<span class="text-secondary no-event-types">Keine Ereignisarten vorhanden</span>'
        );
      }
    });
});

$("#event-types-cancel").on("click", () => {
  updateEventTypeList();
  $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");
});

async function saveEventTypes() {
  const newEventTypesData: EventTypeData = [];
  $("#event-types-list > div").each(function () {
    if ($(this).find(".btn-success").length > 0) return;
    newEventTypesData.push({
      eventTypeId: $(this).data("id"),
      name: $(this).find(".event-type-name-input").val()?.toString() ?? "",
      color: $(this).find(".event-type-color-input").val()?.toString() ?? ""
    });
  });

  const data = {
    eventTypes: newEventTypesData
  };
  let hasResponded = false;

  $.ajax({
    url: "/events/set_event_type_data",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      eventTypeData(null);
      updateEventTypeList();
      $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");
      $("#event-types-save").html('<i class="fa-solid fa-circle-check"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#event-types-save").text("Speichern").prop("disabled", false);
      }, 1000);
    },
    error: xhr => {
      if (xhr.status === 401) {
        $navbarToasts.serverError.toast("show");
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
}

$("#event-types-save").on("click", () => {
  const deleted: string[] = [];
  $(".event-type-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "");
  });

  if (deleted.length == 0) {
    saveEventTypes();
  }
  else {
    $("#event-types-save-confirm-container, #event-types-save-confirm").removeClass("d-none");
    if (deleted.length == 1) {
      $("#event-types-save-confirm-list").html(`der Art <b>${$.formatHtml(deleted[0])}</b>`);
    }
    else {
      $("#event-types-save-confirm-list").html(
        "der Arten " +
          deleted
            .map(e => `<b>${$.formatHtml(e)}</b>`)
            .join(", ")
            .replace(/,(?!.*,)/, " und")
      );
    }
  }
});

$("#event-types-save-confirm").on("click", saveEventTypes);

// SUBJECTS

$("#subjects-toggle").on("click", function () {
  $("#subjects-list").toggleClass("d-none");
  $(this).toggleClass("rotate-90");
});

$("#new-subject").on("click", () => {
  $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

  $("#subjects-list .no-subjects").remove();

  const template = `
    <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="">
        <div class="d-flex flex-column flex-md-row align-items-md-center w-100 me-3">
          <div class="me-3 w-md-50">
            <div class="d-flex gap-3 mb-2">
              <div class="subject-inputs-label d-flex align-items-center">
                <span class="d-none d-lg-inline">Name</span>
                <a class="d-lg-none" data-bs-toggle="tooltip" data-bs-title="Name des Fachs"><i class="fa-solid fa-circle-info"></i></a>
              </div>
              <div class="d-inline-block">
                <input class="form-control form-control-sm subject-name-long-input"
                  type="text" placeholder="Fachname (lang)" data-id="">
                <div class="invalid-feedback">Der Fachname darf nicht leer sein!</div>
              </div>
              <input class="form-control form-control-sm h-fit-content d-inline-block subject-name-short-input"
                type="text" placeholder="kurz" data-id="">
            </div>
            <div class="d-flex gap-3 ${dsbActivated ? "mb-2" : ""}">
              <div class="subject-inputs-label d-flex align-items-center">
                <span class="d-none d-lg-inline">Lehrkraft</span>
                <a class="d-lg-none" data-bs-toggle="tooltip" data-bs-title="Name der Lehrkraft"><i class="fa-solid fa-circle-info"></i></a>
              </div>
              <div class="d-inline-block">
                <select class="form-control form-control-sm subject-teacher-gender-input" data-id="">
                  <option value="d" selected>-</option>
                  <option value="w">Frau</option>
                  <option value="m">Herr</option>
                </select>
              </div>
              <div class="d-inline-block">
                <input class="form-control form-control-sm h-fit-content subject-teacher-long-input"
                  type="text" placeholder="Lehrkraftname (lang)" data-id="">
                <div class="invalid-feedback">Der Lehrkraftname darf nicht leer sein!</div>
              </div>
              <input class="form-control form-control-sm h-fit-content subject-teacher-short-input"
                type="text" placeholder="kurz" data-id="">
            </div>
            <div class="d-flex gap-3 ${dsbActivated ? "" : "d-none"}">
              <div class="subject-inputs-label d-flex align-items-center">
                <span class="d-none d-lg-inline">Vertretung</span>
                <a class="d-lg-none" data-bs-toggle="tooltip" data-bs-title="Vertretungsoptionen"><i class="fa-solid fa-circle-info"></i></a>
              </div>
              <input class="form-control form-control-sm d-inline-block subject-name-substitution-input" data-id=""
                type="text" placeholder="Fachname (Vertretung)">
              <input class="form-control form-control-sm d-inline-block subject-teacher-substitution-input" data-id=""
                type="text" placeholder="Lehrkraftname (Vertretung)">
            </div>
          </div>
          <div class="w-md-50">
            <span class="text-success fw-bold mt-2 mt-md-0" data-id="">Neu</span>
          </div>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end new-subject-delete" data-id="">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`;
  $("#subjects-list").append(template);
  $(".subject-teacher-long-input").last().addClass("is-invalid");
  $(".subject-name-long-input").last().trigger("focus");

  $(".subject-name-long-input")
    .last()
    .on("focusout", function () {
      if ($(this).val()?.toString().trim() == "") {
        $(this).addClass("is-invalid");
        $("#subjects-save").addClass("disabled");
      }
    });

  $(".new-subject-delete")
    .off("click")
    .on("click", function () {
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");
      $(this).parent().remove();
      if ($("#subjects-list").children().length == 0) {
        $("#subjects-list").append('<span class="text-secondary no-subjects">Keine Fächer vorhanden</span>');
      }
    });
});

$("#subjects-cancel").on("click", () => {
  updateSubjectList();
  $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");
});

async function saveSubjects() {
  const newSubjectData: SubjectData = [];
  $("#subjects-list > div").each(function () {
    if ($(this).find(".btn-success").length > 0) return;

    const subjectNameLong = $(this).find(".subject-name-long-input").val()?.toString().trim() ?? "";

    let subjectNameShort = $(this).find(".subject-name-short-input").val()?.toString().trim();
    if (subjectNameShort == "") subjectNameShort = undefined;
    subjectNameShort ??= $(this).find(".subject-name-long-input").val()?.toString().trim().substring(0, 3) ?? "???";

    let teacherNameShort = $(this).find(".subject-teacher-short-input").val()?.toString().trim();
    if (teacherNameShort == "") teacherNameShort = undefined;
    teacherNameShort ??= $(this).find(".subject-teacher-long-input").val()?.toString().trim().substring(0, 3) ?? "???";

    let subjectNameSubstitution = $(this).find(".subject-name-substitution-input").val()?.toString();
    if (subjectNameSubstitution == "") subjectNameSubstitution = undefined;
    subjectNameSubstitution ??= subjectNameLong;

    let teacherNameSubstitution = $(this).find(".subject-teacher-substitution-input").val()?.toString();
    if (teacherNameSubstitution == "") teacherNameSubstitution = undefined;
    teacherNameSubstitution ??= teacherNameShort;

    newSubjectData.push({
      subjectId: $(this).data("id"),
      subjectNameLong: subjectNameLong,
      subjectNameShort: subjectNameShort ?? "???",
      teacherGender: ($(this).find(".subject-teacher-gender-input").val()?.toString() as "d" | "w" | "m") ?? "d",
      teacherNameLong: $(this).find(".subject-teacher-long-input").val()?.toString().trim() ?? "",
      teacherNameShort: teacherNameShort ?? "???",
      subjectNameSubstitution: subjectNameSubstitution.split(",").map(v => v.trim()),
      teacherNameSubstitution: teacherNameSubstitution.split(",").map(v => v.trim())
    });
  });

  const data = {
    subjects: newSubjectData
  };
  let hasResponded = false;

  $.ajax({
    url: "/subjects/set_subject_data",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      subjectData.reload();
      updateSubjectList();
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");
      $("#subjects-save").html('<i class="fa-solid fa-circle-check"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#subjects-save").text("Speichern").prop("disabled", false);
      }, 1000);
    },
    error: xhr => {
      if (xhr.status === 401) {
        $navbarToasts.serverError.toast("show");
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
}

$("#subjects-save").on("click", () => {
  const deleted: string[] = [];
  $(".subjects-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "");
  });

  if (deleted.length == 0) {
    saveSubjects();
  }
  else {
    $("#subjects-save-confirm-container, #subjects-save-confirm").removeClass("d-none");
    if (deleted.length == 1) {
      $("#subjects-save-confirm-list").html(`des Fachs <b>${$.formatHtml(deleted[0])}</b>`);
    }
    else {
      $("#subjects-save-confirm-list").html(
        "der Fächer " +
          deleted
            .map(e => `<b>${$.formatHtml(e)}</b>`)
            .join(", ")
            .replace(/,(?!.*,)/, " und")
      );
    }
  }
});

$("#subjects-save-confirm").on("click", saveSubjects);

// TIMETABLE

$("#timetable-toggle").on("click", function () {
  $("#timetable").toggleClass("d-none");
  $(this).toggleClass("rotate-90");
});

$("#timetable-cancel").on("click", () => {
  updateTimetable();
});

$("#timetable-save").on("click", async () => {
  const newTimetableData: LessonData = [];
  $("#timetable > div").each(function (weekDay) {
    $(this)
      .find(".timetable-lesson")
      .each(function () {
        newTimetableData.push({
          lessonId: -1,
          lessonNumber: parseInt($(this).find(".timetable-lesson-number").val()?.toString() ?? "1"),
          weekDay: weekDay as 0 | 1 | 2 | 3 | 4,
          teamId: parseInt($(this).find(".timetable-team-select").val()?.toString() ?? "-1"),
          subjectId: parseInt($(this).find(".timetable-subject-select").val()?.toString() ?? "-1"),
          room: $(this).find(".timetable-room").val()?.toString() ?? "",
          startTime: timeToMs($(this).find(".timetable-start-time").val()?.toString() ?? "0:0"),
          endTime: timeToMs($(this).find(".timetable-end-time").val()?.toString() ?? "0:0")
        });
      });
  });

  const data = {
    lessons: newTimetableData
  };
  let hasResponded = false;

  $.ajax({
    url: "/lessons/set_lesson_data",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      lessonData.reload();
      updateTimetable();
      $("#timetable-save-confirm-container, #timetable-save-confirm").addClass("d-none");
      $("#timetable-save").html('<i class="fa-solid fa-circle-check"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#timetable-save").text("Speichern").prop("disabled", false);
      }, 1000);
    },
    error: xhr => {
      if (xhr.status === 401) {
        $navbarToasts.serverError.toast("show");
      }
      else if (xhr.status === 500) {
        $navbarToasts.serverError.toast("show");
      }
      else {
        $navbarToasts.unknownError.toast("show");
      }
    },
    complete: () => {
      hasResponded = true;
    }
  });

  setTimeout(() => {
    if (!hasResponded) {
      $navbarToasts.serverError.toast("show");
    }
  }, 1000);
});
