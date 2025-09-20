import "./settings.scss";
import {
  colorTheme,
  EventTypeData,
  eventTypeData,
  JoinedTeamsData,
  joinedTeamsData,
  msToTime,
  SubjectData,
  subjectData,
  substitutionsData,
  TeamsData,
  teamsData,
  lessonData,
  timeToMs,
  LessonData,
  csrfToken,
  reloadAllFn,
  classMemberData
} from "../../global/global.js";
import { $navbarToasts, authUser, user } from "../../snippets/navbar/navbar.js";

async function updateColorTheme(): Promise<void> {
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

  if ((await colorTheme()) === "light") {
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

async function updateClassMemberList(): Promise<void> {
  const roles = ["Mitglied", "Bearbeiter:in", "Manager:in", "Admin"];
  let newClassMembersContent = "";

  for (const classMember of await classMemberData()) {
    const classMemberId = classMember.accountId;
    const isCurrentUser = classMember.username === user.username;
    const isDisabled = canEditMemberSettings && !isCurrentUser ? "" : "disabled";

    const roleOptionsHtml = roles.map((opt, index) =>
      `<option value="${index}" ${(classMember.permissionLevel ?? 0) === index ? "selected" : ""}>${opt}</option>`
    ).join("");

    const template = `
      <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="${classMemberId}">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center flex-grow-1">
          <div class="d-flex w-lg-50 pe-3 align-items-center">
            <span class="w-100">${$.formatHtml(classMember.username) + (isCurrentUser ? " <b>(Du)</b>" : "")}</span>
            <label class="form-text mt-0 d-flex align-items-center">
              Rolle:
              <select class="form-control form-control-sm class-member-role-input ms-2 w-fit-content${isCurrentUser ? " is-current-user": ""}"
                data-id="${classMemberId}" ${isDisabled}>
                ${roleOptionsHtml}
              </select>
            </label>
          </div>
          <span class="text-warning fw-bold mt-2 mt-lg-0 d-none me-2 class-member-changed" data-id="${classMemberId}">
            Rolle geändert
            <span class="text-secondary fw-normal class-member-changed-role" data-id="${classMemberId}">
              (${roles[classMember.permissionLevel ?? 0]} zu <b></b>)
            </span>
          </span>
          <span class="text-danger fw-bold mt-2 mt-lg-0 d-none class-member-kicked" data-id="${classMemberId}">Entfernt</span>
          <span class="form-text mt-2 mt-lg-0 pe-2 w-lg-50${isCurrentUser ? "" : " d-none"}">
            Du kannst deine eigenen Berechtigungen nicht ändern. Du kannst die Klasse unter "Schüler:in" verlassen.
          </span>
        </div>
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end class-member-kick${isCurrentUser ? " is-current-user": ""}"
            data-id="${classMemberId}" ${isDisabled} aria-label="Nutzer entfernen">
            <i class="fa-solid fa-user-minus" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `;
    newClassMembersContent += template;
  }

  $("#class-members-list").html(newClassMembersContent);

  $(document).off("change", ".class-member-role-input").on("change", ".class-member-role-input", async function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");
    $("#class-members-cancel").show();

    const classMemberId = $(this).data("id");
    const newRole = parseInt($(this).val()) as 0 | 1 | 2 | 3;
    const oldRole = (await classMemberData()).find(classMember => classMember.accountId === classMemberId)?.permissionLevel ?? 0;
    if (newRole !== oldRole) {
      if ($(`.class-member-kicked[data-id="${classMemberId}"]`).hasClass("d-none")) {
        $(`.class-member-changed[data-id="${classMemberId}"]`).removeClass("d-none");
        $(`.class-member-changed-role[data-id="${classMemberId}"]`)
          .removeClass("d-none")
          .find("b")
          .removeClass("d-none")
          .text(roles[newRole]);
      }
    }
    else {
      $(`.class-member-changed[data-id="${classMemberId}"]`).addClass("d-none");
      $(`.class-member-changed-role[data-id="${classMemberId}"]`).addClass("d-none");
    }
  });

  $(".class-member-kick").on("click", function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");
    $("#class-members-cancel").show();

    const classMemberId = $(this).data("id");
    if ($(this).hasClass("btn-danger")) {
      $(`.class-member-kicked[data-id="${classMemberId}"]`).removeClass("d-none");
      $(`.class-member-changed[data-id="${classMemberId}"]`).addClass("d-none").find("*").addClass("d-none");

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo" aria-hidden="true"></i>')
        .attr("aria-label", "Nutzer doch nicht entfernen");
    }
    else {
      $(`.class-member-kicked[data-id="${classMemberId}"]`).addClass("d-none");
      $(`.class-member-role-input[data-id="${classMemberId}"]`).trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-user-minus" aria-hidden="true"></i>')
        .attr("aria-label", "Nutzer entfernen");
    }
  });
}

async function updateTeamLists(): Promise<void> {
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
          <label>
            Name
            <input class="form-control form-control-sm d-inline w-fit-content ms-2 me-3 team-name-input" type="text"
              value="${$.formatHtml(team.name)}" placeholder="${$.formatHtml(team.name)}"
              data-id="${teamId}" ${canEditClassSettings ? "" : "disabled"}>
            <div class="invalid-feedback">Teamnamen dürfen nicht leer sein!</div>
          </label>
        </div>
          <span class="text-warning fw-bold mt-2 mt-md-0 d-none team-renamed" data-id="${teamId}">
            Umbenannt
            <span class="text-secondary fw-normal team-renamed-name" data-id="${teamId}">(${$.formatHtml(team.name)} zu <b></b>)</span>
          </span>
          <span class="text-danger fw-bold mt-2 mt-md-0 d-none team-deleted" data-id="${teamId}">Gelöscht</span>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end team-delete" data-id="${teamId}"
            ${canEditClassSettings ? "" : "disabled"} aria-label="Team entfernen">
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;
    newTeamsContent += template;
  }

  if (currentTeamsData.length === 0) {
    newTeamSelectionContent = newTeamsContent = '<span class="text-secondary no-teams">Keine Teams vorhanden</span>';
  }

  $("#team-selection-list").html(newTeamSelectionContent);
  $("#teams-list").html(newTeamsContent);

  $(document).off("change", ".team-name-input").on("change", ".team-name-input", async function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");

    if ($(this).val().trim() === "") {
      $(this).addClass("is-invalid");
      $("#teams-save").prop("disabled", true);
    }

    const teamId = $(this).data("id");
    if (teamId !== "") {
      const newName = $(this).val();
      const oldName = (await teamsData()).find(team => team.teamId === teamId)?.name;
      if (newName !== oldName) {
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

  $(document).off("input", ".team-name-input").on("input", ".team-name-input", function () {
    $("#teams-cancel").show();
    $(this).removeClass("is-invalid");
    if (!$(".team-name-input").hasClass("is-invalid")) {
      $("#teams-save").prop("disabled", false);
    }
  });

  $(".team-delete").on("click", function () {
    $("#teams-cancel").show();
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");

    const teamId = $(this).data("id");
    if ($(this).hasClass("btn-danger")) {
      $(`.team-deleted[data-id="${teamId}"]`).removeClass("d-none");
      $(`.team-renamed[data-id="${teamId}"]`).addClass("d-none").find("*").addClass("d-none");

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo" aria-hidden="true"></i>')
        .attr("aria-label", "Team doch nicht entfernen");
    }
    else {
      $(`.team-deleted[data-id="${teamId}"]`).addClass("d-none");
      $(`.team-name-input[data-id="${teamId}"]`).trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash" aria-hidden="true"></i>')
        .attr("aria-label", "Team entfernen");
    }
  });
}

async function updateEventTypeList(): Promise<void> {
  let newEventTypesContent = "";

  for (const eventType of await eventTypeData()) {
    const eventTypeId = eventType.eventTypeId;

    const template = `
      <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="${eventTypeId}">
        <div class="d-flex flex-column flex-lg-row align-items-lg-center">
          <div class="d-flex">
            <div>
              <label>
                Name
                <input class="form-control form-control-sm d-inline w-fit-content ms-2 me-3 event-type-name-input" type="text"
                  value="${$.formatHtml(eventType.name)}" placeholder="${$.formatHtml(eventType.name)}"
                  data-id="${eventTypeId}" ${canEditClassSettings ? "" : "disabled"}>
                <div class="invalid-feedback">Der Name darf nicht leer sein!</div>
              </label>
            </div>
            <label class="d-flex align-items-center">
              <div class="me-2">Farbe</div>
              <input type="text" value="${$.formatHtml(eventType.color)}" class="color-picker event-type-color-input"
                data-id="${eventTypeId}" ${canEditClassSettings ? "" : "disabled"}>
            </label>
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
              (<div class="color-display"></div>
              zu
              <div class="color-display"></div>)
            </span>
          </span>
          <span class="text-danger fw-bold mt-2 mt-md-0 d-none event-type-deleted" data-id="${eventTypeId}">Gelöscht</span>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end event-type-delete"
            data-id="${eventTypeId}" ${canEditClassSettings ? "" : "disabled"} aria-label="Ereignisart entfernen">
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;
    newEventTypesContent += template;
  }

  if ((await eventTypeData()).length === 0) {
    newEventTypesContent += '<span class="text-secondary no-event-types">Keine Ereignisarten vorhanden</span>';
  }
  $("#event-types-list").html(newEventTypesContent);

  $(document).off("change", ".event-type-name-input").on("change", ".event-type-name-input", async function () {
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");

    if ($(this).val().trim() === "") {
      $(this).addClass("is-invalid");
      $("#event-types-save").prop("disabled", true);
    }

    const eventTypeId = $(this).data("id");
    if (eventTypeId !== "") {
      const newName = $(this).val();
      const oldName = (await eventTypeData()).find(eventType => eventType.eventTypeId === eventTypeId)?.name;
      if (newName !== oldName) {
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

  $(document).off("input", ".event-type-name-input").on("input", ".event-type-name-input", function () {
    $("#event-types-cancel").show();
    $(this).removeClass("is-invalid");
    if (!$(".event-type-name-input").hasClass("is-invalid")) {
      $("#event-types-save").prop("disabled", false);
    }
  });

  $(document).off("change", ".event-type-color-input").on("change", ".event-type-color-input", async function () {
    $("#event-types-cancel").show();
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");

    const eventTypeId = $(this).data("id");
    if (eventTypeId !== "") {
      const newColor = $(this).val();
      const oldColor = (await eventTypeData()).find(eventType => eventType.eventTypeId === eventTypeId)?.color ?? "";
      if (newColor !== oldColor) {
        if ($(`.event-type-deleted[data-id="${eventTypeId}"]`).hasClass("d-none")) {
          const $recoloredElement = $(`.event-type-recolored[data-id="${eventTypeId}"]`);
          $recoloredElement.removeClass("d-none").find("*").removeClass("d-none");
          $recoloredElement.find(".color-display").first().css("background-color", oldColor);
          $recoloredElement.find(".color-display").last().css("background-color", newColor);
        }
      }
      else {
        $(`.event-type-recolored[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none");
      }
    }
  });

  $(".event-type-delete").on("click", function () {
    $("#event-types-cancel").show();
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");

    const eventTypeId = $(this).data("id");
    if ($(this).hasClass("btn-danger")) {
      $(`.event-type-deleted[data-id="${eventTypeId}"]`).removeClass("d-none");
      $(`.event-type-renamed[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none");
      $(`.event-type-recolored[data-id="${eventTypeId}"]`).addClass("d-none").find("*").addClass("d-none");

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo" aria-hidden="true"></i>')
        .attr("aria-label", "Ereginisart doch nicht entfernen");
    }
    else {
      $(`.event-type-deleted[data-id="${eventTypeId}"]`).addClass("d-none");
      $(`.event-type-name-input[data-id="${eventTypeId}"]`).trigger("change");
      $(`.event-type-color-input[data-id="${eventTypeId}"]`).trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash" aria-hidden="true"></i>')
        .attr("aria-label", "Ereginisart entfernen");
    }
  });
}

async function updateSubjectList(): Promise<void> {
  if ((await substitutionsData()).data !== "No data") {
    dsbActivated = true;
  }

  let newSubjectsContent = "";

  let currentSubjectData = await subjectData();
  currentSubjectData = currentSubjectData.sort((a, b) => a.subjectId - b.subjectId);
  for (const subject of currentSubjectData) {

    function getTemplate(): JQuery<HTMLElement> {
      function getHtmlFromValue(value: unknown, fallback: string): string {
        return $.formatHtml(value?.toString() ?? fallback);
      }
      const isDisabled = canEditClassSettings ? "" : "disabled";

      const teacherGenderOptions = [
        { value: "d", label: "-" },
        { value: "w", label: "Frau" },
        { value: "m", label: "Herr" }
      ];
      const teacherGenderOptionsHtml = teacherGenderOptions.map(opt => 
        `<option value="${opt.value}" ${subject.teacherGender === opt.value ? "selected" : ""}>${opt.label}</option>`
      ).join("");

      const subjectNameSubstitution = getHtmlFromValue(subject.subjectNameSubstitution, "keine Angabe");
      const teacherNameSubstitution = getHtmlFromValue(subject.teacherNameSubstitution, "keine Angabe");
      return $(`
        <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="${subjectId}">
          <div class="d-flex flex-column w-100 me-3">
            <div class="me-3">
              <div class="d-flex align-items-center gap-3 mb-2">
                <b>Fach</b>
                <label for="subject-name-long-input-${subject.subjectId}">Name</label>
                <div class="d-inline-block w-100">
                  <input class="form-control form-control-sm subject-name-long-input" type="text" id="subject-name-long-input-${subject.subjectId}"
                    value="${subjectNameLong}" placeholder="${subjectNameLong}" data-id="${subjectId}" ${isDisabled}>
                  <div class="invalid-feedback">Der Fachname darf nicht leer sein!</div>
                </div>
                <label for="subject-name-short-input-${subject.subjectId}">Abkürzung</label>
                <input class="form-control form-control-sm d-inline-block subject-name-short-input w-25" type="text"
                  id="subject-name-short-input-${subject.subjectId}" value="${subjectNameShort}" placeholder="${subjectNameShort}"
                  data-id="${subjectId}" ${isDisabled}>
              </div>
              <div class="d-flex gap-3 align-items-center ${dsbActivated ? "mb-2" : ""}">
                <b>Lehrkraft</b>
                <label for="subject-teacher-gender-input-${subject.subjectId}">Anrede</label>
                <div class="d-inline-block w-50">
                  <select class="form-control form-control-sm subject-teacher-gender-input" data-id="${subjectId}" ${isDisabled}
                    id="subject-teacher-gender-input-${subject.subjectId}">
                    ${teacherGenderOptionsHtml}
                  </select>
                </div>
                <label for="subject-teacher-long-input-${subject.subjectId}">Name</label>
                <div class="d-inline-block w-100">
                  <input class="form-control form-control-sm subject-teacher-long-input" type="text" value="${teacherNameLong}"
                    placeholder="${teacherNameLong}" data-id="${subjectId}" ${isDisabled} id="subject-teacher-long-input-${subject.subjectId}">
                  <div class="invalid-feedback">Der Lehrkraftname darf nicht leer sein!</div>
                </div>
                <label for="subject-teacher-short-input-${subject.subjectId}">Kürzel</label>
                <input class="form-control form-control-sm subject-teacher-short-input w-100" type="text" value="${teacherNameShort}"
                  placeholder="${teacherNameShort}" data-id="${subjectId}" ${isDisabled} id="subject-teacher-short-input-${subject.subjectId}">
              </div>
              <div class="d-flex gap-3 align-items-center ${dsbActivated ? "" : "d-none"}">
                <b>Vertretungen</b>
                <label for="subject-name-substitution-input-${subject.subjectId}">Fachname</label>
                <input class="form-control form-control-sm d-inline-block subject-name-substitution-input" data-id="${subjectId}"
                  type="text" value="${$.formatHtml(subject.subjectNameSubstitution?.toString() ?? "")}" ${isDisabled}
                  placeholder="${subjectNameSubstitution}" id="subject-name-substitution-input-${subject.subjectId}">
                <label for="subject-teacher-substitution-input-${subject.subjectId}">Lehrkraftname</label>
                <input class="form-control form-control-sm d-inline-block subject-teacher-substitution-input" data-id="${subjectId}"
                  type="text" value="${$.formatHtml(subject.teacherNameSubstitution?.toString() ?? "")}" ${isDisabled}
                  placeholder="${teacherNameSubstitution}" id="subject-teacher-substitution-input-${subject.subjectId}">
              </div>
            </div>
            <div>
              <div class="text-warning fw-bold mt-2 d-none subject-changed" data-id="${subjectId}">
                Geändert
                <span class="subject-changed-name-long">
                  ${$.formatHtml(subject.subjectNameLong)} zu <b></b>
                </span>
                <span class="subject-changed-name-short">
                  ${$.formatHtml(subject.subjectNameShort)} zu <b></b>
                </span>
                <span class="subject-changed-name-substitution">
                  ${subjectNameSubstitution} zu <b></b>
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
                  ${teacherNameSubstitution} zu <b></b>
                </span>
              </div>
              <div class="text-danger fw-bold mt-2 d-none subject-deleted" data-id="${subjectId}">Gelöscht</div>
            </div>
          </div
          <div>
            <button class="btn btn-sm btn-sm-square btn-danger float-end subject-delete"
              data-id="${subjectId}" ${isDisabled} aria-label="Fach entfernen">
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      `);
    }

    const subjectId = subject.subjectId;
    const subjectNameLong = $.formatHtml(subject.subjectNameLong);
    const subjectNameShort = $.formatHtml(subject.subjectNameShort);
    const teacherNameLong = $.formatHtml(subject.teacherNameLong);
    const teacherNameShort = $.formatHtml(subject.teacherNameShort);
    const template = getTemplate();
    template.find(".subject-changed").last().find("span").addClass("d-none").attr("data-id", subjectId);
    newSubjectsContent += template[0].outerHTML;
  }

  if ((await subjectData()).length === 0) {
    newSubjectsContent += '<span class="text-secondary no-subjects">Keine Fächer vorhanden</span>';
  }
  $("#subjects-list").html(newSubjectsContent);

  $(document).off("change", ".subject-name-long-input").on("change", ".subject-name-long-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

    if ($(this).val().trim() === "") {
      $(this).addClass("is-invalid");
      $("#subjects-save").prop("disabled", true);
    }

    const subjectId = $(this).data("id");
    if (subjectId !== "") {
      const newName = $(this).val();
      const oldName = (await subjectData()).find(subject => subject.subjectId === subjectId)?.subjectNameLong;
      if (newName !== oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
          $(`.subject-changed-name-long[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName);
        }
      }
      else {
        $(`.subject-changed-name-long[data-id="${subjectId}"]`).addClass("d-none");
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length === 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
        }
      }
    }
  });

  $(document).off("input", ".subject-name-long-input").on("input", ".subject-name-long-input", function () {
    $("#subjects-cancel").show();
    $(this).removeClass("is-invalid");
    if (!$(".subject-name-long-input, .subject-teacher-long-input").hasClass("is-invalid")) {
      $("#subjects-save").prop("disabled", false);
    }
  });

  $(document).off("change", ".subject-name-short-input").on("change", ".subject-name-short-input", async function () {
    $("#subjects-cancel").show();
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

    const subjectId = $(this).data("id");
    if (subjectId !== "") {
      const newName = $(this).val();
      const oldName = (await subjectData()).find(subject => subject.subjectId === subjectId)?.subjectNameShort;
      if (newName !== oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
          $(`.subject-changed-name-short[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName);
        }
      }
      else {
        $(`.subject-changed-name-short[data-id="${subjectId}"]`).addClass("d-none");
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length === 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
        }
      }
    }
  });

  $(document).off("change", ".subject-teacher-gender-input").on("change", ".subject-teacher-gender-input", async function () {
    $("#subjects-cancel").show();
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

    const subjectId = $(this).data("id");
    if (subjectId !== "") {
      const newGender = $(this).val() as "d" | "w" | "m";
      const oldGender = (await subjectData()).find(subject => subject.subjectId === subjectId)?.teacherGender;
      if (newGender !== oldGender) {
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
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length === 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
        }
      }
    }
  });

  $(document).off("change", ".subject-teacher-long-input").on("change", ".subject-teacher-long-input", async function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

    if ($(this).val().trim() === "") {
      $(this).addClass("is-invalid");
      $("#subjects-save").prop("disabled", true);
    }

    const subjectId = $(this).data("id");
    if (subjectId !== "") {
      const newName = $(this).val();
      const oldName = (await subjectData()).find(subject => subject.subjectId === subjectId)?.teacherNameLong;
      if (newName !== oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
          $(`.subject-changed-teacher-long[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName);
        }
      }
      else {
        $(`.subject-changed-teacher-long[data-id="${subjectId}"]`).addClass("d-none");
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length === 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
        }
      }
    }
  });

  $(document).off("input", ".subject-teacher-long-input").on("input", ".subject-teacher-long-input", function () {
    $("#subjects-cancel").show();
    $(this).removeClass("is-invalid");
    if (!$(".subject-name-long-input, .subject-teacher-long-input").hasClass("is-invalid")) {
      $("#subjects-save").prop("disabled", false);
    }
  });

  $(document).off("change", ".subject-teacher-short-input").on("change", ".subject-teacher-short-input", async function () {
    $("#subjects-cancel").show();
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

    const subjectId = $(this).data("id");
    if (subjectId !== "") {
      const newName = $(this).val();
      const oldName = (await subjectData()).find(subject => subject.subjectId === subjectId)?.teacherNameShort;
      if (newName !== oldName) {
        if ($(`.subject-deleted[data-id="${subjectId}"]`).hasClass("d-none")) {
          $(`.subject-changed[data-id="${subjectId}"]`).removeClass("d-none");
          $(`.subject-changed-teacher-short[data-id="${subjectId}"]`).removeClass("d-none").find("b").text(newName);
        }
      }
      else {
        $(`.subject-changed-teacher-short[data-id="${subjectId}"]`).addClass("d-none");
        if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length === 0) {
          $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
        }
      }
    }
  });

  if (dsbActivated) {
    $(document).off("change", ".subject-name-substitution-input").on("change", ".subject-name-substitution-input", async function () {
      $("#subjects-cancel").show();
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");
  
      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newName = $(this).val();
        const oldName =
            (await subjectData()).find(subject => subject.subjectId === subjectId)?.subjectNameSubstitution ??
            "keine Angabe";
        if (newName !== oldName) {
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
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length === 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });
  
    $(document).off("change", ".subject-teacher-substitution-input").on("change", ".subject-teacher-substitution-input", async function () {
      $("#subjects-cancel").show();
      $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");
  
      const subjectId = $(this).data("id");
      if (subjectId !== "") {
        const newName = $(this).val();
        const oldName =
            (await subjectData()).find(subject => subject.subjectId === subjectId)?.teacherNameSubstitution ??
            "keine Angabe";
        if (newName !== oldName) {
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
          if ($(`.subject-changed[data-id="${subjectId}"] span:not(.d-none)`).length === 0) {
            $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");
          }
        }
      }
    });
  }

  $(".subject-delete").on("click", function () {
    $("#subjects-cancel").show();
    $("#subjects-save-confirm-container, #subjectss-save-confirm").addClass("d-none");

    const subjectId = $(this).data("id");
    if ($(this).hasClass("btn-danger")) {
      $(`.subject-deleted[data-id="${subjectId}"]`).removeClass("d-none");
      $(`.subject-changed[data-id="${subjectId}"]`).addClass("d-none");

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo" aria-hidden="true"></i>')
        .attr("aria-label", "Fach doch nicht entfernen");
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

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash" aria-hidden="true"></i>')
        .attr("aria-label", "Fach entfernen");
    }
  });
}

async function updateTimetable(): Promise<void> {
  const newTimetableContent = $("<div></div>");

  let subjectOptions = "";
  (await subjectData()).forEach(subject => {
    subjectOptions += `<option value="${subject.subjectId}">${$.formatHtml(subject.subjectNameLong)}</option>`;
  });

  let teamOptions = "";

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
      .append(`
        <button class="btn btn-sm btn-success fw-semibold timetable-new-lesson"${canEditClassSettings ? "" : "disabled"}>
          Neue Stunde
        </button>`
      );
    $("#timetable").append(dayTemplate);
    newTimetableContent.append(dayTemplate);
  }

  (await lessonData()).forEach(lesson => {
    const lessonTemplate = $(`
      <div class="timetable-lesson card p-2 mb-2">
        <div class="d-flex mb-2 align-items-center">

          <label class="d-flex align-items-center">
            Stundennummer
          <input class="timetable-lesson-number form-control form-control-sm mx-2" type="number" min="1"
            value="${lesson.lessonNumber}" ${canEditClassSettings ? "" : "disabled"}>
          </label>
          <button class="btn btn-sm btn-danger timetable-lesson-delete" ${canEditClassSettings ? "" : "disabled"} aria-label="Stunde entfernen">
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="w-50 me-4">
            Von
            <input class="timetable-start-time form-control form-control-sm me-4" type="time"
              value="${msToTime(lesson.startTime)}" ${canEditClassSettings ? "" : "disabled"}>
          </label>
          <label class="w-50">
            Bis
            <input class="timetable-end-time form-control form-control-sm" type="time"
              value="${msToTime(lesson.endTime)}" ${canEditClassSettings ? "" : "disabled"}>
          </label>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="d-flex align-items-center w-100">
            Fach
            <select class="timetable-subject-select form-select form-select-sm ms-2" ${canEditClassSettings ? "" : "disabled"}>
              <option value="" disabled>Fach</option>
              <option value="-1">Pause</option>
              ${subjectOptions}
            </select>
          </label>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="d-flex align-items-center w-100">
            Raum
            <input class="timetable-room form-control form-control-sm ms-2" type="text" value="${$.formatHtml(lesson.room)}"
              ${canEditClassSettings ? "" : "disabled"}>
          </label>
        </div>
        <div class="d-flex align-items-center">
          <label class="d-flex align-items-center w-100">
            Team
            <select class="timetable-team-select form-select form-select-sm ms-2" ${canEditClassSettings ? "" : "disabled"}>
              <option value="-1">Alle</option>
              ${teamOptions}
            </select>
          </label>
        </div>
      </div>
    `);
    lessonTemplate.find(`.timetable-subject-select option[value=${lesson.subjectId}]`).attr("selected", "true");
    lessonTemplate.find(`.timetable-team-select option[value=${lesson.teamId}]`).attr("selected", "true");
    newTimetableContent.find(".timetable-lesson-list").eq(lesson.weekDay).append(lessonTemplate);
  });

  $(document)
    .off("input", ".timetable-lesson input, .timetable-lesson select")
    .on("input", ".timetable-lesson input, .timetable-lesson select", () => {
      $("#timetable-cancel").show();
    });

  $(document).off("click", ".timetable-new-lesson").on("click", ".timetable-new-lesson", function () {
    $("#timetable-cancel").show();
    const lessonTemplate = $(`
      <div class="timetable-lesson card p-2 mb-2">
        <div class="d-flex mb-2 align-items-center">
          <label class="d-flex align-items-center">
            Stundennummer
            <input class="timetable-lesson-number form-control form-control-sm mx-2" type="number" min="1">
          </label>
          <button class="btn btn-sm btn-danger timetable-lesson-delete" aria-label="Stunde entfernen">
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="w-50 me-4">
            Von
            <input class="timetable-start-time form-control form-control-sm" type="time">
          </label>
          <label class="w-50">
            Bis
            <input class="timetable-end-time form-control form-control-sm" type="time">
          </label>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="d-flex align-items-center w-100">
            Fach
            <select class="timetable-subject-select form-select form-select-sm ms-2">
              <option value="" disabled selected>Fach</option>
              <option value="-1">Pause</option>
              ${subjectOptions}
            </select>
          </label>
        </div>
        <div class="d-flex mb-2 align-items-center">
          <label class="d-flex align-items-center w-100">
            Raum
            <input class="timetable-room form-control form-control-sm ms-2" type="text">
          </label>
        </div>
        <div class="d-flex align-items-center">
          <label class="d-flex align-items-center w-100">
            Team
            <select class="timetable-team-select form-select form-select-sm ms-2">
              <option value="-1">Alle</option>
              ${teamOptions}
            </select>
          </label>
        </div>
      </div>
    `);
    function updateTimeInputs(newBtn: JQuery<HTMLElement>): void {
      newBtn.parent().parent().parent().find(".timetable-lesson").each(function () {
        if ($(this).find(".timetable-lesson-number").val() === lessonNumber.toString()) {
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

  $(document).off("click", ".timetable-lesson-delete").on("click", ".timetable-lesson-delete", function () {
    $("#timetable-cancel").show();
    $(this).parent().parent().remove();
  });
}

let dsbActivated = false;
let canEditClassSettings = false;
let canEditMemberSettings = false;

$(async () => {
  reloadAllFn.set(async () => {
    if (user.classJoined) {
      classMemberData.reload();
      teamsData.reload();
      joinedTeamsData.reload();
      eventTypeData.reload();
      subjectData.reload();
      substitutionsData.reload();
      lessonData.reload();
      await updateClassMemberList();
      await updateTeamLists();
      await updateEventTypeList();
      await updateSubjectList();
      await updateTimetable();
    }
  });
});

const qrCode = new QRCode("show-qrcode-modal-qrcode", {
  text: location.host,
  width: 300,
  height: 300
});
$("#show-qrcode-modal-qrcode img").attr("alt", "Der QR-Code, um eurer Klasse beizutreten");

$(".cancel-btn").hide();

user.on("change", async () => {
  $(".not-logged-in-info").toggle(!user.loggedIn).toggleClass("d-flex", !user.loggedIn);
  $("#settings-account").toggle(user.loggedIn ?? false);

  $("#change-username-button").show();
  $("#change-username").hide();

  $("#change-password-button").show();
  $("#change-password").hide();

  $("#delete-account-button").show();
  $("#delete-account").hide();

  if (user.classJoined !== null) {
    $(".not-joined-info").toggle(!user.classJoined).toggleClass("d-flex", !user.classJoined);
    $("#settings-student, #settings-class").toggle(user.classJoined);
  }
  if (user.classJoined) {
    $("#leave-class").hide();
    $("#delete-class").hide();
    $("#kick-logged-out-users").hide();
    $("#set-logged-out-users-role").hide();

    let classCode = "";

    $.get("/class/get_class_info")
      .done(res => {
        const resClassCode = res.classCode;
        $("#class-code").val(resClassCode);
        $("#invite-copy-link, #invite-qrcode").prop("disabled", false);
        classCode = resClassCode;

        qrCode.makeCode(location.host + `/join?class_code=${classCode}`);
        $("#show-qrcode-modal-title b").text(res.className);
        $("#class-settings-name").text(res.className);
      })
      .fail(() => {
        $("#class-code").val("Fehler beim Laden");
        $("#invite-copy-link, #invite-qrcode").prop("disabled", true);
      });

    $("#invite-copy-link").on("click", async () => {
      try {
        await navigator.clipboard.writeText(location.host + `/join?class_code=${classCode}`);
    
        $("#invite-copy-link").prop("disabled", true).html("<i class=\"fa-solid fa-check-circle\" aria-hidden=\"true\"></i> Einladungslink kopiert");
    
        setTimeout(() => {
          $("#invite-copy-link").prop("disabled", false).html("<i class=\"fa-solid fa-link\" aria-hidden=\"true\"></i> Einladungslink kopieren");
        }, 2000);
      }
      catch (err) {
        console.error("Error copying classcode to clipboard:", err);
      }
    });

    let loggedOutUsersRole;
    try {
      loggedOutUsersRole = await $.get("/class/get_logged_out_users_role");
    }
    catch {
      loggedOutUsersRole = 0;
    }
    finally {
      $(`#set-logged-out-users-role-select option[value="${loggedOutUsersRole}"]`).attr("selected", "");
    }

    const permissionLevel = user.permissionLevel ?? 0;
    if (permissionLevel < 2) {
      canEditClassSettings = false;
      $("#class-members-wrapper, #teams-wrapper, #event-types-wrapper, #subjects-wrapper, #timetable-wrapper")
        .find("input, button, select, .color-picker-trigger")
        .prop("disabled", true);
    }
    else {
      canEditClassSettings = true;
      $("#class-members-wrapper, #teams-wrapper, #event-types-wrapper, #subjects-wrapper, #timetable-wrapper")
        .find("input, button, select, .color-picker-trigger")
        .prop("disabled", false);
    }
    if (permissionLevel < 3) {
      canEditMemberSettings = false;
      $("#class-members-wrapper")
        .find("button, select")
        .prop("disabled", true);
    }
    else {
      canEditMemberSettings = true;
      $("#class-members-wrapper")
        .find("button, select")
        .prop("disabled", false);
    }
    $("#delete-class-button").prop("disabled", permissionLevel !== 3);
    $("#kick-logged-out-users-button").prop("disabled", permissionLevel !== 3);
    $("#set-logged-out-users-role-select").prop("disabled", permissionLevel !== 3);
    $(".is-current-user").prop("disabled", true);
  }
});

let animations = JSON.parse(localStorage.getItem("animations") ?? "true") ?? true;
$("#animations-check").prop("checked", animations);
$("#animations-check").on("click", function () {
  animations = $(this).prop("checked");
  localStorage.setItem("animations", animations);
});

let fontSize = JSON.parse(localStorage.getItem("fontSize") ?? "0") ?? 0;
$(`#font-size input[value=${fontSize}]`).prop("checked", true);
$("#font-size input").each(function () {
  $(this).on("click", () => {
    fontSize = $(this).val();
    localStorage.setItem("fontSize", fontSize);
    if (fontSize === "0") {
      $("html").css("font-size", "16px");
    }
    else if (fontSize === "1") {
      $("html").css("font-size", "19px");
    }
    else if (fontSize === "2") {
      $("html").css("font-size", "22px");
    }

    $("body").css({ paddingBottom: Math.max($(".bottombar").height() ?? 0, 0) + (displayFooter ? 0 : 70) + "px" });
  });
});

let highContrast = JSON.parse(localStorage.getItem("highContrast") ?? "false") ?? false;
$("#high-contrast-check").prop("checked", highContrast);
$("#high-contrast-check").on("click", function () {
  highContrast = $(this).prop("checked");
  localStorage.setItem("highContrast", JSON.stringify(highContrast));
  $("body").attr("data-high-contrast", JSON.stringify(highContrast));
});

let displayFooter = JSON.parse(localStorage.getItem("displayFooter") ?? "true") ?? true;
$("#display-footer-check").prop("checked", displayFooter);
$("#display-footer-check").on("click", function () {
  displayFooter = $(this).prop("checked");
  localStorage.setItem("displayFooter", displayFooter);
  $("footer").toggle(displayFooter);
  $("body").css({ paddingBottom: Math.max($(".bottombar").height() ?? 0, 0) + (displayFooter ? 0 : 70) + "px" });
});

const colorThemeSetting = localStorage.getItem("colorTheme") ?? "auto";
document.body.setAttribute("data-bs-theme", await colorTheme());
$("#color-theme-auto").prop("checked", colorThemeSetting === "auto");
$("#color-theme-dark").prop("checked", colorThemeSetting === "dark");
$("#color-theme-light").prop("checked", colorThemeSetting === "light");

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
      
      authUser();
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

// Change username
$("#change-username-button").on("click", function () {
  $(this).hide();
  $("#change-username").show();
  $("#change-username input").val("");
  $("#change-username-confirm").prop("disabled", true);
  $("#change-username-invalid-password").addClass("d-none");
  $("#change-username-invalid-username").addClass("d-none");
  $("#change-username-taken-username").addClass("d-none");
});

$("#change-username-cancel").on("click", () => {
  $("#change-username").hide();
  $("#change-username-button").show();
});

$("#change-username-password").on("input", () => {
  $("#change-username-invalid-password").addClass("d-none");
});

function checkUsername(username: string): boolean {
  return /^\w{4,20}$/.test(username);
}

$("#change-username-new-username").on("input", () => {
  $("#change-username-invalid-username").addClass("d-none");
  $("#change-username-taken-username").addClass("d-none");
});

$("#change-username-new-username").on("change", () => {
  if (! checkUsername($("#change-username-new-username").val()?.toString() ?? "")) {
    $("#change-username-invalid-username").removeClass("d-none");
  }
});

$("#change-username-password, #change-username-new-username").on("input change", function () {
  $("#change-username-confirm").prop("disabled", 
    $("#change-username-password, #change-username-new-username").map(
      function () {
        return $(this).val(); 
      }
    ).get().includes("")
    || $("#change-username-invalid-password").is(":visible")
    || $("#change-username-invalid-username").is(":visible")
    || $("#change-username-taken-username").is(":visible")
  );
});

$("#change-username-confirm").on("click", async () => {
  const data = {
    password: $("#change-username-password").val(),
    newUsername: $("#change-username-new-username").val()
  };
  let hasResponded = false;

  $.ajax({
    url: "/account/change_username",
    type: "POST",
    data: data,
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#change-username-success-toast").toast("show");
      $("#change-username-button").show();
      $("#change-username").hide();

      authUser();
    },
    error: xhr => {
      if (xhr.status === 401) {
        $("#change-username-invalid-password").removeClass("d-none");
        $("#change-username-confirm").prop("disabled", true);
      }
      else if (xhr.status === 409) {
        $("#change-username-taken-username").removeClass("d-none");
        $("#change-username-confirm").prop("disabled", true);
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

// Change password
$("#change-password-button").on("click", function () {
  $(this).hide();
  $("#change-password").show();
  $("#change-password input").val("");
  $("#change-password-confirm").prop("disabled", true);
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
  if ($("#change-password-new").val() !== $("#change-password-repeat").val()) {
    $("#change-password-not-matching-passwords").removeClass("d-none").addClass("d-flex");
    $("#change-password-confirm").prop("disabled", true);
  }
  if ($(this).val() === "") {
    $("#change-password-confirm").prop("disabled", true);
  }
});

$("#change-password-new, #change-password-repeat").on("input", () => {
  if ($("#change-password-new").val() === $("#change-password-repeat").val()) {
    $("#change-password-not-matching-passwords").addClass("d-none").removeClass("d-flex");
  }
});

function checkSecurePassword(password: string): boolean {
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
    function () {
      return $(this).val(); 
    }
  ).get().includes("")
        || $("#change-password-invalid-password").hasClass("d-flex")
        || $("#change-password-not-matching-passwords").hasClass("d-flex"))
  ) {
    $("#change-password-confirm").prop("disabled", false);
  }
});

$("#change-password-confirm").on("click", async () => {
  const data = {
    oldPassword: $("#change-password-old").val(),
    newPassword: $("#change-password-new").val()
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
      $("#change-password-button").show();
      $("#change-password").hide();
    },
    error: xhr => {
      if (xhr.status === 401) {
        $("#change-password-invalid-password").removeClass("d-none").addClass("d-flex");
        $("#change-password-confirm").prop("disabled", true);
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
  $("#delete-account-confirm").prop("disabled", true);
  $("#delete-account-invalid-password").addClass("d-none").removeClass("d-flex");
  $("#delete-account-still-in-class").addClass("d-none").removeClass("d-flex");
});

$("#delete-account-cancel").on("click", () => {
  $("#delete-account").hide();
  $("#delete-account-button").show();
});

$("#delete-account-password").on("change", function () {
  if ($(this).val() === "") {
    $("#delete-account-confirm").prop("disabled", true);
  }
});

$("#delete-account-password").on("input", function () {
  $("#delete-account-invalid-password").addClass("d-none").removeClass("d-flex");
  if ($(this).val() !== "") {
    $("#delete-account-confirm").prop("disabled", false);
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
      
      authUser();
    },
    error: xhr => {
      if (xhr.status === 401) {
        $("#delete-account-invalid-password").removeClass("d-none").addClass("d-flex");
        $("#delete-account-confirm").prop("disabled", true);
      }
      else if (xhr.status === 409) {
        $("#delete-account-still-in-class").removeClass("d-none").addClass("d-flex");
        $("#delete-account-confirm").prop("disabled", true);
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
        $("#team-selection-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
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
    $("#team-selection-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
    setTimeout(() => {
      $("#team-selection-save").text("Speichern").prop("disabled", false);
    }, 1000);
  }
});

// Leave class

$("#leave-class-button").on("click", function () {
  $(this).hide();
  $("#leave-class").show();
  $("#leave-class-confirm").prop("disabled", false);
  $("#leave-class-last-admin").addClass("d-none").removeClass("d-flex");
});

$("#leave-class-cancel").on("click", () => {
  $("#leave-class").hide();
  $("#leave-class-button").show();
});

$("#leave-class-confirm").on("click", async () => {
  let hasResponded = false;

  $.ajax({
    url: "/class/leave_class",
    type: "POST",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#leave-class-success-toast").toast("show");
      
      authUser();
    },
    error: xhr => {
      if (xhr.status === 409) {
        $("#leave-class-last-admin").removeClass("d-none").addClass("d-flex");
        $("#leave-class-confirm").prop("disabled", true);
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

// Delete class

$("#delete-class-button").on("click", function () {
  $(this).hide();
  $("#delete-class").show();
  $("#delete-class-confirm").prop("disabled", false);
});

$("#delete-class-cancel").on("click", () => {
  $("#delete-class").hide();
  $("#delete-class-button").show();
});

$("#delete-class-confirm").on("click", async () => {
  let hasResponded = false;

  $.ajax({
    url: "/class/delete_class",
    type: "POST",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#delete-class-success-toast").toast("show");
      
      authUser();
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

// Kick logged out users

$("#kick-logged-out-users-button").on("click", function () {
  $(this).hide();
  $("#kick-logged-out-users").show();
});

$("#kick-logged-out-users-cancel").on("click", () => {
  $("#kick-logged-out-users").hide();
  $("#kick-logged-out-users-button").show();
});

$("#kick-logged-out-users-confirm").on("click", async () => {
  let hasResponded = false;

  $.ajax({
    url: "/class/kick_logged_out_users",
    type: "POST",
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#kick-logged-out-users-success-toast").toast("show");
      $("#kick-logged-out-users").hide();
      $("#kick-logged-out-users-button").show();
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

// Set logged out users role

$("#set-logged-out-users-role-select").on("change", function () {
  if ($(this).find("option[selected]").is(":selected")) {
    $("#set-logged-out-users-role").hide();
  }
  else {
    $("#set-logged-out-users-role").show();
  }
});

$("#set-logged-out-users-role-cancel").on("click", () => {
  $("#set-logged-out-users-role-select").val($("#set-logged-out-users-role-select option[selected]").val() ?? "");
  $("#set-logged-out-users-role").hide();
});

$("#set-logged-out-users-role-confirm").on("click", async () => {
  let hasResponded = false;

  $.ajax({
    url: "/class/set_logged_out_users_role",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({role: parseInt($("#set-logged-out-users-role-select option:selected").val()?.toString() ?? "0")}),
    headers: {
      "X-CSRF-Token": await csrfToken()
    },
    success: () => {
      $("#set-logged-out-users-role-success-toast").toast("show");
      $("#set-logged-out-users-role").hide();
      $("#set-logged-out-users-role-button").show();
      const $newRole = $("#set-logged-out-users-role-select option:selected");
      $("#set-logged-out-users-role-select option[selected]").removeAttr("selected");
      $newRole.attr("selected", "");
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

// CLASS MEMBERS

$("#class-members-wrapper").hide();
$("#class-members-toggle").on("click", function () {
  $("#class-members-wrapper").toggle();
  $(this).toggleClass("rotate-90");
});

$("#class-members-cancel").on("click", () => {
  $("#class-members-cancel").hide();
  updateClassMemberList();
  $("#class-members-save-confirm-container, #class-members-save-confirm").addClass("d-none");
});

async function saveClassMembers(): Promise<void> {
  $("#class-members-cancel").hide();

  const classMembersKickData: { accountId: number }[] = [];
  const classMembersPermissionsData: {accountId: number, permissionLevel: 0 | 1 | 2 | 3 }[] = [];

  $(".class-member-role-input").each(function () {
    if ($(this).closest(".card").find(".class-member-kick.btn-success").length > 0) {
      classMembersKickData.push({
        accountId: $(this).data("id")
      });
    }
    else {
      classMembersPermissionsData.push({
        accountId: $(this).data("id"),
        permissionLevel: parseInt($(this).val()?.toString() ?? "") as 0 | 1 | 2 | 3
      });
    }
  });

  const kickData = {
    classMembers: classMembersKickData
  };
  const permissionsData = {
    classMembers: classMembersPermissionsData
  };
  let hasResponded = false;

  const csrf = await csrfToken();

  $.ajax({
    url: "/class/kick_class_members",
    type: "POST",
    data: JSON.stringify(kickData),
    contentType: "application/json",
    headers: {
      "X-CSRF-Token": csrf
    },
    success: () => {
      $.ajax({
        url: "/class/set_class_members_permission",
        type: "POST",
        data: JSON.stringify(permissionsData),
        contentType: "application/json",
        headers: {
          "X-CSRF-Token": csrf
        },
        success: () => {
          classMemberData.reload();
          updateClassMemberList();
          $("#class-members-save-confirm-container, #class-members-save-confirm").addClass("d-none");
          $("#class-members-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
          setTimeout(() => {
            $("#class-members-save").text("Speichern").prop("disabled", false);
          }, 1000);
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
}

$("#class-members-save").on("click", () => {
  const deleted: string[] = [];
  $(".class-member-kicked:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("span").eq(0).text());
  });

  if (deleted.length === 0) {
    saveClassMembers();
  }
  else {
    $("#class-members-save-confirm-container, #class-members-save-confirm").removeClass("d-none");
    if (deleted.length === 1) {
      $("#class-members-save-confirm-list").html(`wird der Schüler / die Schülerin <b>${$.formatHtml(deleted[0])}</b>`);
    }
    else {
      $("#class-members-save-confirm-list").html(
        "werden die Schüler:innen " +
          deleted
            .map(e => `<b>${$.formatHtml(e)}</b>`)
            .join(", ")
            .replace(/,(?!.*,)/, " und")
      );
    }
  }
});

$("#class-members-save-confirm").on("click", saveClassMembers);

// TEAMS

$("#teams-wrapper").hide();
$("#teams-toggle").on("click", function () {
  $("#teams-wrapper").toggle();
  $(this).toggleClass("rotate-90");
});

$("#new-team").on("click", () => {
  $("#teams-cancel").show();
  $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");

  $("#teams-list .no-teams").remove();

  const template = `
    <div class="card m-2 p-2 flex-row justify-content-between align-items-center">
      <div class="d-flex flex-column flex-md-row align-items-md-center">
        <div>
          <label>
            Name
            <input class="form-control form-control-sm d-inline w-fit-content ms-2 me-3 team-name-input"
              type="text" value="" placeholder="Neues Team" data-id="">
            <div class="invalid-feedback">Teamnamen dürfen nicht leer sein!</div>
          </label>
        </div>
        <span class="text-success fw-bold mt-2 mt-md-0" data-id="">Neu</span>
      </div
      <div>
        <button class="btn btn-sm btn-sm-square btn-danger float-end new-team-delete" data-id="" aria-label="Team entfernen">
          <i class="fa-solid fa-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>`;
  $("#teams-list").append(template);
  $(".team-name-input").last().trigger("focus");

  $(".team-name-input")
    .last()
    .on("focusout", function () {
      if ($(this).val()?.toString().trim() === "") {
        $(this).addClass("is-invalid");
        $("#teams-save").prop("disabled", true);
      }
    });

  $(".new-team-delete").off("click").on("click", function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");
    $(this).parent().remove();
    if ($("#teams-list").children().length === 0) {
      $("#teams-list").append('<span class="text-secondary no-teams">Keine Teams vorhanden</span>');
    }
  });
});

$("#teams-cancel").on("click", () => {
  $("#teams-cancel").hide();
  updateTeamLists();
  $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none");
});

async function saveTeams(): Promise<void> {
  $("#teams-cancel").hide();
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
      $("#teams-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
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
  }, 5000);
}

$("#teams-save").on("click", () => {
  const deleted: string[] = [];
  $(".team-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "");
  });

  if (deleted.length === 0) {
    saveTeams();
  }
  else {
    $("#teams-save-confirm-container, #teams-save-confirm").removeClass("d-none");
    if (deleted.length === 1) {
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

$("#event-types-wrapper").hide();
$("#event-types-toggle").on("click", function () {
  $("#event-types-wrapper").toggle();
  $(this).toggleClass("rotate-90");
});

$("#new-event-type").on("click", () => {
  $("#event-types-cancel").show();
  $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");

  $("#event-types-list .no-event-types").remove();

  const template = `
    <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="">
      <div class="d-flex flex-column flex-md-row align-items-md-center">
        <div class="d-flex">
          <div>
            <label>
              Name
              <input class="form-control form-control-sm d-inline w-fit-content ms-2 me-3 event-type-name-input"
                type="text" value="" placeholder="Neue Ereignisart" data-id="">
              <div class="invalid-feedback">Der Name darf nicht leer sein!</div>
            </label>
          </div>
          <label class="d-flex align-items-center">
            <div class="me-2">Farbe</div>
            <input type="text" value="#3bb9ca" class="color-picker event-type-color-input" data-id="">
          </label>
        </div>
        <span class="text-success fw-bold mt-2 mt-md-0" data-id="">Neu</span>
      </div
      <div>
        <button class="btn btn-sm btn-sm-square btn-danger float-end new-event-type-delete" data-id="" aria-label="Ereignisart entfernen">
          <i class="fa-solid fa-trash" aria-hidden="true"></i>
        </button>
      </div>
    </div>`;
  $("#event-types-list").append(template);
  $(".event-type-name-input").last().trigger("focus");

  $(".event-type-name-input")
    .last()
    .on("focusout", function () {
      if ($(this).val()?.toString().trim() === "") {
        $(this).addClass("is-invalid");
        $("#event-types-save").prop("disabled", true);
      }
    });

  $(".new-event-type-delete").off("click").on("click", function () {
    $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");
    $(this).parent().remove();
    if ($("#event-types-list").children().length === 0) {
      $("#event-types-list").append(
        '<span class="text-secondary no-event-types">Keine Ereignisarten vorhanden</span>'
      );
    }
  });
});

$("#event-types-cancel").on("click", () => {
  $("#event-types-cancel").hide();
  updateEventTypeList();
  $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");
});

async function saveEventTypes(): Promise<void> {
  $("#event-types-cancel").hide();
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
      eventTypeData.reload();
      updateEventTypeList();
      $("#event-types-save-confirm-container, #event-types-save-confirm").addClass("d-none");
      $("#event-types-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
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
  }, 5000);
}

$("#event-types-save").on("click", () => {
  const deleted: string[] = [];
  $(".event-type-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "");
  });

  if (deleted.length === 0) {
    saveEventTypes();
  }
  else {
    $("#event-types-save-confirm-container, #event-types-save-confirm").removeClass("d-none");
    if (deleted.length === 1) {
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

$("#subjects-wrapper").hide();
$("#subjects-toggle").on("click", function () {
  $("#subjects-wrapper").toggle();
  $(this).toggleClass("rotate-90");
});

$("#new-subject").on("click", () => {
  $("#subjects-cancel").show();
  $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");

  $("#subjects-list .no-subjects").remove();

  const uuid = crypto.randomUUID();

  const template = `
    <div class="card m-2 p-2 flex-row justify-content-between align-items-center" data-id="">
        <div class="d-flex flex-column w-100 me-3">
          <div class="me-3">
            <div class="d-flex align-items-center gap-3 mb-2">
              <b>Fach</b>
              <label for="subject-name-long-input-${uuid}">Name</label>
              <div class="d-inline-block w-100">
                <input class="form-control form-control-sm subject-name-long-input"
                  type="text" placeholder="Fachname (lang)" data-id="" id="subject-name-long-input-${uuid}">
                <div class="invalid-feedback">Der Fachname darf nicht leer sein!</div>
              </div>
              <label for="subject-name-short-input-${uuid}">Abkürzung</label>
              <input class="form-control form-control-sm h-fit-content d-inline-block subject-name-short-input w-25"
                type="text" placeholder="kurz" data-id="" id="subject-name-short-input-${uuid}">
            </div>
            <div class="d-flex gap-3 ${dsbActivated ? "mb-2" : ""}">
              <b>Lehrkraft</b>
              <label for="subject-teacher-gender-input-${uuid}">Anrede</label>
              <div class="d-inline-block w-50">
                <select class="form-control form-control-sm subject-teacher-gender-input" data-id="" id="subject-teacher-gender-input-${uuid}">
                  <option value="d" selected>-</option>
                  <option value="w">Frau</option>
                  <option value="m">Herr</option>
                </select>
              </div>
              <label for="subject-teacher-long-input-${uuid}">Anrede</label>
              <div class="d-inline-block w-100">
                <input class="form-control form-control-sm h-fit-content subject-teacher-long-input"
                  type="text" placeholder="Lehrkraftname (lang)" data-id="" id="subject-teacher-long-input-${uuid}">
                <div class="invalid-feedback">Der Lehrkraftname darf nicht leer sein!</div>
              </div>
              <label for="subject-teacher-short-input-${uuid}">Kürzel</label>
              <input class="form-control form-control-sm h-fit-content subject-teacher-short-input w-100"
                type="text" placeholder="kurz" data-id="" id="subject-teacher-short-input-${uuid}">
            </div>
            <div class="d-flex gap-3 ${dsbActivated ? "" : "d-none"}">
              <b>Vertretungen</b>
              <label for="subject-name-substitution-input-${uuid}">Fachname</label>
              <input class="form-control form-control-sm d-inline-block subject-name-substitution-input" data-id=""
                type="text" placeholder="Fachname (Vertretung)" id="subject-name-substitution-input-${uuid}">
              <label for="subject-teacher-substitution-input-${uuid}">Lehrkraftname</label>
              <input class="form-control form-control-sm d-inline-block subject-teacher-substitution-input" data-id=""
                type="text" placeholder="Lehrkraftname (Vertretung)" id="subject-teacher-substitution-input-${uuid}">
            </div>
          </div>
          <div>
            <div class="text-success fw-bold mt-2 mt-md-0" data-id="">Neu</div>
          </div>
        </div
        <div>
          <button class="btn btn-sm btn-sm-square btn-danger float-end new-subject-delete" data-id="" aria-label="Fach entfernen">
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;
  $("#subjects-list").append(template);
  $(".subject-teacher-long-input").last().addClass("is-invalid");
  $(".subject-name-long-input").last().trigger("focus");

  $(".subject-name-long-input")
    .last()
    .on("focusout", function () {
      if ($(this).val()?.toString().trim() === "") {
        $(this).addClass("is-invalid");
        $("#subjects-save").prop("disabled", true);
      }
    });

  $(".new-subject-delete").off("click").on("click", function () {
    $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");
    $(this).parent().remove();
    if ($("#subjects-list").children().length === 0) {
      $("#subjects-list").append('<span class="text-secondary no-subjects">Keine Fächer vorhanden</span>');
    }
  });
});

$("#subjects-cancel").on("click", () => {
  $("#subjects-cancel").hide();
  updateSubjectList();
  $("#subjects-save-confirm-container, #subjects-save-confirm").addClass("d-none");
});

async function saveSubjects(): Promise<void> {
  $("#subjects-cancel").hide();
  const newSubjectData: SubjectData = [];
  $("#subjects-list > div").each(function () {
    function getInputValueSelectorFallback(element: HTMLElement, selector: string, fallbackSelector: string): string {
      let res = $(element).find(selector).val()?.toString().trim();
      if (res === "") res = undefined;
      res ??= $(element).find(fallbackSelector).val()?.toString().trim().substring(0, 3) ?? "???";
      return res;
    }
    function getInputValueStringFallback(element: HTMLElement, selector: string, fallback: string): string {
      let res = $(element).find(selector).val()?.toString().trim();
      if (res === "") res = undefined;
      res ??= fallback;
      return res;
    }

    if ($(this).find(".btn-success").length > 0) return;

    const subjectNameLong = $(this).find(".subject-name-long-input").val()?.toString().trim() ?? "";

    const subjectNameShort = getInputValueSelectorFallback(this, ".subject-name-short-input", ".subject-name-long-input");
    const teacherNameShort = getInputValueSelectorFallback(this, ".subject-teacher-short-input", ".subject-teacher-long-input");
    const subjectNameSubstitution = getInputValueStringFallback(this, ".subject-name-substitution-input", subjectNameLong);
    const teacherNameSubstitution = getInputValueStringFallback(this, ".subject-teacher-substitution-input", teacherNameShort);

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
      $("#subjects-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
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
  }, 5000);
}

$("#subjects-save").on("click", () => {
  const deleted: string[] = [];
  $(".subjects-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder") ?? "");
  });

  if (deleted.length === 0) {
    saveSubjects();
  }
  else {
    $("#subjects-save-confirm-container, #subjects-save-confirm").removeClass("d-none");
    if (deleted.length === 1) {
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

$("#timetable-wrapper").hide();
$("#timetable-toggle").on("click", function () {
  $("#timetable-wrapper").toggle();
  $(this).toggleClass("rotate-90");
});

$("#timetable-cancel").on("click", () => {
  $("#timetable-cancel").hide();
  updateTimetable();
});

$("#timetable-save").on("click", async () => {
  $("#timetable-cancel").hide();
  const newTimetableData: LessonData = [];
  $("#timetable > div").each(function (weekDay) {
    $(this)
      .find(".timetable-lesson")
      .each(function () {
        function getInputValue(element: JQuery<HTMLElement>, fallback: string): string {
          return element.val()?.toString() ?? fallback;
        }
        newTimetableData.push({
          lessonId: -1,
          lessonNumber: parseInt(getInputValue($(this).find(".timetable-lesson-number"), "1")),
          weekDay: weekDay as 0 | 1 | 2 | 3 | 4,
          teamId: parseInt(getInputValue($(this).find(".timetable-team-select"), "-1")),
          subjectId: parseInt(getInputValue($(this).find(".timetable-subject-select"), "-1")),
          room: getInputValue($(this).find(".timetable-room"), ""),
          startTime: timeToMs(getInputValue($(this).find(".timetable-start-time"), "0:0")) + "",
          endTime: timeToMs(getInputValue($(this).find(".timetable-end-time"), "0:0")) + ""
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
      $("#timetable-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
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
  }, 5000);
});
