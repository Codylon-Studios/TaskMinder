import { addUpdateAllFunction, colorTheme, EventTypeData, eventTypeData, JoinedTeamsData, joinedTeamsData, msToTime, reloadAll, SubjectData, subjectData,
         substitutionsData, TeamsData, teamsData, lessonData, timeToMs, updateAll, userDataLoaded, 
         LessonData, initCSRF, getCSRFToken } from "../../global/global.js";
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js";

await initCSRF();

function updateColorTheme() {
  let colorTheme
  if ($("#color-theme-dark").prop("checked")) {
    colorTheme = "dark"
    localStorage.setItem("colorTheme", "dark");
  }
  else if ($("#color-theme-light").prop("checked")) {
    colorTheme = "light"
    localStorage.setItem("colorTheme", "light");
  }
  else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      colorTheme = "dark"
    }
    else {
      colorTheme = "light"
    }
    localStorage.setItem("colorTheme", "auto");
  }

  if (colorTheme == "light") {
    $("html").css({background: "#ffffff"});
    document.body.setAttribute("data-bs-theme", "light");
    $(`meta[name="theme-color"]`).attr("content", "#f8f9fa")
  }
  else {
    $("html").css({background: "#212529"});
    document.body.setAttribute("data-bs-theme", "dark");
    $(`meta[name="theme-color"]`).attr("content", "#2b3035")
  }
}

async function updateTeamLists() {
  $("#team-selection-list").empty()
  $("#teams-list").empty();

  const currentTeamsData = await teamsData()

  for (const team of currentTeamsData) {
    let teamId = team.teamId
    let selected = (await joinedTeamsData()).includes(teamId)
    let template = `
      <div class="form-check">
        <input type="checkbox" class="form-check-input" data-id="${teamId}" id="team-selection-team-${teamId}" ${(selected) ? "checked" : ""}>
        <label class="form-check-label" for="team-selection-team-${teamId}">
          ${team.name}
        </label>
      </div>`;
    $("#team-selection-list").append(template)

    template = `
      <div class="card m-2 p-2 flex-row justify-content-between align-items-center">
        <div class="d-flex flex-column flex-md-row align-items-md-center">
        <div>
          <input class="form-control form-control-sm d-inline w-fit-content me-3 team-name-input"
            type="text" value="${team.name}" placeholder="${team.name}" data-id="${teamId}">
          <div class="invalid-feedback">
            Teamnamen dürfen nicht leer sein!
          </div>
        </div>
          <span class="text-warning fw-bold mt-2 mt-md-0 d-none team-renamed" data-id="${teamId}">
            Umbenannt
            <span class="text-secondary fw-normal team-renamed-name" data-id="${teamId}">(${team.name} zu <b></b>)</span>
          </span>
          <span class="text-danger fw-bold mt-2 mt-md-0 d-none team-deleted" data-id="${teamId}">Gelöscht</span>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end team-delete" data-id="${teamId}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`
    $("#teams-list").append(template)
  }
  
  $(document).on("change", ".team-name-input", async function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none")

    if ($(this).val().trim() == "") {
      $(this).addClass("is-invalid")
      $("#teams-save").addClass("disabled")
    }

    let teamId = $(this).data("id")
    if (teamId !== "") {
      let newName = $(this).val()
      let oldName = (await teamsData()).find(team => team.teamId == teamId)?.name
      if (newName != oldName) {
        if ($(`.team-deleted[data-id="${teamId}"]`).hasClass("d-none")) {
          $(`.team-renamed[data-id="${teamId}"]`).removeClass("d-none").find("*").removeClass("d-none").find("b").text(newName)
        }
      }
      else {
        $(`.team-renamed[data-id="${teamId}"]`).addClass("d-none").find("*").addClass("d-none")
      }
    }
  })

  $(document).on("input", ".team-name-input", function () {
    $(this).removeClass("is-invalid")
    if (! $(".team-name-input").hasClass("is-invalid")) {
      $("#teams-save").removeClass("disabled")
    }
  })

  $(".team-delete").on("click", function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none")

    let teamId = $(this).data("id")
    if ($(this).hasClass("btn-danger")) {
      $(`.team-deleted[data-id="${teamId}"]`).removeClass("d-none")
      $(`.team-renamed[data-id="${teamId}"]`).addClass("d-none").find("*").addClass("d-none")

      $(this).removeClass("btn-danger").addClass("btn-success").html(`<i class="fa-solid fa-undo"></i>`)
    }
    else {
      $(`.team-deleted[data-id="${teamId}"]`).addClass("d-none")
      $(`.team-name-input[data-id="${teamId}"]`).trigger("change")

      $(this).removeClass("btn-success").addClass("btn-danger").html(`<i class="fa-solid fa-trash"></i>`)
    }
  })

  if ((await teamsData()).length == 0) {
    $("#team-selection-list, #teams-list").append(`<span class="text-secondary no-teams">Keine Teams vorhanden</span>`)
  }
}

async function updateEventTypeList() {
  $("#event-types-list").empty();

  for (const eventType of await eventTypeData()) {
    let eventTypeId = eventType.eventTypeId

    let template = `
      <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="${eventTypeId}">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center">
          <div class="d-flex">
            <div>
              <input class="form-control form-control-sm d-inline w-fit-content me-3 event-type-name-input"
                type="text" value="${eventType.name}" placeholder="${eventType.name}" data-id="${eventTypeId}">
              <div class="invalid-feedback">Der Name darf nicht leer sein!</div>
            </div>
            <input type="color" value="${eventType.color}" class="color-picker event-type-color-input" data-id="${eventTypeId}">
          </div>
          <span class="text-warning fw-bold mt-2 mt-md-0 d-none me-2 event-type-renamed" data-id="${eventTypeId}">
            Umbenannt
            <span class="text-secondary fw-normal event-type-renamed-name" data-id="${eventTypeId}">(${eventType.name} zu <b></b>)</span>
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
      </div>`
    $("#event-types-list").append(template)
  }
  
  $(document).on("change", ".event-type-name-input", async function () {
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none")

    if ($(this).val().trim() == "") {
      $(this).addClass("is-invalid")
      $("#event-types-save").addClass("disabled")
    }

    let eventTypeId = $(this).data("id")
    if (eventTypeId !== "") {
      let newName = $(this).val()
      let oldName = (await eventTypeData()).find(eventType => eventType.eventTypeId == eventTypeId)?.name
      if (newName != oldName) {
        if ($(`.event-type-deleted[data-id="${eventTypeId}"]`).hasClass("d-none")) {
          $(`.event-type-renamed[data-id="${eventTypeId}"]`).removeClass("d-none").find("*").removeClass("d-none").find("b").text(newName)
        }
      }
      else {
        $(`.event-type-renamed[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none")
      }
    }
  })

  $(document).on("input", ".event-type-name-input", function () {
    $(this).removeClass("is-invalid")
    if (! $(".event-type-name-input").hasClass("is-invalid")) {
      $("#event-types-save").removeClass("disabled")
    }
  })

  $(document).on("change", ".event-type-color-input", async function () {
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none")

    let eventTypeId = $(this).data("id")
    if (eventTypeId !== "") {
      let newColor = $(this).val()
      let oldColor = (await eventTypeData()).find(eventType => eventType.eventTypeId == eventTypeId)?.color ?? ""
      if (newColor != oldColor) {
        if ($(`.event-type-deleted[data-id="${eventTypeId}"]`).hasClass("d-none")) {
          let $recoloredElement = $(`.event-type-recolored[data-id="${eventTypeId}"]`)
          $recoloredElement.removeClass("d-none").find("*").removeClass("d-none")
          $recoloredElement.find(".event-type-recolored-color-display").first().css("background-color", oldColor)
          $recoloredElement.find(".event-type-recolored-color-display").last().css("background-color", newColor)
        }
      }
      else {
        $(`.event-type-recolored[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none")
      }
    }
  })

  $(".event-type-delete").on("click", function () {
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none")

    let eventTypeId = $(this).data("id")
    if ($(this).hasClass("btn-danger")) {
      $(`.event-type-deleted[data-id="${eventTypeId}"]`).removeClass("d-none")
      $(`.event-type-renamed[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none")
      $(`.event-type-recolored[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none")

      $(this).removeClass("btn-danger").addClass("btn-success").html(`<i class="fa-solid fa-undo"></i>`)
    }
    else {
      $(`.event-type-deleted[data-id="${eventTypeId}"]`).addClass("d-none")
      $(`.event-type-name-input[data-id="${eventTypeId}"]`).trigger("change")
      $(`.event-type-color-input[data-id="${eventTypeId}"]`).trigger("change")

      $(this).removeClass("btn-success").addClass("btn-danger").html(`<i class="fa-solid fa-trash"></i>`)
    }
  })

  if ((await eventTypeData()).length == 0) {
    $("#event-types-list").append(`<span class="text-secondary no-event-types">Keine Ereignisarten vorhanden</span>`)
  }
}

async function updateSubjectList() {
  if (await substitutionsData() !== "No data") {
    dsbActivated = true
  }
  $("#subjects-list").empty();

  const currentSubjectData = await subjectData()
  for (const subject of currentSubjectData) {
    let subjectId = subject.subjectId
    let template = `
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
                  type="text" value="${subject.subjectNameLong}" placeholder="${subject.subjectNameLong}" data-id="${subjectId}">
                <div class="invalid-feedback">Der Fachname darf nicht leer sein!</div>
              </div>
              <input class="form-control form-control-sm h-fit-content d-inline-block subject-name-short-input"
                type="text" value="${subject.subjectNameShort}" placeholder="${subject.subjectNameShort}" data-id="${subjectId}">
            </div>
            <div class="d-flex gap-3 ${dsbActivated ? "mb-2" : ""}">
              <div class="subject-inputs-label d-flex align-items-center">
                <span class="d-none d-lg-inline">Lehrkraft</span>
                <a class="d-lg-none" data-bs-toggle="tooltip" data-bs-title="Name der Lehrkraft"><i class="fa-solid fa-circle-info"></i></a>
              </div>
              <div class="d-inline-block">
                <select class="form-control form-control-sm subject-teacher-gender-input" data-id="${subjectId}">
                  <option value="d" ${subject.teacherGender == "d" ? "selected": ""}>-</option>
                  <option value="w" ${subject.teacherGender == "w" ? "selected": ""}>Frau</option>
                  <option value="m" ${subject.teacherGender == "m" ? "selected": ""}>Herr</option>
                </select>
              </div>
              <div class="d-inline-block">
                <input class="form-control form-control-sm h-fit-content subject-teacher-long-input"
                  type="text" value="${subject.teacherNameLong}" placeholder="${subject.teacherNameLong}" data-id="${subjectId}">
                <div class="invalid-feedback">Der Lehrkraftname darf nicht leer sein!</div>
              </div>
              <input class="form-control form-control-sm h-fit-content subject-teacher-short-input"
                type="text" value="${subject.teacherNameShort}" placeholder="${subject.teacherNameShort}" data-id="${subjectId}">
            </div>
            <div class="d-flex gap-3 ${dsbActivated ? "" : "d-none"}">
              <div class="subject-inputs-label d-flex align-items-center">
                <span class="d-none d-lg-inline">Vertretung</span>
                <a class="d-lg-none" data-bs-toggle="tooltip" data-bs-title="Vertretungsoptionen"><i class="fa-solid fa-circle-info"></i></a>
              </div>
              <input class="form-control form-control-sm d-inline-block subject-name-substitution-input" data-id="${subjectId}"
                type="text" value="${subject.subjectNameSubstitution ?? ""}" placeholder="${subject.subjectNameSubstitution ?? "keine Angabe"}">
              <input class="form-control form-control-sm d-inline-block subject-teacher-substitution-input" data-id="${subjectId}"
                type="text" value="${subject.teacherNameSubstitution ?? ""}" placeholder="${subject.teacherNameSubstitution ?? "keine Angabe"}">
            </div>
          </div>
          <div class="w-md-50">
            <span class="text-warning fw-bold mt-2 mt-md-0 d-none subject-changed" data-id="${subjectId}">
              Geändert
              <span class="subject-changed-name-long">${subject.subjectNameLong} zu <b></b></span>
              <span class="subject-changed-name-short">${subject.subjectNameShort} zu <b></b></span>
              <span class="subject-changed-name-substitution">${subject.subjectNameSubstitution ?? "keine Angabe"} zu <b></b></span>
              <span class="subject-changed-teacher-gender">${{"w": "Frau", "m": "Herr", "d": "Keine Anrede"}[subject.teacherGender]} zu <b></b></span>
              <span class="subject-changed-teacher-long">${subject.teacherNameLong} zu <b></b></span>
              <span class="subject-changed-teacher-short">${subject.teacherNameShort} zu <b></b></span>
              <span class="subject-changed-teacher-substitution">${subject.teacherNameSubstitution ?? "keine Angabe"} zu <b></b></span>
            </span>
            <span class="text-danger fw-bold mt-2 mt-md-0 d-none subject-deleted" data-id="${subjectId}">Gelöscht</span>
          </div>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end subject-delete" data-id="${subjectId}">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>`
    $("#subjects-list").append(template)
    $("#subjects-list").find(".subject-changed").last().find("span").addClass("d-none").attr("data-id", subjectId)
  }
  
  $(document).on("change", ".subject-name-long-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")

    if ($(this).val().trim() == "") {
      $(this).addClass("is-invalid")
      $("#subjects-save").addClass("disabled")
    }

    let subjectId = $(this).data("id")
    if (subjectId !== "") {
      let newName = $(this).val()
      let oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.subjectNameLong
      if (newName != oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none")
          $(`.subject-changed-name-long[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName)
        }
      }
      else {
        $(`.subject-changed-name-long[data-id="${subjectId}"]`).addClass("d-none")
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none")
        }
      }
    }
  })

  $(document).on("input", ".subject-name-long-input", function () {
    $(this).removeClass("is-invalid")
    if (! $(".subject-name-long-input, .subject-teacher-long-input").hasClass("is-invalid")) {
      $("#subjects-save").removeClass("disabled")
    }
  })
  
  $(document).on("change", ".subject-name-short-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")

    let subjectId = $(this).data("id")
    if (subjectId !== "") {
      let newName = $(this).val()
      let oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.subjectNameShort
      if (newName != oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none")
          $(`.subject-changed-name-short[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName)
        }
      }
      else {
        $(`.subject-changed-name-short[data-id="${subjectId}"]`).addClass("d-none")
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none")
        }
      }
    }
  })
  
  $(document).on("change", ".subject-teacher-gender-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")

    let subjectId = $(this).data("id")
    if (subjectId !== "") {
      let newGender = $(this).val() as "d" | "w" | "m"
      let oldGender = (await subjectData()).find(subject => subject.subjectId == subjectId)?.teacherGender
      if (newGender != oldGender) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none")
          $(`.subject-changed-teacher-gender[data-id="${subjectId}"]`).removeClass("d-none").find("b")
            .text({ "d": "Keine Anrede", "w": "Frau", "m": "Herr" }[newGender])
        }
      }
      else {
        $(`.subject-changed-teacher-gender[data-id="${subjectId}"]`).addClass("d-none")
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none")
        }
      }
    }
  })

  $(document).on("change", ".subject-teacher-long-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")

    if ($(this).val().trim() == "") {
      $(this).addClass("is-invalid")
      $("#subjects-save").addClass("disabled")
    }

    let subjectId = $(this).data("id")
    if (subjectId !== "") {
      let newName = $(this).val()
      let oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.teacherNameLong
      if (newName != oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none")
          $(`.subject-changed-teacher-long[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName)
        }
      }
      else {
        $(`.subject-changed-teacher-long[data-id="${subjectId}"]`).addClass("d-none")
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none")
        }
      }
    }
  })

  $(document).on("input", ".subject-teacher-long-input", function () {
    $(this).removeClass("is-invalid")
    if (! $(".subject-name-long-input, .subject-teacher-long-input").hasClass("is-invalid")) {
      $("#subjects-save").removeClass("disabled")
    }
  })

  $(document).on("change", ".subject-teacher-short-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")

    let subjectId = $(this).data("id")
    if (subjectId !== "") {
      let newName = $(this).val()
      let oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.teacherNameShort
      if (newName != oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none")
          $(`.subject-changed-teacher-short[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName)
        }
      }
      else {
        $(`.subject-changed-teacher-short[data-id="${subjectId}"]`).addClass("d-none")
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none")
        }
      }
    }
  })

  $(document).on("change", ".subject-name-substitution-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")

    let subjectId = $(this).data("id")
    if (subjectId !== "") {
      let newName = $(this).val()
      let oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.subjectNameSubstitution ?? "keine Angabe"
      if (newName != oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none")
          $(`.subject-changed-name-substitution[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName)
        }
      }
      else {
        $(`.subject-changed-name-substitution[data-id="${subjectId}"]`).addClass("d-none")
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none")
        }
      }
    }
  })

  $(document).on("change", ".subject-teacher-substitution-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")

    let subjectId = $(this).data("id")
    if (subjectId !== "") {
      let newName = $(this).val()
      let oldName = (await subjectData()).find(subject => subject.subjectId == subjectId)?.teacherNameSubstitution ?? "keine Angabe"
      if (newName != oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none")
          $(`.subject-changed-teacher-substitution[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName)
        }
      }
      else {
        $(`.subject-changed-teacher-substitution[data-id="${subjectId}"]`).addClass("d-none")
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length == 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none")
        }
      }
    }
  })

  $(".subject-delete").on("click", function () {
    $("#subjects-save-confirm-container, #subjectss-save-confirm").addClass("d-none")

    let subjectId = $(this).data("id")
    if ($(this).hasClass("btn-danger")) {
      $(`.subject-deleted[data-id="${subjectId}"]`).removeClass("d-none")
      $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none")

      $(this).removeClass("btn-danger").addClass("btn-success").html(`<i class="fa-solid fa-undo"></i>`)
    }
    else {
      $(`.subject-deleted[data-id="${subjectId}"]`).addClass("d-none")
      $(`.subject-name-long-input[data-id="${subjectId}"]`).trigger("change")
      $(`.subject-name-short-input[data-id="${subjectId}"]`).trigger("change")
      $(`.subject-teacher-gender-input[data-id="${subjectId}"]`).trigger("change")
      $(`.subject-teacher-long-input[data-id="${subjectId}"]`).trigger("change")
      $(`.subject-teacher-short-input[data-id="${subjectId}"]`).trigger("change")
      $(`.subject-name-substitution-input[data-id="${subjectId}"]`).trigger("change")
      $(`.subject-teacher-substitution-input[data-id="${subjectId}"]`).trigger("change")

      $(this).removeClass("btn-success").addClass("btn-danger").html(`<i class="fa-solid fa-trash"></i>`)
    }
  })

  if ((await subjectData()).length == 0) {
    $("#subject-selection-list, #subjects-list").append(`<span class="text-secondary no-subjects">Keine Fächer vorhanden</span>`)
  }
}

async function updateTimetable() {
  $("#timetable").empty();

  let subjectOptions: string = "";

  (await subjectData()).forEach(subject => {
    subjectOptions += `<option value="${subject.subjectId}">${subject.subjectNameLong}</option>`;
  });

  let teamOptions: string = "";

  (await teamsData()).forEach(team => {
    teamOptions += `<option value="${team.teamId}">${team.name}</option>`;
  });

  for (let dayId = 0; dayId < 5; dayId++) {
    const dayTemplate = $(`
      <div class="col p-1">
        <div class="card p-2">
          <div>${[ "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag" ][dayId]}</div>
          <hr class="mt-2">
          <div class="timetable-lesson-list">
          </div>
        </div>
      </div>
    `)
    dayTemplate.find(".card").append(`<button class="btn btn-sm btn-success fw-semibold timetable-new-lesson">Neu</button>`)
    $("#timetable").append(dayTemplate)
  }

  (await lessonData()).forEach(lesson => {
    let lessonTemplate = $(`
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
          <input class="timetable-room form-control form-control-sm" type="text" value="${lesson.room}">
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
    `)
    lessonTemplate.find(`.timetable-subject-select option[value=${lesson.subjectId}]`).prop("selected", true)
    lessonTemplate.find(`.timetable-team-select option[value=${lesson.teamId}]`).prop("selected", true)
    $(".timetable-lesson-list").eq(lesson.weekDay).append(lessonTemplate)
  })

  $(".timetable-new-lesson").on("click", function () {
    let lessonTemplate = $(`
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
    `)
    function updateTimeInputs(newBtn: JQuery<HTMLElement>) {
      newBtn.parent().parent().parent().find(".timetable-lesson").each(function () {
        if ($(this).find(".timetable-lesson-number").val() == lessonNumber.toString()) {
          lessonTemplate.find(".timetable-start-time").val($(this).find(".timetable-start-time").val() ?? "--:--")
          lessonTemplate.find(".timetable-end-time").val($(this).find(".timetable-end-time").val() ?? "--:--")
        }
      })
    }

    let lessonList = $(this).parent().find(".timetable-lesson-list")
    let previousLesson = lessonList.find(".timetable-lesson").last()
    let lessonNumber = parseInt(previousLesson.find(".timetable-lesson-number").val()?.toString() ?? "0") + 1
    lessonTemplate.find(".timetable-lesson-number").val(lessonNumber)
    lessonTemplate.find(".timetable-lesson-number").on("change", () => {
      lessonNumber = parseInt(lessonTemplate.find(".timetable-lesson-number").val()?.toString() ?? "1")
      updateTimeInputs($(this))
    })
    lessonTemplate.find(".timetable-start-time").val(previousLesson.find(".timetable-end-time").val() ?? "--:--")
    updateTimeInputs($(this))
    lessonList.append(lessonTemplate)
  })
  $(document).off("click", ".timetable-lesson-delete").on("click", ".timetable-lesson-delete", function () {
    $(this).parent().parent().remove()
  })
}

let dsbActivated = false;

$(() => {
  addUpdateAllFunction(
    () => {}
  )
  reloadAll();
})

$(async () => {
  await userDataLoaded()
  if (user.classJoined) {
    $(".not-joined-info").addClass("d-none")
    $("#settings-student, #settings-class").removeClass("d-none")
    addUpdateAllFunction(
      updateTeamLists,
      updateEventTypeList,
      updateSubjectList,
      updateTimetable
    )
    reloadAll();
  }
});

let animations = JSON.parse(localStorage.getItem("animations") ?? "true") ?? true;
$("#animations input").prop("checked", animations);
$("#animations input").on("click", function () {
  animations = $(this).prop("checked");
  localStorage.setItem("animations", animations)
})

let colorThemeSetting = localStorage.getItem("colorTheme") ?? "auto";
document.body.setAttribute("data-bs-theme", await colorTheme());
$("#color-theme-auto").prop("checked", colorThemeSetting == "auto") 
$("#color-theme-dark").prop("checked", colorThemeSetting == "dark") 
$("#color-theme-light").prop("checked", colorThemeSetting == "light")

$("#color-theme input").each(function () {
  $(this).on("click", () => {
    updateColorTheme();
  });
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", updateColorTheme)
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateColorTheme)

// TEAM SELECTION

$("#team-selection-save").on("click", () => {
  let newJoinedTeamsData: JoinedTeamsData = []
  $("#team-selection-list input").each(function () {
    if ($(this).prop("checked")) {
      newJoinedTeamsData.push(Number($(this).data("id")))
    }
  })

  if (user.loggedIn) {
    let data = {
      teams: newJoinedTeamsData,
    };
    let hasResponded = false;

    $.ajax({
      url: "/teams/set_joined_teams_data",
      type: "POST",
      data: JSON.stringify(data),
      contentType: "application/json",
      headers: {
        "X-CSRF-Token": getCSRFToken(),
      },
      success: () => {
        reloadAll()
        $("#team-selection-save").html(`<i class="fa-solid fa-circle-check"></i>`).prop("disabled", true);
        setTimeout(() => {
          $("#team-selection-save").html("Speichern").prop("disabled", false);
        }, 1000);
      },
      error: (xhr) => {
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
    localStorage.setItem("joinedTeamsData", JSON.stringify(joinedTeamsData))
    $("#team-selection-save").html(`<i class="fa-solid fa-circle-check"></i>`).prop("disabled", true);
    setTimeout(() => {
      $("#team-selection-save").html("Speichern").prop("disabled", false);
    }, 1000);
  }
  
  $("#team-selection-modal").modal("hide")
  updateAll()
})

// TEAMS

$("#new-team").on("click", () => {
  $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none")

  $("#teams-list .no-teams").remove()

  let template = `
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
    </div>`
  $("#teams-list").append(template)
  $(".team-name-input").last().trigger("focus")

  $(".team-name-input").last().on("focusout", function () {
    if ($(this).val()?.toString().trim() == "") {
      $(this).addClass("is-invalid")
      $("#teams-save").addClass("disabled")
    }
  })

  $(".new-team-delete").off("click").on("click", function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none")
    $(this).parent().remove()
    if ($("#teams-list").children().length == 0) {
      $("#teams-list").append(`<span class="text-secondary no-teams">Keine Teams vorhanden</span>`)
    }
  })
})

$("#teams-cancel").on("click", () => {
  updateTeamLists()
  $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none")
})

function saveTeams() {
  let newTeamsData: TeamsData = []
  $(".team-name-input").each(function () {
    if ($(this).parent().parent().find("~ .btn-success").length > 0) return
    newTeamsData.push({
      teamId: $(this).data("id"),
      name: $(this).val()?.toString() ?? ""
    })
  })
  
  let data = {
    teams: newTeamsData,
  };
  let hasResponded = false;

  $.ajax({
    url: "/teams/set_teams_data",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": getCSRFToken(),
    },
    success: () => {
      reloadAll()
      $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none")
      $("#teams-save").html(`<i class="fa-solid fa-circle-check"></i>`).prop("disabled", true);
      setTimeout(() => {
        $("#teams-save").html("Speichern").prop("disabled", false);
      }, 1000);
    },
    error: (xhr) => {
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
  let deleted: string[] = []
  $(".team-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "")
  })
  
  if (deleted.length == 0) {
    saveTeams()
  }
  else {
    $("#teams-save-confirm-container, #teams-save-confirm").removeClass("d-none")
    if (deleted.length == 1) {
      $("#teams-save-confirm-list").html(`des Teams <b>${deleted[0]}</b>`)
    }
    else {
      $("#teams-save-confirm-list").html("der Teams " + (deleted.map(e => `<b>${e}</b>`).join(", ").replace(/,(?!.*,)/, " und")))
    }
  }
})

$("#teams-save-confirm").on("click", saveTeams)

// EVENT TYPES

$("#new-event-type").on("click", () => {
  $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none")

  $("#event-types-list .no-event-types").remove()

  let template = `
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
          <input type="color" value="#3bb9ca" class="color-picker event-type-color-input" data-id="">
        </div>
        <span class="text-success fw-bold mt-2 mt-md-0" data-id="">Neu</span>
      </div
      <div>
        <button class="btn btn-sm btn-sm-square btn-danger float-end new-event-type-delete" data-id="">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`
  $("#event-types-list").append(template)
  $(".event-type-name-input").last().trigger("focus")

  $(".event-type-name-input").last().on("focusout", function () {
    if ($(this).val()?.toString().trim() == "") {
      $(this).addClass("is-invalid")
      $("#event-types-save").addClass("disabled")
    }
  })

  $(".new-event-type-delete").off("click").on("click", function () {
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none")
    $(this).parent().remove()
    if ($("#event-types-list").children().length == 0) {
      $("#event-types-list").append(`<span class="text-secondary no-event-types">Keine Ereignisarten vorhanden</span>`)
    }
  })
})

$("#event-types-cancel").on("click", () => {
  updateEventTypeList()
  $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none")
})

function saveEventTypes() {
  let newEventTypesData: EventTypeData = []
  $("#event-types-list > div").each(function () {
    if ($(this).find(".btn-success").length > 0) return
    newEventTypesData.push({
      eventTypeId: $(this).data("id"),
      name: $(this).find(".event-type-name-input").val()?.toString() ?? "",
      color: $(this).find(".event-type-color-input").val()?.toString() ?? ""
    })
  })
  
  let data = {
    eventTypes: newEventTypesData,
  };
  let hasResponded = false;

  $.ajax({
    url: "/events/set_event_type_data",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": getCSRFToken(),
    },
    success: () => {
      reloadAll()
      $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none")
      $("#event-types-save").html(`<i class="fa-solid fa-circle-check"></i>`).prop("disabled", true);
      setTimeout(() => {
        $("#event-types-save").html("Speichern").prop("disabled", false);
      }, 1000);
    },
    error: (xhr) => {
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
  let deleted: string[] = []
  $(".event-type-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "")
  })
  
  if (deleted.length == 0) {
    saveEventTypes()
  }
  else {
    $("#event-types-save-confirm-container, #event-types-save-confirm").removeClass("d-none")
    if (deleted.length == 1) {
      $("#event-types-save-confirm-list").html(`der Art <b>${deleted[0]}</b>`)
    }
    else {
      $("#event-types-save-confirm-list").html("der Arten " + (deleted.map(e => `<b>${e}</b>`).join(", ").replace(/,(?!.*,)/, " und")))
    }
  }
})

$("#event-types-save-confirm").on("click", saveEventTypes)

// SUBJECTS

$("#new-subject").on("click", () => {
  $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")

  $("#subjects-list .no-subjects").remove()

  let template = `
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
      </div>`
  $("#subjects-list").append(template)
  $(".subject-teacher-long-input").last().addClass("is-invalid")
  $(".subject-name-long-input").last().trigger("focus")

  $(".subject-name-long-input").last().on("focusout", function () {
    if ($(this).val()?.toString().trim() == "") {
      $(this).addClass("is-invalid")
      $("#subjects-save").addClass("disabled")
    }
  })

  $(".new-subject-delete").off("click").on("click", function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")
    $(this).parent().remove()
    if ($("#subjects-list").children().length == 0) {
      $("#subjects-list").append(`<span class="text-secondary no-subjects">Keine Fächer vorhanden</span>`)
    }
  })
})

$("#subjects-cancel").on("click", () => {
  updateSubjectList()
  $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")
})

function saveSubjects() {
  let newSubjectData: SubjectData = []
  $("#subjects-list > div").each(function () {
    if ($(this).find(".btn-success").length > 0) return

    let subjectNameLong = $(this).find(".subject-name-long-input").val()?.toString().trim() ?? ""

    let subjectNameShort = $(this).find(".subject-name-short-input").val()?.toString().trim()
    if (subjectNameShort == "") subjectNameShort = undefined
    subjectNameShort ??= $(this).find(".subject-name-long-input").val()?.toString().trim().substring(0, 3) ?? "???"

    let teacherNameShort = $(this).find(".subject-teacher-short-input").val()?.toString().trim()
    if (teacherNameShort == "") teacherNameShort = undefined
    teacherNameShort ??= $(this).find(".subject-teacher-long-input").val()?.toString().trim().substring(0, 3) ?? "???"

    let subjectNameSubstitution = $(this).find(".subject-name-substitution-input").val()?.toString()
    if (subjectNameSubstitution == "") subjectNameSubstitution = undefined
    subjectNameSubstitution ??= subjectNameLong

    let teacherNameSubstitution = $(this).find(".subject-teacher-substitution-input").val()?.toString()
    if (teacherNameSubstitution == "") teacherNameSubstitution = undefined
    teacherNameSubstitution ??= teacherNameShort

    newSubjectData.push({
      subjectId: $(this).data("id"),
      subjectNameLong: subjectNameLong,
      subjectNameShort: subjectNameShort ?? "???",
      teacherGender: $(this).find(".subject-teacher-gender-input").val()?.toString() as "d" | "w" | "m" ?? "d",
      teacherNameLong: $(this).find(".subject-teacher-long-input").val()?.toString().trim() ?? "",
      teacherNameShort: teacherNameShort ?? "???",
      subjectNameSubstitution: (subjectNameSubstitution).split(",").map(v => v.trim()),
      teacherNameSubstitution: (teacherNameSubstitution).split(",").map(v => v.trim())
    })
  })
  
  let data = {
    subjects: newSubjectData,
  };
  let hasResponded = false;

  $.ajax({
    url: "/subjects/set_subject_data",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": getCSRFToken(),
    },
    success: () => {
      reloadAll()
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none")
      $("#subjects-save").html(`<i class="fa-solid fa-circle-check"></i>`).prop("disabled", true);
      setTimeout(() => {
        $("#subjects-save").html("Speichern").prop("disabled", false);
      }, 1000);
    },
    error: (xhr) => {
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
  let deleted: string[] = []
  $(".subjects-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "")
  })
  
  if (deleted.length == 0) {
    saveSubjects()
  }
  else {
    $("#subjects-save-confirm-container, #subjects-save-confirm").removeClass("d-none")
    if (deleted.length == 1) {
      $("#subjects-save-confirm-list").html(`des Fachs <b>${deleted[0]}</b>`)
    }
    else {
      $("#subjects-save-confirm-list").html("der Fächer " + (deleted.map(e => `<b>${e}</b>`).join(", ").replace(/,(?!.*,)/, " und")))
    }
  }
})

$("#subjects-save-confirm").on("click", saveSubjects)

// TIMETABLE

$("#timetable-save").on("click", () => {
  let newTimetableData: LessonData = []
  $("#timetable > div").each(function (weekDay) {
    $(this).find(".timetable-lesson").each(function () {
      newTimetableData.push({
        lessonId: -1,
        lessonNumber: parseInt($(this).find(".timetable-lesson-number").val()?.toString() ?? "1"),
        weekDay: weekDay as 0 | 1 | 2 | 3 | 4,
        teamId: parseInt($(this).find(".timetable-team-select").val()?.toString() ?? "-1"),
        subjectId: parseInt($(this).find(".timetable-subject-select").val()?.toString() ?? "-1"),
        room: $(this).find(".timetable-room").val()?.toString() ?? "",
        startTime: timeToMs($(this).find(".timetable-start-time").val()?.toString() ?? "0:0"),
        endTime: timeToMs($(this).find(".timetable-end-time").val()?.toString() ?? "0:0")
      })
    })
  })
  
  let data = {
    lessons: newTimetableData,
  };
  let hasResponded = false;

  $.ajax({
    url: "/lessons/set_lesson_data",
    type: "POST",
    data: JSON.stringify(data),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": getCSRFToken(),
    },
    success: () => {
      reloadAll()
      $("#timetable-save-confirm-container, #timetable-save-confirm").addClass("d-none")
      $("#timetable-save").html(`<i class="fa-solid fa-circle-check"></i>`).prop("disabled", true);
      setTimeout(() => {
        $("#timetable-save").html("Speichern").prop("disabled", false);
      }, 1000);
    },
    error: (xhr) => {
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
})
