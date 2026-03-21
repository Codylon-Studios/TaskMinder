import {
  colorTheme,
  ColorTheme,
  eventTypeData,
  joinedTeamsData,
  msToTime,
  subjectData,
  substitutionsData,
  teamsData,
  lessonData,
  timeToMs,
  classMemberData,
  getTimeLeftString,
  escapeHTML,
  getInputValue,
  socket,
  onlyThisSite,
  unsavedChanges,
  ajax,
  $cloneTemplate,
  toCommaAndAnd,
  classInfo
} from "../../global/global.js";
import { JoinedTeamsData, TeamsData, EventTypeData, SubjectData, LessonData, ClassMemberPermissionLevel, AjaxError } from "../../global/types";
import { user } from "../../snippets/navbar/navbar.js";

function checkUsername(username: string): boolean {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"<>,.?/-]).{8,}$/.test(password);
}

async function updateColorTheme(): Promise<void> {
  if ($("#color-theme-dark").prop("checked")) {
    colorTheme(ColorTheme.DARK);
    localStorage.setItem("colorTheme", ColorTheme.DARK);
  }
  else if ($("#color-theme-light").prop("checked")) {
    colorTheme(ColorTheme.LIGHT);
    localStorage.setItem("colorTheme", ColorTheme.LIGHT);
  }
  else {
    if (globalThis.matchMedia("(prefers-color-scheme: dark)").matches) {
      colorTheme(ColorTheme.DARK);
    }
    else {
      colorTheme(ColorTheme.LIGHT);
    }
    localStorage.setItem("colorTheme", "auto");
  }

  if ((await colorTheme()) === ColorTheme.LIGHT) {
    $("html").css({ background: "#ffffff" });
    document.body.dataset.bsTheme = ColorTheme.LIGHT;
    $('meta[name="theme-color"]').attr("content", "#f8f9fa");
  }
  else {
    $("html").css({ background: "#212529" });
    document.body.dataset.bsTheme = ColorTheme.DARK;
    $('meta[name="theme-color"]').attr("content", "#2b3035");
  }
}

async function renderClassMemberList(): Promise<void> {
  function $changes(id: number): JQuery<HTMLElement> {
    return $(`.class-member-changes[data-id="${id}"]`);
  }
  function $changedRole(id: number): JQuery<HTMLElement> {
    return $(`.class-member-changed-role[data-id="${id}"]`);
  }
  function $kicked(id: number): JQuery<HTMLElement> {
    return $(`.class-member-kicked[data-id="${id}"]`);
  }

  function toggleChangesContainer(id: number): void {
    const $el = $changes(id);
    $el.show().toggle($el.children().is(":visible"));
  }

  function changedAnything(): void {
    $("#class-members-cancel").show();
    unsavedChanges(true);
    $("#class-members-save-confirm-container, #class-members-save-confirm").hide();
  }

  const currentClassMemberData = await classMemberData();

  const roles = ["Mitglied", "Bearbeiter:in", "Manager:in", "Admin"];
  let newClassMembersContent = $("<div></div>");

  for (const classMember of currentClassMemberData) {
    const classMemberId = classMember.accountId;
    const isCurrentUser = classMember.username === user.username;
    const isMe = user.username == classMember.username

    const t = $cloneTemplate("#class-member-template", { dataId: classMemberId.toString(), disabled: !canEditClassSettings });
    t.find(".class-member-name").html(escapeHTML(classMember.username) + (isCurrentUser ? " <b>(Du)</b>" : ""));
    t.find(".class-member-role-input").val(classMember.permissionLevel ?? 0)
    t.find(".class-member-is-current-user").toggle(isMe)
    t.find(".class-member-changes").hide();
    t.find(".class-member-changed-role-old").text(roles[classMember.permissionLevel ?? 0]);
    if (isMe) {
      t.find(".class-member-role-input, .class-member-kick").attr("disabled", "").addClass("is-current-user")
    }
    newClassMembersContent.append(t);
  }

  $("#class-members-list").empty().append(newClassMembersContent.children());

  $(".class-member-changes > div").hide();
  $("#class-members-cancel").hide();
  $("#class-members-save-confirm-container, #class-members-save-confirm").hide();

  $("#app").off("input", ".class-member-role-input").on("change", ".class-member-role-input", async function () {
    changedAnything();

    const id = $(this).data("id");
    if (id !== "") {
      const newRole = Number.parseInt($(this).val()) as ClassMemberPermissionLevel;
      const oldRole = currentClassMemberData.find(classMember => classMember.accountId === id)?.permissionLevel;
      if (newRole === oldRole) {
        $changedRole(id).hide();
      }
      else if (! $kicked(id).is(":visible")) {
        $changedRole(id).show().find("b").text(roles[newRole]);
      }
      toggleChangesContainer(id);
    }
  });

  $(".class-member-kick").on("click", function () {
    changedAnything();

    const classMember = $(this).closest(".class-member");
    const id = $(this).data("id");
    if (classMember.hasClass("is-kicked")) {
      $kicked(id).hide();
      $(".class-member-role-input").filter(`[data-id="${id}"]`).trigger("input").trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-user-minus" aria-hidden="true"></i>')
        .attr("aria-label", "Nutzer entfernen");

      classMember.removeClass("is-kicked");
    }
    else {
      $changes(id).find("> div").hide();
      $kicked(id).show();

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo" aria-hidden="true"></i>')
        .attr("aria-label", "Nutzer doch nicht entfernen");
      
      classMember.addClass("is-kicked");
    }
    toggleChangesContainer(id);
  });
}

async function renderTeamSelectionList(): Promise<void> {
  let newTeamSelectionContent = $("<div></div>");

  const currentTeamsData = await teamsData();

  for (const team of currentTeamsData) {
    const teamId = team.teamId;
    const name = team.name;
    const selected = (await joinedTeamsData()).includes(teamId);
    newTeamSelectionContent.append(`
      <div class="form-check">
        <input type="checkbox" class="form-check-input" data-id="${teamId}" id="team-selection-team-${teamId}" ${selected ? "checked" : ""}>
        <label class="form-check-label" for="team-selection-team-${teamId}">
          ${escapeHTML(name)}
        </label>
      </div>`);
  }

  if (currentTeamsData.length === 0) {
    newTeamSelectionContent = $('<div><span class="text-secondary no-teams">Keine Teams vorhanden</span></div>');
  }

  $("#team-selection-list").empty().append(newTeamSelectionContent.children());
}

async function renderTeamList(): Promise<void> {
  function $changes(id: number): JQuery<HTMLElement> {
    return $(`.team-changes[data-id="${id}"]`);
  }
  function $renamed(id: number): JQuery<HTMLElement> {
    return $(`.team-renamed[data-id="${id}"]`);
  }
  function $deleted(id: number): JQuery<HTMLElement> {
    return $(`.team-deleted[data-id="${id}"]`);
  }

  function toggleChangesContainer(id: number): void {
    const $el = $changes(id);
    $el.show().toggle($el.children().is(":visible"));
  }

  function changedAnything(): void {
    $("#teams-cancel").show();
    unsavedChanges(true);
    $("#teams-save-confirm-container, #teams-save-confirm").hide();
  }

  const currentTeamsData = await teamsData();

  let newTeamsContent = $("<div></div>");

  for (const team of currentTeamsData) {
    const teamId = team.teamId;
    const name = team.name;

    const t = $cloneTemplate("#team-template", { dataId: teamId.toString(), disabled: !canEditClassSettings });
    t.find(".team-name-input").val(name).attr("placeholder", name);
    t.find(".team-changes").hide();
    t.find(".team-renamed-name-old").text(name);
    newTeamsContent.append(t);
  }

  if (currentTeamsData.length === 0) {
    newTeamsContent = $('<div><span class="text-secondary no-teams">Keine Teams vorhanden</span></div>');
  }

  $("#teams-list").empty().append(newTeamsContent.children());

  $(".team-changes > div").hide();
  $("#teams-cancel").hide();
  $("#teams-save-confirm-container, #teams-save-confirm").hide();

  $("#app").off("input", ".team-name-input").on("input", ".team-name-input", async function () {
    changedAnything();
    
    $(this).toggleClass("is-invalid", $(this).val().trim() === "");
    $("#teams-save").prop("disabled", $(".team-name-input").hasClass("is-invalid"));

    const id = $(this).data("id");
    if (id !== "") {
      const newName = $(this).val();
      const oldName = currentTeamsData.find(team => team.teamId === id)?.name;
      if (newName === oldName) {
        $renamed(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $renamed(id).show().find("b").text(newName);
      }
      toggleChangesContainer(id);
    }
  });

  $(".team-delete").on("click", function () {
    changedAnything();

    const team = $(this).closest(".team");
    const id = $(this).data("id");
    if (team.hasClass("is-deleted")) {
      $deleted(id).hide();
      $(".team-name-input, .team-color-input").filter(`[data-id="${id}"]`).trigger("input").trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash" aria-hidden="true"></i>')
        .attr("aria-label", "Team entfernen");

      team.removeClass("is-deleted");
    }
    else {
      $changes(id).find("> div").hide();
      $deleted(id).show();

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo" aria-hidden="true"></i>')
        .attr("aria-label", "Team doch nicht entfernen");
      
      team.addClass("is-deleted");
    }
    toggleChangesContainer(id);
  });
}

async function renderEventTypeList(): Promise<void> {
  function $changes(id: number): JQuery<HTMLElement> {
    return $(`.event-type-changes[data-id="${id}"]`);
  }
  function $renamed(id: number): JQuery<HTMLElement> {
    return $(`.event-type-renamed[data-id="${id}"]`);
  }
  function $recolored(id: number): JQuery<HTMLElement> {
    return $(`.event-type-recolored[data-id="${id}"]`);
  }
  function $deleted(id: number): JQuery<HTMLElement> {
    return $(`.event-type-deleted[data-id="${id}"]`);
  }

  function toggleChangesContainer(id: number): void {
    const $el = $changes(id);
    $el.show().toggle($el.children().is(":visible"));
  }

  function changedAnything(): void {
    $("#event-types-cancel").show();
    unsavedChanges(true);
    $("#event-types-save-confirm-container, #event-types-save-confirm").hide();
  }

  const currentEventTypeData = await eventTypeData();

  let newEventTypesContent = $("<div></div>");

  for (const eventType of currentEventTypeData) {
    const eventTypeId = eventType.eventTypeId;
    const name = escapeHTML(eventType.name);
    const color = eventType.color;

    const t = $cloneTemplate("#event-type-template", { dataId: eventTypeId.toString(), disabled: !canEditClassSettings });
    t.find(".event-type-name-input").val(name).attr("placeholder", name);
    t.find(".event-type-color-input").attr("value", escapeHTML(color));
    t.find(".event-type-changes").hide();
    t.find(".event-type-renamed-name-old").text(name);
    t.find(".event-type-recolored-color-old").css("background-color", color);
    newEventTypesContent.append(t);
  }

  if (currentEventTypeData.length === 0) {
    newEventTypesContent = $(`<div>
      <span class="text-secondary no-event-types d-flex align-items-center">
        Keine Ereignisarten vorhanden
        <button class="btn btn-primary btn-sm fw-semibold ms-2" id="event-types-example">Beispiele erstellen</button>
      </span>
    </div>`);
  }
  $("#event-types-list").empty().append(newEventTypesContent.children());

  $(".event-type-changes > div").hide();
  $("#event-types-cancel").hide();
  $("#event-types-save-confirm-container, #event-types-save-confirm").hide();

  $("#app").off("input", ".event-type-name-input").on("input", ".event-type-name-input", async function () {
    changedAnything();
    
    $(this).toggleClass("is-invalid", $(this).val().trim() === "");
    $("#event-types-save").prop("disabled", $(".event-type-name-input").hasClass("is-invalid"));

    const id = $(this).data("id");
    if (id !== "") {
      const newName = $(this).val();
      const oldName = currentEventTypeData.find(eventType => eventType.eventTypeId === id)?.name;
      if (newName === oldName) {
        $renamed(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $renamed(id).show().find("b").text(newName);
      }
      toggleChangesContainer(id);
    }
  });

  $("#app").off("change", ".event-type-color-input").on("change", ".event-type-color-input", async function () {
    changedAnything();

    const id = $(this).data("id");
    if (id !== "") {
      const newColor = $(this).val();
      const oldColor = currentEventTypeData.find(eventType => eventType.eventTypeId === id)?.color ?? "";
      if (newColor === oldColor) {
        $recolored(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $recolored(id).show().find(".event-type-recolored-color-new").css("background-color", newColor);
      }
      toggleChangesContainer(id);
    }
  });

  $(".event-type-delete").on("click", function () {
    changedAnything();

    const eventType = $(this).closest(".event-type");
    const id = $(this).data("id");
    if (eventType.hasClass("is-deleted")) {
      $deleted(id).hide();
      $(".event-type-name-input, .event-type-color-input").filter(`[data-id="${id}"]`).trigger("input").trigger("change");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash" aria-hidden="true"></i>')
        .attr("aria-label", "Ereignisart entfernen");

      eventType.removeClass("is-deleted");
    }
    else {
      $changes(id).find("> div").hide();
      $deleted(id).show();

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo" aria-hidden="true"></i>')
        .attr("aria-label", "Ereignisart doch nicht entfernen");
      
      eventType.addClass("is-deleted");
    }
    toggleChangesContainer(id);
  });
}

async function renderSubjectList(): Promise<void> {
  function $changes(id: number): JQuery<HTMLElement> {
    return $(`.subject-changes[data-id="${id}"]`);
  }
  function $changedNameLong(id: number): JQuery<HTMLElement> {
    return $(`.subject-changed-name-long[data-id="${id}"]`);
  }
  function $changedNameShort(id: number): JQuery<HTMLElement> {
    return $(`.subject-changed-name-short[data-id="${id}"]`);
  }
  function $changedTeacherGender(id: number): JQuery<HTMLElement> {
    return $(`.subject-changed-teacher-gender[data-id="${id}"]`);
  }
  function $changedTeacherLong(id: number): JQuery<HTMLElement> {
    return $(`.subject-changed-teacher-long[data-id="${id}"]`);
  }
  function $changedTeacherShort(id: number): JQuery<HTMLElement> {
    return $(`.subject-changed-teacher-short[data-id="${id}"]`);
  }
  function $changedNameSubstitution(id: number): JQuery<HTMLElement> {
    return $(`.subject-changed-name-substitution[data-id="${id}"]`);
  }
  function $changedTeacherSubstitution(id: number): JQuery<HTMLElement> {
    return $(`.subject-changed-teacher-substitution[data-id="${id}"]`);
  }
  function $deleted(id: number): JQuery<HTMLElement> {
    return $(`.subject-deleted[data-id="${id}"]`);
  }

  function toggleChangesContainer(id: number): void {
    const $el = $changes(id);
    $el.show().toggle($el.children().is(":visible"));
  }

  function changedAnything(): void {
    $("#subjects-cancel").show();
    unsavedChanges(true);
    $("#subjects-save-confirm-container, #subjects-save-confirm").hide();
  }

  let currentSubjectData = await subjectData();

  let newSubjectsContent = $("<div></div>");

  for (const subject of currentSubjectData) {

    function getTemplate(): JQuery<HTMLElement> {
      function getHtmlFromValue(value: unknown, fallback: string): string {
        return escapeHTML(value?.toString() ?? fallback);
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
                  type="text" value="${escapeHTML(subject.subjectNameSubstitution?.toString() ?? "")}" ${isDisabled}
                  placeholder="${subjectNameSubstitution}" id="subject-name-substitution-input-${subject.subjectId}">
                <label for="subject-teacher-substitution-input-${subject.subjectId}">Lehrkraftname</label>
                <input class="form-control form-control-sm d-inline-block subject-teacher-substitution-input" data-id="${subjectId}"
                  type="text" value="${escapeHTML(subject.teacherNameSubstitution?.toString() ?? "")}" ${isDisabled}
                  placeholder="${teacherNameSubstitution}" id="subject-teacher-substitution-input-${subject.subjectId}">
              </div>
            </div>
            <div>
              <div class="text-warning fw-bold mt-2 d-none subject-changed" data-id="${subjectId}">
                Geändert
                <span class="subject-changed-name-long">
                  ${escapeHTML(subject.subjectNameLong)} zu <b></b>
                </span>
                <span class="subject-changed-name-short">
                  ${escapeHTML(subject.subjectNameShort)} zu <b></b>
                </span>
                <span class="subject-changed-name-substitution">
                  ${subjectNameSubstitution} zu <b></b>
                </span>
                <span class="subject-changed-teacher-gender">
                  ${{ w: "Frau", m: "Herr", d: "Keine Anrede" }[subject.teacherGender]} zu <b></b>
                </span>
                <span class="subject-changed-teacher-long">
                  ${escapeHTML(subject.teacherNameLong)} zu <b></b>
                </span>
                <span class="subject-changed-teacher-short">
                  ${escapeHTML(subject.teacherNameShort)} zu <b></b>
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
    const subjectNameLong = escapeHTML(subject.subjectNameLong);
    const subjectNameShort = escapeHTML(subject.subjectNameShort);
    const teacherNameLong = escapeHTML(subject.teacherNameLong);
    const teacherNameShort = escapeHTML(subject.teacherNameShort);
    const subjectNameSubstitution = subject.subjectNameSubstitution?.toString() ?? ""
    const teacherNameSubstitution = subject.teacherNameSubstitution?.toString() ?? ""

    const t = $cloneTemplate("#subject-template", { dataId: subjectId.toString(), disabled: !canEditClassSettings });

    t.find(".subject-substitutions").toggle(dsbActivated)
    t.find(".subject-changes").hide();

    t.find(".subject-name-long-input").val(subjectNameLong).attr("placeholder", subjectNameLong);
    t.find(".subject-name-short-input").val(subjectNameShort).attr("placeholder", subjectNameShort);
    t.find(".subject-teacher-gender-input").val(subject.teacherGender);
    t.find(".subject-teacher-long-input").val(teacherNameLong).attr("placeholder", teacherNameLong);
    t.find(".subject-teacher-short-input").val(teacherNameShort).attr("placeholder", teacherNameShort);
    t.find(".subject-name-substitution-input").val(subjectNameSubstitution).attr("placeholder", subjectNameSubstitution);
    t.find(".subject-teacher-substitution-input").val(teacherNameSubstitution).attr("placeholder", teacherNameSubstitution);

    t.find(".subject-changed-name-long-old").text(subjectNameLong);
    t.find(".subject-changed-name-short-old").text(subjectNameShort);
    t.find(".subject-changed-teacher-gender-old").text({ w: "Frau", m: "Herr", d: "Keine Anrede" }[subject.teacherGender]);
    t.find(".subject-changed-teacher-long-old").text(teacherNameLong);
    t.find(".subject-changed-teacher-short-old").text(teacherNameShort);
    t.find(".subject-changed-name-substitution-old").text(subjectNameSubstitution);
    t.find(".subject-changed-teacher-substitution-old").text(teacherNameSubstitution);

    newSubjectsContent.append(t);
  }

  if (currentSubjectData.length === 0) {
    newSubjectsContent = $(`<div>
      <span class="text-secondary no-subjects">Keine Fächer vorhanden</span>
    </div>`);
  }
  $("#subjects-list").empty().append(newSubjectsContent.children());

  $(".subject-changes > div").hide();
  $("#subjects-cancel").hide();
  $("#subjects-save-confirm-container, #subjects-save-confirm").hide();

  $("#app").off("input", ".subject-name-long-input").on("input", ".subject-name-long-input", async function () {
    changedAnything();
    
    $(this).toggleClass("is-invalid", $(this).val().trim() === "");
    $("#subjects-save").prop("disabled", $(".subject-name-long-input, .subject-teacher-long-input").hasClass("is-invalid"));

    const newVal = $(this).val()?.toString() ?? "";

    const shortInput = $(this).closest(".subject").find(".subject-name-short-input")
    if (shortInput.is(".autocomplete") || (shortInput.val()?.toString() ?? "").trim() === "") {
      shortInput.addClass("autocomplete").val(newVal.substring(0, 3)).trigger("autoinput")
    }

    const substitutionInput = $(this).closest(".subject").find(".subject-name-substitution-input")
    if (substitutionInput.is(".autocomplete") || (substitutionInput.val()?.toString() ?? "").trim() === "") {
      substitutionInput.addClass("autocomplete").val(newVal).trigger("autoinput")
    }

    const id = $(this).data("id");
    if (id !== "") {
      const oldVal = currentSubjectData.find(subject => subject.subjectId === id)?.subjectNameLong;
      if (newVal === oldVal) {
        $changedNameLong(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $changedNameLong(id).show().find("b").text(newVal);
      }
      toggleChangesContainer(id);
    }
  });

  $("#app").off("input autoinput", ".subject-name-short-input").on("input autoinput", ".subject-name-short-input", async function () {
    changedAnything();

    const newVal = $(this).val()?.toString() ?? "";

    const id = $(this).data("id");
    if (id !== "") {
      const oldVal = currentSubjectData.find(subject => subject.subjectId === id)?.subjectNameShort;
      if (newVal === oldVal) {
        $changedNameShort(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $changedNameShort(id).show().find("b").text(newVal);
      }
      toggleChangesContainer(id);
    }
  });

  $("#app").off("input", ".subject-teacher-gender-input").on("change", ".subject-teacher-gender-input", async function () {
    changedAnything();

    const newVal = $(this).val()?.toString() ?? "";

    const id = $(this).data("id");
    if (id !== "") {
      const oldVal = currentSubjectData.find(subject => subject.subjectId === id)?.teacherGender;
      if (newVal === oldVal) {
        $changedTeacherGender(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $changedTeacherGender(id).show().find("b").text({ w: "Frau", m: "Herr", d: "Keine Anrede" }[newVal as "w" | "m" | "d"]);
      }
      toggleChangesContainer(id);
    }
  });

  $("#app").off("input", ".subject-teacher-long-input").on("input", ".subject-teacher-long-input", async function () {
    changedAnything();
    
    $(this).toggleClass("is-invalid", $(this).val().trim() === "");
    $("#subjects-save").prop("disabled", $(".subject-name-long-input, .subject-teacher-long-input").hasClass("is-invalid"));

    const newVal = $(this).val()?.toString() ?? "";

    const shortInput = $(this).closest(".subject").find(".subject-teacher-short-input")
    if (shortInput.is(".autocomplete") || (shortInput.val()?.toString() ?? "").trim() === "") {
      shortInput.addClass("autocomplete").val(newVal.substring(0, 3)).trigger("autoinput")
    }

    const id = $(this).data("id");
    if (id !== "") {
      const oldVal = currentSubjectData.find(subject => subject.subjectId === id)?.teacherNameLong;
      if (newVal === oldVal) {
        $changedTeacherLong(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $changedTeacherLong(id).show().find("b").text(newVal);
      }
      toggleChangesContainer(id);
    }
  });

  $("#app").off("input autoinput", ".subject-teacher-short-input").on("input autoinput", ".subject-teacher-short-input", async function () {
    changedAnything();

    const newVal = $(this).val()?.toString() ?? "";

    const substitutionInput = $(this).closest(".subject").find(".subject-teacher-substitution-input")
    if (substitutionInput.is(".autocomplete") || (substitutionInput.val()?.toString() ?? "").trim() === "") {
      substitutionInput.addClass("autocomplete").val(newVal).trigger("autoinput")
    }

    const id = $(this).data("id");
    if (id !== "") {
      const oldVal = currentSubjectData.find(subject => subject.subjectId === id)?.teacherNameShort;
      if (newVal === oldVal) {
        $changedTeacherShort(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $changedTeacherShort(id).show().find("b").text(newVal);
      }
      toggleChangesContainer(id);
    }
  });

  $("#app").off("input autoinput", ".subject-name-substitution-input").on("input autoinput", ".subject-name-substitution-input", async function () {
    changedAnything();

    const newVal = $(this).val()?.toString() ?? "";

    const id = $(this).data("id");
    if (id !== "") {
      const oldVal = currentSubjectData.find(subject => subject.subjectId === id)?.subjectNameShort;
      if (newVal === oldVal) {
        $changedNameSubstitution(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $changedNameSubstitution(id).show().find("b").text(newVal);
      }
      toggleChangesContainer(id);
    }
  });

  $("#app").off("input autoinput", ".subject-teacher-substitution-input").on("input autoinput", ".subject-teacher-substitution-input", async function () {
    changedAnything();

    const newVal = $(this).val()?.toString() ?? "";

    const id = $(this).data("id");
    if (id !== "") {
      const oldVal = currentSubjectData.find(subject => subject.subjectId === id)?.subjectNameShort;
      if (newVal === oldVal) {
        $changedTeacherSubstitution(id).hide();
      }
      else if (! $deleted(id).is(":visible")) {
        $changedTeacherSubstitution(id).show().find("b").text(newVal);
      }
      toggleChangesContainer(id);
    }
  });

  $(".subject-delete").on("click", function () {
    changedAnything();

    const subject = $(this).closest(".subject");
    const id = $(this).data("id");
    if (subject.hasClass("is-deleted")) {
      $deleted(id).hide();
      $(".subject-name-long-input, .subject-teacher-gender-input, .subject-teacher-long-input").filter(`[data-id="${id}"]`).trigger("input").trigger("change");
      $(".subject-name-short-input, .subject-teacher-short-input, .subject-name-substitution-input, .subject-teacher-substitution-input").filter(`[data-id="${id}"]`).trigger("autoinput");

      $(this).removeClass("btn-success").addClass("btn-danger").html('<i class="fa-solid fa-trash" aria-hidden="true"></i>')
        .attr("aria-label", "Fach entfernen");

      subject.removeClass("is-deleted");
    }
    else {
      $changes(id).find("> div").hide();
      $deleted(id).show();

      $(this).removeClass("btn-danger").addClass("btn-success").html('<i class="fa-solid fa-undo" aria-hidden="true"></i>')
        .attr("aria-label", "Fach doch nicht entfernen");
      
      subject.addClass("is-deleted");
    }
    toggleChangesContainer(id);
  });
}

async function renderTimetable(): Promise<void> {
  const newTimetableContent = $("<div></div>");

  const subjectOptions = (await subjectData()).map(s => `<option value="${s.subjectId}">${escapeHTML(s.subjectNameLong)}</option>`).join("")
  $("#lesson-template .timetable-subject-select").html(`<option value="" disabled>Fach</option><option value="-1">Pause</option>` + subjectOptions)
  const teamOptions = (await teamsData()).map(t => `<option value="${t.teamId}">${escapeHTML(t.name)}</option>`).join("")
  $("#lesson-template .timetable-team-select").html(`<option value="-1">Alle</option>` + teamOptions)

  for (let dayId = 0; dayId < 5; dayId++) {

    const t = $cloneTemplate("#day-template", { disabled: !canEditClassSettings });
    t.find(".timetable-day-name").text(["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"][dayId]);

    newTimetableContent.append(t);
  }

  (await lessonData()).forEach(lesson => {
    const t = $cloneTemplate("#lesson-template", { disabled: !canEditClassSettings });
    t.find(".lesson-number").val(lesson.lessonNumber)
    t.find(".lesson-start-time").val(msToTime(lesson.startTime))
    t.find(".lesson-end-time").val(msToTime(lesson.endTime))
    t.find(".lesson-room").val(lesson.room)
    t.find(".lesson-subject-select")
      .html(`<option value="" disabled>Fach</option><option value="-1">Pause</option>` + subjectOptions)
      .val(lesson.subjectId);
    t.find(".lesson-team-select")
      .html(`<option value="-1">Alle</option>` + subjectOptions)
      .val(lesson.teamId);

    newTimetableContent.find(".timetable-lesson-list").eq(lesson.weekDay).append(t);
  });

  $("#timetable").empty().append(newTimetableContent.children());

  $("#app").off("input", ".lesson input, .lesson select").on("input", ".lesson input, .lesson select", () => {
    $("#timetable-cancel").show();
    unsavedChanges(true);
  });

  $("#app").off("input autoinput", ".lesson-number").on("input autoinput", ".lesson-number", function () {
    const thisLesson = $(this).closest(".lesson")
    const lessonNumber = $(this).val()?.toString() ?? "1";
    $("#timetable").find(".lesson").each(function () {
      if ($(this).is(thisLesson)) return

      if ($(this).find(".lesson-number").val() === lessonNumber) {
        const start = thisLesson.find(".lesson-start-time");
        if (start.hasClass("autocomplete") || start.val() === "") {
          start.val($(this).find(".lesson-start-time").val() ?? "--:--").addClass("autocomplete");
        }
        const end = thisLesson.find(".lesson-end-time");
        if (end.hasClass("autocomplete") || end.val() === "") {
          end.val($(this).find(".lesson-end-time").val() ?? "--:--").addClass("autocomplete");
        }
      }
    });
  });

  $("#app").off("click", ".timetable-new-lesson").on("click", ".timetable-new-lesson", function () {
    $("#timetable-cancel").show();
    unsavedChanges(true);

    const t = $cloneTemplate("#lesson-template", { disabled: false });
    t.find(".lesson-subject-select")
      .html(`<option value="" disabled>Fach</option><option value="-1">Pause</option>` + subjectOptions)
    t.find(".lesson-team-select")
      .html(`<option value="-1">Alle</option>` + subjectOptions)

    const lessonList = $(this).prev();
    lessonList.append(t);

    const prevLesson = lessonList.find(".lesson").last().prev();

    let prevLessonNumber = Number.parseInt(prevLesson.find(".lesson-number").val()?.toString() ?? "0") + 1;
    t.find(".lesson-number").val(prevLessonNumber).addClass("autocomplete").trigger("autoinput");
    t.find(".lesson-start-time").val(prevLesson.find(".lesson-end-time").val() ?? "--:--").addClass("autocomplete")

    const rooms = Array.from($("#timetable").find(".lesson-room"), r => $(r).val()?.toString() ?? "");
    const roomOccurences = rooms.reduce((acc, room) => {
      acc[room] ??= 0;
      acc[room]++;
      return acc;
    }, {} as Record<string, number>);
    const mostFrequentRoom = Object.entries(roomOccurences).reduce((a, b) => b[1] > a[1] ? b : a, ["", 0])[0];
    t.find(".lesson-room").val(mostFrequentRoom).addClass("autocomplete")
  });

  $("#app").off("click", ".lesson-delete").on("click", ".lesson-delete", function () {
    $("#timetable-cancel").show();
    unsavedChanges(true);
    $(this).closest(".lesson").remove();
  });
}

export async function updateClassInfo(): Promise<void> {
  const currentClassInfo = await classInfo();
  const classCode = currentClassInfo.classCode;
  $("#class-code").val(classCode);
  $("#invite-copy-link, #invite-qrcode").prop("disabled", false);

  qrCode.makeCode(location.host + `/join?class_code=${classCode}`);
  $("#show-qrcode-modal-title b").text(currentClassInfo.className);
  $("#class-settings-name").text(currentClassInfo.className);

  isTestClass = currentClassInfo.isTestClass;
  $("#test-class-alert").toggleClass("d-none", !isTestClass);
  testClassTimeCreated = Number.parseInt(currentClassInfo.createdAt);
  updateTestClassTimeLeft();

  $("#invite-copy-link").on("click", async () => {
    try {
      await navigator.clipboard.writeText(location.host + `/join?class_code=${$("#class-code").val()}`);
  
      $("#invite-copy-link").prop("disabled", true).html("<i class=\"fa-solid fa-check-circle\" aria-hidden=\"true\"></i> Einladungslink kopiert");
  
      setTimeout(() => {
        $("#invite-copy-link").prop("disabled", false).html("<i class=\"fa-solid fa-link\" aria-hidden=\"true\"></i> Einladungslink kopieren");
      }, 2000);
    }
    catch (err) {
      console.error("Error copying classcode to clipboard:", err);
    }
  });

  $(`#set-logged-out-users-role-select option[value="${currentClassInfo.defaultPermission}"]`).attr("selected", "");
}

function updateTestClassTimeLeft(): void {
  if (isTestClass) {
    const timeLeft = 24 * 60 * 60 * 1000 - (Date.now() - testClassTimeCreated);
    $("#upgrade-test-class-time-left").text(getTimeLeftString(timeLeft));
  }
}

async function updateOnUserChange(): Promise<void> {
  $(".not-logged-in-info").toggle(!user.loggedIn).toggleClass("d-flex", !user.loggedIn);
  $("#settings-account").toggle(user.loggedIn ?? false);
  $("#settings-account-name").text(user.username ?? "");

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
    $("#change-class-name").hide();
    $("#kick-logged-out-users").hide();
    $("#set-logged-out-users-role").hide();

    updateClassInfo();

    const permissionLevel = user.permissionLevel ?? 0;
    if (permissionLevel < 2) {
      canEditClassSettings = false;
      $("#class-members-wrapper, #teams-wrapper, #event-types-wrapper, #subjects-wrapper, #timetable-wrapper")
        .find("input, button, select, color-picker")
        .prop("disabled", true);
    }
    else {
      canEditClassSettings = true;
      $("#class-members-wrapper, #teams-wrapper, #event-types-wrapper, #subjects-wrapper, #timetable-wrapper")
        .find("input, button, select, color-picker")
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
    $("#change-class-name-button").toggle(permissionLevel >= 2);

    $(`#show-change-classcode,
      #delete-class-button, #delete-class ~ .form-text,
      #kick-logged-out-users-button, #kick-logged-out-users ~ .form-text`).toggle(permissionLevel === 3);
    $(`#change-class-code,
      #upgrade-test-class,
      #set-logged-out-users-role-select`).prop("disabled", permissionLevel !== 3);

    $(".is-current-user").prop("disabled", true);
  }
}

export async function init(): Promise<void> {
  return new Promise(res => {
    setInterval(updateTestClassTimeLeft, 1000);

    $(`#settings-nav-tabs button[data-bs-target="#nav-settings-${location.hash.substring(1)}"]`).tab("show");

    dsbActivated = false;
    canEditClassSettings = false;
    canEditMemberSettings = false;
    isTestClass = false;
    testClassTimeCreated = 0;

    qrCode = new QRCode("show-qrcode-modal-qrcode", {
      text: location.host,
      width: 300,
      height: 300
    });
    $("#show-qrcode-modal-qrcode img").attr("alt", "Der QR-Code, um eurer Klasse beizutreten");

    $(".cancel-btn").hide();

    $("#pwa-notice").toggle(/iphone|ipad|ipod/i.test(navigator.userAgent) && !globalThis.matchMedia("(display-mode: standalone)").matches);

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
      $("#app-scroll").css({ paddingBottom: displayFooter ? "0" : "1rem" });
    });

    const colorThemeSetting = localStorage.getItem("colorTheme") ?? "auto";
    (async () => $("body").attr("data-bs-theme", await colorTheme()))();
    
    $("#color-theme-auto").prop("checked", colorThemeSetting === "auto");
    $("#color-theme-dark").prop("checked", colorThemeSetting === ColorTheme.DARK);
    $("#color-theme-light").prop("checked", colorThemeSetting === ColorTheme.LIGHT);

    $("#color-theme input").each(function () {
      $(this).on("click", () => {
        updateColorTheme();
      });
    });

    globalThis.matchMedia("(prefers-color-scheme: light)").addEventListener("change", updateColorTheme);
    globalThis.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateColorTheme);

    $(".section-toggle").on("click", function () {
      $(this).next().toggle();
      $(this).find("button").toggleClass("rotate-90");
    });

    // ACCOUNT SETTINGS

    // Logout
    $("#logout-button").on("click", async () => {
      await ajax("POST", "/account/logout");

      $("#logout-success-toast").toast("show");
      user.auth();
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
      try {
        await ajax("POST", "/account/change_username", {
          body: {
            password: $("#change-username-password").val(),
            newUsername: $("#change-username-new-username").val()
          },
          expectedErrors: [401, 409]
        });

        $("#change-username-success-toast").toast("show");
        $("#change-username-button").show();
        $("#change-username").hide();

        user.auth();
      }
      catch (e) {
        const err = e as AjaxError;
        if (err.status === 401) {
          $("#change-username-invalid-password").removeClass("d-none");
          $("#change-username-confirm").prop("disabled", true);
        }
        else if (err.status === 409) {
          $("#change-username-taken-username").removeClass("d-none");
          $("#change-username-confirm").prop("disabled", true);
        }
      }
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
      try {
        await ajax("POST", "/account/change_password", {
          body: {
            oldPassword: $("#change-password-old").val(),
            newPassword: $("#change-password-new").val()
          },
          expectedErrors: [401]
        });
        
        $("#change-password-success-toast").toast("show");
        $("#change-password-button").show();
        $("#change-password").hide();
      }
      catch (e) {
        const err = e as AjaxError;
        if (err.status === 401) {
          $("#change-password-invalid-password").removeClass("d-none").addClass("d-flex");
          $("#change-password-confirm").prop("disabled", true);
        }
      }
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
      try {
        await ajax("POST", "/account/delete", {
          body: {
            password: $("#delete-account-password").val()
          },
          expectedErrors: [401, 409]
        });
        
        $("#delete-account-success-toast").toast("show");
        user.auth();
      }
      catch (e) {
        const err = e as AjaxError;
        if (err.status === 401) {
          $("#delete-account-invalid-password").removeClass("d-none").addClass("d-flex");
          $("#delete-account-confirm").prop("disabled", true);
        }
        else if (err.status === 409) {
          $("#delete-account-still-in-class").removeClass("d-none").addClass("d-flex");
          $("#delete-account-confirm").prop("disabled", true);
        }
      }
    });

    // TEAM SELECTION

    $("#team-selection-save").on("click", async () => {
      const newJoinedTeamsData: JoinedTeamsData = [];
      $("#team-selection-list input").each(function () {
        if ($(this).prop("checked")) {
          newJoinedTeamsData.push(Number.parseInt($(this).data("id")));
        }
      });

      if (user.loggedIn) {
        await ajax("POST", "/teams/set_joined_teams_data", {
          body: {
            teams: newJoinedTeamsData
          },
          queueable: true
        });

        $("#team-selection-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
        setTimeout(() => {
          $("#team-selection-save").text("Speichern").prop("disabled", false);
        }, 1000);
      }
      else {
        localStorage.setItem("joinedTeamsData", JSON.stringify(newJoinedTeamsData));
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
      try {
        await ajax("POST", "/class/leave_class", {
          expectedErrors: [409]
        });
        
        $("#leave-class-success-toast").toast("show");
        // Force socket to reconnect so it picks up the new session.classId
        socket.disconnect();
        socket.connect();
        user.auth();
      }
      catch (e) {
        const err = e as AjaxError;
        if (err.status === 409) {
          $("#leave-class-last-admin").removeClass("d-none").addClass("d-flex");
          $("#leave-class-confirm").prop("disabled", true);
        }
      }
    });


    // Change classname
    $("#change-class-name-button").on("click", function () {
      $(this).hide();
      $("#change-class-name").show();
      $("#change-class-name input").val("");
      $("#change-class-name-confirm").prop("disabled", true);
    });

    $("#change-class-name-cancel").on("click", () => {
      $("#change-class-name").hide();
      $("#change-class-name-button").show();
    });

    $("#change-class-name-new-class-name").on("input", () => {
      if ($("#change-class-name-new-class-name").val()?.toString()) {
        $("#change-class-name-new-class-name").removeClass("is-invalid");
        $("#change-class-name-confirm").prop("disabled", false);
      }
    });

    $("#change-class-name-new-class-name").on("input change", () => {
      if (! $("#change-class-name-new-class-name").val()?.toString()) {
        $("#change-class-name-new-class-name").addClass("is-invalid");
        $("#change-class-name-confirm").prop("disabled", true);
      }
    });

    $("#change-class-name-confirm").on("click", async () => {
      const className = $("#change-class-name-new-class-name").val()?.toString() ?? "";
      
      await ajax("POST", "/class/change_class_name", {
        body: {
          classDisplayName: className
        },
        queueable: true
      });

      $("#change-class-name-button").show();
      $("#change-class-name").hide();

      $("#show-qrcode-modal-title b").text(className);
      $("#class-settings-name").text(className);
    });


    // Change classcode
    $("#change-class-code").on("click", async () => {
      const res = await ajax("POST", "/class/change_class_code", {
        queueable: true
      });

      const classCode = await res.json();
      $("#class-code").val(classCode);
      $("#invite-copy-link, #invite-qrcode").prop("disabled", false);
      qrCode.makeCode(location.host + `/join?class_code=${classCode}`);
    });

    // Upgrade test class
    $("#upgrade-test-class").on("click", async () => {
      await ajax("POST", "/class/upgrade_test_class", {
        queueable: true
      });

      $("#test-class-alert").addClass("d-none");
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
      await ajax("POST", "/class/delete_class");

      $("#delete-class-success-toast").toast("show");
      // Force socket to reconnect so it picks up the new session.classId
      socket.disconnect();
      socket.connect();
      user.auth();
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
      await ajax("POST", "/class/kick_logged_out_users");

      $("#kick-logged-out-users-success-toast").toast("show");
      $("#kick-logged-out-users").hide();
      $("#kick-logged-out-users-button").show();
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
      await ajax("POST", "/class/change_default_permission", {
        body: { role: Number.parseInt($("#set-logged-out-users-role-select option:selected").val()?.toString() ?? "0") },
        queueable: true
      });

      $("#set-logged-out-users-role-success-toast").toast("show");
      $("#set-logged-out-users-role").hide();
      $("#set-logged-out-users-role-button").show();
      const $newRole = $("#set-logged-out-users-role-select option:selected");
      $("#set-logged-out-users-role-select option[selected]").removeAttr("selected");
      $newRole.attr("selected", "");
    });

    // CLASS MEMBERS

    $("#class-members-wrapper").hide();

    $("#class-members-cancel").on("click", () => {
      unsavedChanges(false);
      renderClassMemberList();
      $("#class-members-save-confirm-container, #class-members-save-confirm").hide();
    });

    async function saveClassMembers(): Promise<void> {
      $("#class-members-cancel").hide();
      unsavedChanges(false);

      const classMembersKickData: { accountId: number }[] = [];
      const classMembersPermissionsData: {accountId: number, permissionLevel: ClassMemberPermissionLevel }[] = [];

      $(".class-member.is-kicked").each(function () {
        classMembersKickData.push({
          accountId: $(this).data("id")
        });
      });

      $(".class-member:not(.is-kicked)").each(function () {
        classMembersPermissionsData.push({
          accountId: $(this).data("id"),
          permissionLevel: Number.parseInt($(this).find(".class-member-role-input").val()?.toString() ?? "") as ClassMemberPermissionLevel
        });
      });
      
      await ajax("POST", "/class/kick_class_members", {
        body: { classMembers: classMembersKickData },
        queueable: true
      });
      await ajax("POST", "/class/set_class_members_permission", {
        body: { classMembers: classMembersPermissionsData },
        queueable: true
      });

      $("#class-members-save-confirm-container, #class-members-save-confirm").hide();
      $("#class-members-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#class-members-save").text("Speichern").prop("disabled", false);
      }, 1000);
    }

    $("#class-members-save").on("click", () => {
      const deleted: string[] = [];
      $(".class-member.is-kicked").each(function () {
        deleted.push($(this).find(".class-member-name").text());
      });

      if (deleted.length === 0) {
        saveClassMembers();
      }
      else {
        $("#class-members-save-confirm-container, #class-members-save-confirm").show();
        $("#class-members-save-confirm-list").html(
          (deleted.length === 1 ? "wird der Schüler / die Schülerin " : "werden die Schüler:innen ") +
          toCommaAndAnd(deleted.map(c => `<b>${escapeHTML(c)}</b>`))
        );
      }
    });

    $("#class-members-save-confirm").on("click", saveClassMembers);

    // TEAMS

    $("#teams-wrapper").hide();

    $("#new-team").on("click", () => {
      $("#teams-cancel").show();
      unsavedChanges(true);
      $("#teams-save-confirm-container, #teams-save-confirm").hide();

      $("#teams-list .no-teams").remove();

      const t = $cloneTemplate("#team-template", { disabled: false });
      t.find(".team-name-input").prop("placeholder", "Neues Team");
      t.find(".team-changes").html("<div class=\"text-success fw-bold\" data-id=\"\">Neu</div>");
      t.find(".team-delete").removeClass("team-delete").addClass("team-type-delete");
      $("#teams-list").append(t);
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
        $("#teams-save-confirm-container, #teams-save-confirm").hide();
        $(this).closest(".team").remove();
        $(".team-name-input").first().trigger("input");
        if ($("#teams-list").children().length === 0) {
          $("#teams-list").append('<span class="text-secondary no-teams">Keine Teams vorhanden</span>');
        }
      });
    });

    $("#teams-cancel").on("click", () => {
      unsavedChanges(false);
      renderTeamList();
      $("#teams-save-confirm-container, #teams-save-confirm").hide();
    });

    async function saveTeams(): Promise<void> {
      $("#teams-cancel").hide();
      unsavedChanges(false);
      const newTeamsData: TeamsData = [];
      $(".team:not(.is-deleted)").each(function () {
        newTeamsData.push({
          teamId: $(this).data("id"),
          name: $(this).find(".team-name-input").val()?.toString() ?? ""
        });
      });

      await ajax("POST", "/teams/set_teams_data", {
        body: { teams: newTeamsData },
        queueable: true
      });

      $("#teams-save-confirm-container, #teams-save-confirm").hide();
      $("#teams-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#teams-save").text("Speichern").prop("disabled", false);
      }, 1000);
    }

    $("#teams-save").on("click", () => {
      const deleted: string[] = [];
      $(".team.is-deleted").each(function () {
        deleted.push($(this).find(".team-name-input").attr("placeholder") ?? "");
      });

      if (deleted.length === 0) {
        saveTeams();
      }
      else {
        $("#teams-save-confirm-container, #teams-save-confirm").show();
        $("#teams-save-confirm-list").html(
          (deleted.length === 1 ? "des" : "der") + " Teams " +
          toCommaAndAnd(deleted.map(t => `<b>${escapeHTML(t)}</b>`))
        );
      }
    });

    $("#teams-save-confirm").on("click", saveTeams);

    // EVENT TYPES

    $("#event-types-wrapper").hide();

    $("#new-event-type").on("click", () => {
      $("#event-types-cancel").show();
      unsavedChanges(true);
      $("#event-types-save-confirm-container, #event-types-save-confirm").hide();

      $("#event-types-list .no-event-types").remove();

      const t = $cloneTemplate("#event-type-template", { disabled: false });
      t.find(".event-type-name-input").prop("placeholder", "Neue Ereignisart");
      t.find(".event-type-color-input").attr("value", "#3bb9ca");
      t.find(".event-type-changes").html("<div class=\"text-success fw-bold\" data-id=\"\">Neu</div>");
      t.find(".event-type-delete").removeClass("event-type-delete").addClass("new-event-type-delete");
      $("#event-types-list").append(t);
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
        $("#event-types-save-confirm-container, #event-types-save-confirm").hide();
        $(this).closest(".event-type").remove();
        $(".event-type-name-input").first().trigger("input");
        if ($("#event-types-list").children().length === 0) {
          $("#event-types-list").append(
            `<span class="text-secondary no-event-types">
              Keine Ereignisarten vorhanden
              <button class="btn btn-primary btn-sm fw-semibold" id="event-types-example">Beispiele erstellen</button>
            </span>`
          );
        }
      });
    });

    $("#event-types-cancel").on("click", () => {
      unsavedChanges(false);
      renderEventTypeList();
      $("#event-types-save-confirm-container, #event-types-save-confirm").hide();
    });

    async function saveEventTypes(): Promise<void> {
      unsavedChanges(false);
      const newEventTypesData: EventTypeData = [];
      $(".event-type:not(.is-deleted)").each(function () {
        newEventTypesData.push({
          eventTypeId: $(this).data("id"),
          name: $(this).find(".event-type-name-input").val()?.toString() ?? "",
          color: $(this).find(".event-type-color-input").val()?.toString() ?? ""
        });
      });

      await ajax("POST", "/events/set_event_type_data", {
        body: { eventTypes: newEventTypesData },
        queueable: true
      });

      $("#event-types-save-confirm-container, #event-types-save-confirm").hide();
      $("#event-types-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#event-types-save").text("Speichern").prop("disabled", false);
      }, 1000);
    }

    $("#app").on("click", "#event-types-example", async () => {
      await ajax("POST", "/events/set_event_type_data", {
        body: {
          eventTypes: [
            { name: "Ausflug", color: "#ff9955" },
            { name: "Geburtstag", color: "#ff55aa" },
            { name: "Prüfung", color: "#5599ff" },
            { name: "Schulfrei", color: "#44dd33" },
            { name: "Sonstiges", color: "#9955ff" }
          ].map(e => ({ eventTypeId: "", ...e }))
        },
        queueable: true
      });
    });

    $("#event-types-save").on("click", () => {
      const deleted: string[] = [];
      $(".event-type.is-deleted").each(function () {
        deleted.push($(this).find(".event-type-name-input").attr("placeholder") ?? "");
      });

      if (deleted.length === 0) {
        saveEventTypes();
      }
      else {
        $("#event-types-save-confirm-container, #event-types-save-confirm").show();
        $("#event-types-save-confirm-list").html(
          "der Art" + (deleted.length === 1 ? " " : "en ") +
          toCommaAndAnd(deleted.map(e => `<b>${escapeHTML(e)}</b>`))
        );
      }
    });

    $("#event-types-save-confirm").on("click", saveEventTypes);

    // SUBJECTS

    $("#subjects-wrapper").hide();

    $("#new-subject").on("click", () => {
      $("#subjects-cancel").show();
      unsavedChanges(true);
      $("#subjects-save-confirm-container, #subjects-save-confirm").hide();

      $("#subjects-list .no-subjects").remove();

      const t = $cloneTemplate("#subject-template", { disabled: false });
      t.find(".subject-substitutions").toggle(dsbActivated)

      t.find(".subject-name-long-input").attr("placeholder", "Name");
      t.find(".subject-name-short-input").attr("placeholder", "Abkürzung");
      t.find(".subject-teacher-long-input").attr("placeholder", "Name");
      t.find(".subject-teacher-short-input").attr("placeholder", "Kürzel");
      t.find(".subject-name-substitution-input").attr("placeholder", "Vertr.-Fachname");
      t.find(".subject-teacher-substitution-input").attr("placeholder", "Vertr.-Lehrkraftname");

      t.find(".subject-changes").html("<div class=\"text-success fw-bold text-nowrap\" data-id=\"\">Neu</div>");
      t.find(".subject-delete").removeClass("subject-delete").addClass("new-subject-delete");
      $("#subjects-list").append(t);
      $(".subject-name-long-input").last().trigger("focus");

      $(".subject-name-long-input")
        .last()
        .on("focusout", function () {
          if ($(this).val()?.toString().trim() === "") {
            $(this).addClass("is-invalid");
            $("#subjects-save").prop("disabled", true);
          }
        });
        
      $(".subject-teacher-long-input").last().addClass("is-invalid");
      $("#subjects-save").prop("disabled", true);

      $(".new-subject-delete").off("click").on("click", function () {
        $("#subjects-save-confirm-container, #subjects-save-confirm").hide();
        $(this).closest(".subject").remove();
        $(".subject-name-long-input").first().trigger("input");
        if ($("#subjects-list").children().length === 0) {
          $("#subjects-list").append(
            `<span class="text-secondary no-subjects">
              Keine Ereignisarten vorhanden
            </span>`
          );
        }
      });
    });

    $("#subjects-cancel").on("click", () => {
      unsavedChanges(false);
      renderSubjectList();
      $("#subjects-save-confirm-container, #subjects-save-confirm").hide();
    });

    async function saveSubjects(): Promise<void> {
      unsavedChanges(false);
      const newSubjectData: SubjectData = [];
      $(".subject:not(.is-deleted)").each(function () {
        newSubjectData.push({
          subjectId: $(this).data("id"),
          subjectNameLong: $(this).find(".subject-name-long-input").val()?.toString() ?? "",
          subjectNameShort: $(this).find(".subject-name-short-input").val()?.toString() ?? "",
          teacherGender: ($(this).find(".subject-teacher-gender-input").val()?.toString() ?? "") as "m" | "w" | "d",
          teacherNameLong: $(this).find(".subject-teacher-long-input").val()?.toString() ?? "",
          teacherNameShort: $(this).find(".subject-teacher-short-input").val()?.toString() ?? "",
          subjectNameSubstitution: $(this).find(".subject-name-substitution-input").val()?.toString()?.split(",").map(v => v.trim()) ?? [],
          teacherNameSubstitution: $(this).find(".subject-teacher-substitution-input").val()?.toString()?.split(",").map(v => v.trim()) ?? []
        });
      });

      await ajax("POST", "/subjects/set_subject_data", {
        body: { subjects: newSubjectData },
        queueable: true
      });

      $("#subjects-save-confirm-container, #subjects-save-confirm").hide();
      $("#subjects-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#subjects-save").text("Speichern").prop("disabled", false);
      }, 1000);
    }

    $("#subjects-save").on("click", () => {
      const deleted: string[] = [];
      $(".subject.is-deleted").each(function () {
        deleted.push($(this).find(".subject-name-long-input").attr("placeholder") ?? "");
      });

      if (deleted.length === 0) {
        saveSubjects();
      }
      else {
        $("#subjects-save-confirm-container, #subjects-save-confirm").show();
        $("#subjects-save-confirm-list").html(
          (deleted.length === 1 ? "des Fachs " : "der Fächer ") +
          toCommaAndAnd(deleted.map(s => `<b>${escapeHTML(s)}</b>`))
        );
      }
    });

    $("#subjects-save-confirm").on("click", saveSubjects);

    // TIMETABLE

    $("#timetable-wrapper").hide();

    $("#timetable-cancel").on("click", () => {
      unsavedChanges(false);
      renderTimetable();
    });

    $("#timetable-save").on("click", async () => {
      unsavedChanges(false);
      const newTimetableData: LessonData = [];
      $(".timetable-lesson-list").each(function (weekDay) {
        $(this)
          .find(".lesson")
          .each(function () {
            newTimetableData.push({
              lessonId: -1,
              lessonNumber: Number.parseInt(getInputValue($(this).find(".lesson-number"), "1")),
              weekDay: weekDay as 0 | 1 | 2 | 3 | 4,
              teamId: Number.parseInt(getInputValue($(this).find(".lesson-team-select"), "-1")),
              subjectId: Number.parseInt(getInputValue($(this).find(".lesson-subject-select"), "-1")),
              room: getInputValue($(this).find(".lesson-room"), ""),
              startTime: timeToMs(getInputValue($(this).find(".lesson-start-time"), "0:0")) + "",
              endTime: timeToMs(getInputValue($(this).find(".lesson-end-time"), "0:0")) + ""
            });
          });
      });

      await ajax("POST", "/lessons/set_lesson_data", {
        body: { lessons: newTimetableData },
        queueable: true
      });

      $("#timetable-save").html('<i class="fa-solid fa-circle-check" aria-hidden="true"></i>').prop("disabled", true);
      setTimeout(() => {
        $("#timetable-save").text("Speichern").prop("disabled", false);
      }, 1000);
    });

    res();
  });
}

let dsbActivated: boolean;
let canEditClassSettings: boolean;
let canEditMemberSettings: boolean;
let isTestClass: boolean;
let testClassTimeCreated: number;
let qrCode: QRCode;

(await classInfo.init()).on("update", onlyThisSite(updateClassInfo));
(await classMemberData.init()).on("update", onlyThisSite(renderClassMemberList));
(await subjectData.init()).on("update", onlyThisSite(renderSubjectList));
(await teamsData.init()).on("update", onlyThisSite(() => {
  renderTeamList();
  renderTeamSelectionList();
}));
(await eventTypeData.init()).on("update", onlyThisSite(renderEventTypeList));
(await lessonData.init()).on("update", onlyThisSite(renderTimetable));
(await substitutionsData.init()).on("update", onlyThisSite(renderSubjectList));

await user.awaitAuthed();

(await joinedTeamsData.init()).on("update", onlyThisSite(renderTeamSelectionList));

export async function renderAllFn(): Promise<void> {
  if (user.classJoined) {
    if ((await substitutionsData()).data !== "No data") {
      dsbActivated = true;
    }
    $(".description-dsb").toggle(dsbActivated);

    await renderTeamSelectionList();

    await renderClassMemberList();
    await renderTeamList();
    await renderEventTypeList();
    await renderSubjectList();
    await renderTimetable();
  }

  await updateOnUserChange();
};
