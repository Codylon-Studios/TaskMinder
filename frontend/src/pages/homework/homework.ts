import {
  dateToMs,
  getHomeworkCheckStatus,
  homeworkCheckedData,
  homeworkData,
  isSameDay,
  joinedTeamsData,
  getDisplayDate,
  msToInputDate,
  subjectData,
  teamsData,
  lessonData,
  escapeHTML,
  getCirclePath,
  dateDaysDifference,
  onlyThisSite,
  ajax,
  user,
  getInputValue,
  tryAutocomplete,
  autocomplete,
  getCurrentLesson,
  getNextLessonWithDate,
  checkTeamInputForSuspicious
} from "../../global/global.js";
import { HomeworkData } from "../../global/types";
import { richTextToHtml, richTextToPlainText } from "../../snippets/richTextarea/richTextarea.js";
import { SearchBox } from "../../snippets/richInput/richInput.js";

async function getFilteredHomeworkData(): Promise<(HomeworkData[number] & { checked: boolean })[]> {
  // Add the check value to each homework
  let data = await Promise.all(
    (await homeworkData()).map(async h => ({
      ...h,
      checked: await getHomeworkCheckStatus(h.homeworkId)
    }))
  );
    
  const pinned = data.filter(h => h.isPinned);
  data = data.filter(h => ! h.isPinned);

  // Filter by min. date
  const filterDateMin = Date.parse($("#filter-date-from").val()?.toString() ?? "");
  if (! Number.isNaN(filterDateMin)) {
    data = data.filter(h => filterDateMin <= Number.parseInt(h.submissionDate) || isSameDay(filterDateMin, h.submissionDate));
  }
  // Filter by max. date
  const filterDateMax = Date.parse($("#filter-date-until").val()?.toString() ?? "");
  if (! Number.isNaN(filterDateMax)) {
    data = data.filter(h => filterDateMax >= Number.parseInt(h.assignmentDate) || isSameDay(filterDateMax, h.assignmentDate));
  }
  // Filter by search
  const sb = ($("#search-homework")[0] as SearchBox);
  data = data.filter(h => sb.searchMatches(richTextToPlainText(h.content)));
  // Filter by checked status
  if (! $("#filter-status-checked").prop("checked")) {
    data = data.filter(h => !h.checked);
  }
  // Filter by unchecked status
  if (! $("#filter-status-unchecked").prop("checked")) {
    data = data.filter(h => h.checked);
  }
  // Filter by subject
  data = data.filter(h => $(`#filter-subject-${h.subjectId}`).prop("checked") || h.subjectId === -1);
  // Filter by team
  const currentJoinedTeamsData = await joinedTeamsData();
  data = data.filter(h => currentJoinedTeamsData.includes(h.teamId) || h.teamId === -1);

  data = pinned.concat(data);
  
  return data;
}

async function renderHomeworkList(): Promise<void> {
  const newContent = $("<div></div>");
  let showMoreButtonElements: JQuery<HTMLElement> = $();

  // Check if user is in edit mode
  const editEnabled = $("#edit-toggle").is(":checked");

  const data = await getFilteredHomeworkData();

  let foundNextWeek = false;
  let foundLater = false;
  let foundPinned = false;

  for (const homework of data) {
    function showCheckAnimation(): void {
      if (homework.checked && justCheckedHomeworkId === homeworkId && animations) {
        justCheckedHomeworkId = -1;
        template.find(".homework-check-wrapper").append($("<div></div>".repeat(8)).each(
          function (id) {
            $(this).attr("data-id", id);
            setTimeout(() => {
              $(this).remove();
            }, 400);
          }
        ));
      }
    }
    function showSections(): void {
      if (homework.isPinned) {
        foundPinned = true;
      }
      else {
        if (foundPinned) {
          foundPinned = false;
          newContent.append(`
            <hr class="border-2 text-primary mb-0 mt-2">
            <div class="form-text text-primary opacity-75 mt-0 section-divider">Diese Woche</div>
          `);
        }
        if (!foundNextWeek && Number.parseInt(homework.submissionDate) > nextWeekDate.getTime()) {
          foundNextWeek = true;
          newContent.append(`
            <hr class="border-2 text-primary mb-0 mt-2">
            <div class="form-text text-primary opacity-75 mt-0 section-divider">Nächste Woche</div>
          `);
        }
        if (!foundLater && Number.parseInt(homework.submissionDate) > laterDate.getTime()) {
          foundLater = true;
          newContent.append(`
            <hr class="border-2 text-primary mb-0 mt-2">
            <div class="form-text text-primary opacity-75 mt-0 section-divider">Später</div>
          `);
        }
      }
    }

    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7 - nextWeekDate.getDay());
    const laterDate = new Date();
    laterDate.setDate(laterDate.getDate() + 14 - laterDate.getDay());
    showSections();

    const homeworkId = homework.homeworkId;

    // Get the information for the homework
    const subject = (await subjectData()).find(s => s.subjectId === homework.subjectId)?.subjectNameLong ?? "Sonstiges";
    const content = homework.content;
    const assignmentDate = getDisplayDate(homework.assignmentDate);
    const submissionDate = getDisplayDate(homework.submissionDate);

    // The template for a homework with checkbox and edit options
    const template = $(`
      <div class="mb-1 mt-2 d-flex">
        <div class="form-check flex-grow-1">
          <div class="homework-check-wrapper form-check-input invisible">
            <input type="checkbox" class="form-check-input homework-check visible" id="homework-check-${homeworkId}"
              data-id="${homeworkId}" ${homework.checked ? "checked" : ""}>
          </div>
          <label class="form-check-label" for="homework-check-${homeworkId}">
            <b>${escapeHTML(subject)}</b>
          </label>
          <span class="homework-content"></span>
          <span class="ms-4 d-block">Von ${assignmentDate} auf ${submissionDate}</span>
        </div>

        <div class="ms-2 text-nowrap">
          <button class="edit-option btn btn-sm btn-semivisible homework-edit" data-id="${homeworkId}" aria-label="Bearbeiten">
            <i class="fa-solid fa-edit opacity-75" aria-hidden="true"></i>
          </button>
          <button class="edit-option btn btn-sm btn-semivisible homework-delete" data-id="${homeworkId}" aria-label="Löschen">
            <i class="fa-solid fa-trash opacity-75" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm btn-semivisible homework-pin" data-id="${homeworkId}" aria-label="Anheften">
            <i class="fa-solid fa-thumbtack${homework.isPinned ? "-slash" : ""} opacity-75" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `);
    template.find(".homework-pin").toggle(homework.isPinned || user.permissionLevel >= 1);
    template.find(".edit-option").toggle(editEnabled);
    
    showCheckAnimation();

    // Add this homework to the list
    newContent.append(template);

    richTextToHtml(content, template.find(".homework-content"), {
      showMoreButton: true,
      parseLinks: true,
      displayBlockIfNewline: true,
      merge: true
    });
    showMoreButtonElements = showMoreButtonElements.add(template.find(".homework-content"));
  }

  newContent.find(".section-divider").each(function () {
    if (!$(this).next().length || $(this).next().is("hr")) {
      $(this).prev().addBack().remove();
    }
  });

  // If no homeworks match, add an explanation text
  $("#edit-toggle, #edit-toggle-label").prop("disabled", data.length === 0 || user.permissionLevel === 0);
  $("#no-homework-found").toggle(data.length === 0);
  $("#homework-list").empty().append(newContent.children()).toggleClass("d-none", data.length === 0);
  showMoreButtonElements.trigger("addedToDom");

  renderHomeworkFeedback();
};

async function renderHomeworkFeedback(): Promise<void> {
  const currentJoinedTeamsData = await joinedTeamsData();

  const todoHomeworkData = (await homeworkData()).filter(h =>
    (currentJoinedTeamsData.includes(h.teamId) || h.teamId === -1)
    && (Date.now() <= Number.parseInt(h.submissionDate) || isSameDay(new Date(), h.submissionDate))
  );

  let todo = 0;
  for (const h of todoHomeworkData) {
    if (!await getHomeworkCheckStatus(h.homeworkId)) {
      todo++;
    }
  }
  const total = todoHomeworkData.length;

  if (todo > 0) {
    $("#homework-feedback-body").html(`
      <span>Du musst noch <b>${todo}</b> von <b>${total}</b> Hausaufgaben machen.</span>
      ${todo > 1 ? '<button id="homework-feedback-random" class="btn btn-primary btn-sm fw-semibold ms-2">Zufällige auswählen</button>' : ""}
    `);
    $("#homework-feedback-done").hide();
    $("#homework-feedback-outer-circle").show();

    const halfSize = ($("#homework-feedback-inner-circle").outerWidth() ?? 0) / 2;
    const percentage = 1 - todo / total;
    let animationPercentage = (homeworkFeedbackLastPercentage !== null && animations) ? homeworkFeedbackLastPercentage : percentage;

    const baseChange = 0.1 / total;
    function animateCircle(): void {
      if (Math.abs(animationPercentage - percentage) < baseChange) {
        animationPercentage = percentage;
        $("#homework-feedback-inner-circle").css("clip-path", `path("${getCirclePath(halfSize, halfSize, halfSize, animationPercentage * 360)}")`);
        homeworkFeedbackLastPercentage = percentage;
        return;
      }

      const change = (animationPercentage < percentage ? baseChange : -baseChange);
      animationPercentage += change;

      $("#homework-feedback-inner-circle").css("clip-path", `path("${getCirclePath(halfSize, halfSize, halfSize, animationPercentage * 360)}")`);

      requestAnimationFrame(animateCircle);
    }
    animateCircle();
  }
  else {
    $("#homework-feedback-body").html("Super, du hast alle Hausaufgaben erledigt!");
    $("#homework-feedback-outer-circle").hide();
    $("#homework-feedback-done").show();
  }
}

async function renderRandomHomeworkWheel(todoHomework: HomeworkData): Promise<void> {
  const currentSubjectData = await subjectData();

  $("#random-homework-wheel").toggle(animations);
  $("#random-homework-result").empty();
  $("#random-homework-modal").modal("show");
  $("#random-homework-next").prop("disabled", true);
  const todo = todoHomework.length;
  const full = todo === 1;
  const angle = 360 / todo;
  const r = ($("#random-homework-wheel-rotate").outerWidth() ?? 0) / 2;
  const diff = todo > 5 ? 360 / todoHomework.length : 30;
  $("#random-homework-wheel-rotate").empty().append(todoHomework.map((h, i) => {
    const subject = currentSubjectData.find(s => s.subjectId === h.subjectId) ?? {subjectNameLong: "Sonstiges", subjectNameShort: "Sonstiges"};
    const subjectName = subject.subjectNameLong.length >= 25 ? subject.subjectNameShort : subject.subjectNameLong;
    return $(`
        <div>
          <div class="random-homework-wheel-option w-100 h-100"></div>
          <span class="position-absolute translate-middle fw-bold">
            ${escapeHTML(subjectName)}
          </span>
        </div>
      `)
      .find("div").css({
        "clip-path": `path("${getCirclePath(r, r, r, angle, full)}")`,
        "--hue": 187 + diff * i,
        "rotate": angle * i + "deg"
      }).end()
      .find("span").css({
        "left": r + (full ? 0 : 0.75 * r * Math.sin(Math.PI / 180 * angle * (i + 0.5))),
        "top":  r - (full ? 0 : 0.75 * r * Math.cos(Math.PI / 180 * angle * (i + 0.5))),
        "rotate": full ? 0 : angle * (i + 0.5) + "deg"
      }).end();
  }));

  $("#random-homework-wheel-rotate").css("rotate", "0deg");
}

function chooseRandomHomework(todoHomework: HomeworkData): void {
  const todo = todoHomework.length;
  const full = todo === 1;
  let constantSpin = Math.random() * 90 + 90;
  let rotation = animations ? 0 : Math.random() * 360;
  let speed = 4;

  function rotateWheel(): void {
    $("#random-homework-wheel-rotate").css("rotate", Math.round(rotation) + "deg");
    if (speed < 0.5) {
      showResult();
      return;
    }
    if (full || !animations) {
      showResult();
      return;
    }
    rotation += speed;
    if (constantSpin > 0) constantSpin --;
    else speed -= Math.random() / (speed * 5);
    requestAnimationFrame(rotateWheel);
  }
  rotateWheel();

  async function showResult(): Promise<void> {
    const h = todoHomework[full ? 0 : Math.floor((360 - rotation % 360) / 360 * todo)];
    const subject = (await subjectData()).find(s => s.subjectId === h.subjectId)?.subjectNameLong ?? "Sonstiges";
    const content = h.content;
    const assignmentDate = getDisplayDate(h.assignmentDate);
    const submissionDate = getDisplayDate(h.submissionDate);
    $("#random-homework-result").html(`
      <h5>Ausgewählte Hausaufgabe:</h5>
      <div>
        <b>${escapeHTML(subject)}</b>
        <span class="homework-content"></span>
        <span class="ms-4 d-block">Von ${assignmentDate} auf ${submissionDate}</span>
      </div>
    `);

    const $contentEl = $("#random-homework-result").find(".homework-content");
    richTextToHtml(content, $contentEl, {
      showMoreButton: true,
      parseLinks: true,
      displayBlockIfNewline: true,
      merge: true
    });
    $contentEl.trigger("addedToDom");

    $("#random-homework-next").prop("disabled", false).off("click").on("click", async () => {
      checkHomework(h.homeworkId, true);
      if (todo === 1) {
        $("#random-homework-modal").modal("hide");
      }
      else {
        const newData = todoHomework.filter(homework => homework.homeworkId !== h.homeworkId);
        renderRandomHomeworkWheel(newData);
        chooseRandomHomework(newData);
      }
    });
  }
}

async function prepareRandomHomework(): Promise<void> {
  $("#random-homework-list, #random-homework-list-explanation").show();
  const newContent = $("<div></div>");
  let showMoreButtonElements: JQuery<HTMLElement> = $();

  const data = await getFilteredHomeworkData();

  const todoHomework: HomeworkData = [];
  for (const h of data) {
    if (!await getHomeworkCheckStatus(h.homeworkId)) {
      todoHomework.push(h);
    }
  }

  randomHomeworkDeactivated = randomHomeworkDeactivated.filter(d => todoHomework.some(h => h.homeworkId === d));


  for (const homework of todoHomework) {
    const homeworkId = homework.homeworkId;

    // Get the information for the homework
    const subject = (await subjectData()).find(s => s.subjectId === homework.subjectId)?.subjectNameLong ?? "Sonstiges";
    const content = homework.content;
    const assignmentDate = getDisplayDate(homework.assignmentDate);
    const submissionDate = getDisplayDate(homework.submissionDate);

    const deactivated = randomHomeworkDeactivated.includes(homeworkId) ? "random-homework-deactivated" : "";

    // The template for a homework with checkbox and edit options
    const template = $(`
      <div class="btn btn-semivisible border rounded p-2 mb-2 w-100 random-homework-deactivate-option ${deactivated}" data-id="${homeworkId}">
        <b>${escapeHTML(subject)}</b>
        <span class="homework-content"></span>
        <span class="ms-4 d-block">Von ${assignmentDate} auf ${submissionDate}</span>
      </div>
    `);

    // Add this homework to the list
    newContent.append(template);

    richTextToHtml(content, template.find(".homework-content"), {
      showMoreButton: true,
      parseLinks: true,
      displayBlockIfNewline: true,
      merge: true
    });
    showMoreButtonElements = showMoreButtonElements.add(template.find(".homework-content"));
  }

  $("#random-homework-list").empty().append(newContent.children());
  showMoreButtonElements.trigger("addedToDom");

  $(".random-homework-deactivate-option").on("click", function () {
    const id = Number.parseInt($(this).attr("data-id") ?? "");
    if (randomHomeworkDeactivated.includes(id)) {
      randomHomeworkDeactivated.splice(randomHomeworkDeactivated.indexOf(id), 1);
    }
    else {
      if (randomHomeworkDeactivated.length === todoHomework.length - 1) return;
      randomHomeworkDeactivated.push(id);
    }
    $(this).toggleClass("random-homework-deactivated");
    renderRandomHomeworkWheel(todoHomework.filter(h => !randomHomeworkDeactivated.includes(h.homeworkId)));
  });

  renderRandomHomeworkWheel(todoHomework.filter(h => !randomHomeworkDeactivated.includes(h.homeworkId)));

  $("#random-homework-wheel").off("click").one("click", () => {
    $("#random-homework-list, #random-homework-list-explanation").hide();
    chooseRandomHomework(todoHomework.filter(h => !randomHomeworkDeactivated.includes(h.homeworkId)));
  });
}

async function renderSubjectList(): Promise<void> {
  const addHomeworkSubjectVal = $("#add-homework-subject").val() ?? "";
  const editHomeworkSubjectVal = $("#edit-homework-subject").val() ?? "";

  // Clear the select element in the add & edit homework modal
  $("#add-homework-subject, #edit-homework-subject").html('<option value="" disabled selected>Fach</option>');
  // Clear the list for filtering by subject
  $("#filter-subject-list").empty();

  const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
  filterData.subject ??= {};

  for (const subject of [...await subjectData(), {subjectId: -1, subjectNameLong: "Sonstiges"}]) {
    // Get the subject data
    const subjectId = subject.subjectId;
    const subjectName = subject.subjectNameLong;

    filterData.subject[subjectId] ??= true;
    const checkedStatus = filterData.subject[subjectId] ? "checked" : "";
    if (checkedStatus !== "checked") $("#filter-changed").show();

    // Add the template for filtering by subject
    const templateFilterSubject = `
      <label class="form-check flex-grow-1 text-center mb-0 ps-2rem pe-2 py-1 border rounded bg-body-tertiary">
        <input type="checkbox" class="form-check-input filter-subject-option me-2"
          id="filter-subject-${subjectId}" data-id="${subjectId}" ${checkedStatus}>
        ${escapeHTML(subjectName)}
      </label>`;
    $("#filter-subject-list").append(templateFilterSubject);

    // Add the template for the select elements
    const templateFormSelect = `<option value="${subjectId}">${escapeHTML(subjectName)}</option>`;
    $("#add-homework-subject, #edit-homework-subject").append(templateFormSelect);
  };

  if (addHomeworkSubjectVal !== "") $("#add-homework-subject").val(addHomeworkSubjectVal);
  if (editHomeworkSubjectVal !== "") $("#edit-homework-subject").val(editHomeworkSubjectVal);

  localStorage.setItem("homeworkFilter", JSON.stringify(filterData));

  $("#add-homework-no-subjects").toggleClass("d-none", (await subjectData()).length !== 0).find("b").text(
    user.permissionLevel < 3 ?
      "Bitte einen Admin / ein:e Manager:in, welche hinzuzufügen!" :
      "Füge in den Einstellungen unter \"Klasse\" > \"Fächer\" welche hinzu!"
  );
};

async function renderTeamList(): Promise<void> {
  const addHomeworkTeamVal = $("#add-homework-team").val() ?? "-1";
  const editHomeworkTeamVal = $("#edit-homework-team").val() ?? "-1";

  // Clear the select element in the add & edit homework modal
  $("#add-homework-team, #edit-homework-team").empty().append('<option value="-1" selected>Alle</option>');

  for (const team of (await teamsData())) {
    // Add the template for the select elements
    $("#add-homework-team, #edit-homework-team").append(`<option value="${team.teamId}">${escapeHTML(team.name)}</option>`);
  };

  $("#add-homework-team").val(addHomeworkTeamVal);
  $("#edit-homework-team").val(editHomeworkTeamVal);
};

async function addHomework(): Promise<void> {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS A HOMEWORK
  //

  // Set the data inputs in the add homework modal
  $("#add-homework-team").val("-1").removeClass("is-autocompleted is-suspicious");
  $("#add-homework-date-submission").val("").removeClass("is-autocompleted is-suspicious");

  const currentLesson = await getCurrentLesson();

  if (currentLesson) {
    autocomplete($("#add-homework-subject"), currentLesson.lessons[0].subjectId);
  }
  else {
    $("#add-homework-subject").val("").removeClass("is-autocompleted");
    $("#add-homework-date-submission").val("").removeClass("is-autocompleted is-suspicious");
  }
  $("#add-homework-content").val("").trigger("change");
  autocomplete($("#add-homework-date-assignment"), msToInputDate(Date.now()));

  // Disable the actual "add" button, because not all information is given
  $("#add-homework-button").prop("disabled", true);

  // Show the add homework modal
  $("#add-homework-modal").modal("show");

  // Called when the user clicks the "add" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#add-homework-button")
    .off("click")
    .on("click", async () => {
      // Save the given information in variables
      const subjectId = $("#add-homework-subject").val();
      const content = $("#add-homework-content").val()?.toString().trim();
      const assignmentDate = $("#add-homework-date-assignment").val()?.toString() ?? "";
      const submissionDate = $("#add-homework-date-submission").val()?.toString() ?? "";
      const teamId = $("#add-homework-team").val();

      await ajax("POST", "/api/homework", {
        body: {
          subjectId,
          content,
          assignmentDate: dateToMs(assignmentDate),
          submissionDate: dateToMs(submissionDate),
          teamId
        },
        queueable: true
      });

      $("#add-homework-success-toast").toast("show");
      $("#add-homework-modal").modal("hide");
    });
}

async function pinHomework(homeworkId: number): Promise<void> {
  const homework = (await homeworkData()).find(h => h.homeworkId === homeworkId);
  if (!homework) return;

  await ajax("PATCH", `/api/homework/${homeworkId}/pin`, {
    body: {
      pinStatus: !homework.isPinned
    },
    queueable: true
  });
}

async function editHomework(homeworkId: number): Promise<void> {
  //
  // CALLED WHEN THE USER CLICKS THE "EDIT" OPTION OF A HOMEWORK, NOT WHEN USER ACTUALLY EDITS A HOMEWORK
  //

  const homework = (await homeworkData()).find(h => h.homeworkId === homeworkId);
  if (!homework) return;

  // Set the inputs on the already saved information
  $("#edit-homework-subject").val(homework.subjectId);
  $("#edit-homework-content").val(homework.content).trigger("change");
  $("#edit-homework-date-assignment").val(msToInputDate(homework.assignmentDate)).removeClass("is-suspicious");
  $("#edit-homework-date-submission").val(msToInputDate(homework.submissionDate)).removeClass("is-autocompleted is-suspicious is-invalid");
  $("#edit-homework-team").val(homework.teamId).removeClass("is-autocompleted is-suspicious");

  // Enable the actual "edit" button, because all information is given
  $("#edit-homework-button").prop("disabled", false);

  // Show the edit homework modal
  $("#edit-homework-modal").modal("show");

  // Called when the user clicks the "edit" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#edit-homework-button")
    .off("click")
    .on("click", async () => {
      // Save the given information in variables
      const subjectId = $("#edit-homework-subject").val();
      const content = $("#edit-homework-content").val()?.toString().trim();
      const assignmentDate = $("#edit-homework-date-assignment").val()?.toString() ?? "";
      const submissionDate = $("#edit-homework-date-submission").val()?.toString() ?? "";
      const teamId = $("#edit-homework-team").val();

      await ajax("PATCH", `/api/homework/${homeworkId}`, {
        body: {
          subjectId,
          content,
          assignmentDate: dateToMs(assignmentDate),
          submissionDate: dateToMs(submissionDate),
          teamId
        },
        queueable: true
      });

      $("#edit-homework-success-toast").toast("show");
      $("#edit-homework-modal").modal("hide");
    });
}

function deleteHomework(homeworkId: number): void {
  //
  // CALLED WHEN THE USER CLICKS THE "DELETE" OPTION OF A HOMEWORK, NOT WHEN USER ACTUALLY DELETES A HOMEWORK
  //

  // Show a confirmation notification
  $("#delete-homework-confirm-toast").toast("show");

  // Called when the user clicks the "confirm" button in the notification
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#delete-homework-confirm-toast-button")
    .off("click")
    .on("click", async () => {
      // Hide the confirmation toast
      $("#delete-homework-confirm-toast").toast("hide");

      await ajax("DELETE", `/api/homework/${homeworkId}`, {
        queueable: true
      });

      $("#delete-homework-success-toast").toast("show");
    });
}

async function checkHomework(homeworkId: number, checkStatus?: boolean): Promise<void> {
  justCheckedHomeworkId = homeworkId;
  // Save whether the user has checked or unchecked the homework
  checkStatus ??= $(`.homework-check[data-id="${homeworkId}"]`).prop("checked");

  // Check whether the user is logged in
  if (user.loggedIn) {
    await ajax("PATCH", `/api/homework/${homeworkId}/check`, {
      body: { checkStatus: checkStatus },
      queueable: true
    });
  }
  else {
    // The user is not logged in

    // Get the already saved data
    let dataString = localStorage.getItem("homeworkCheckedData");
    const data = JSON.parse(dataString ?? "[]");

    if (checkStatus) {
      data.push(homeworkId);
    }
    else {
      data.splice(data.indexOf(homeworkId), 1);
    }

    dataString = JSON.stringify(data);

    localStorage.setItem("homeworkCheckedData", dataString);
    
    homeworkCheckedData.reload();
    renderHomeworkList();
  }
}

function updateFilters(ignoreSubjects?: boolean): void {
  $("#filter-changed").hide();

  const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};

  filterData.statusUnchecked ??= true;
  $("#filter-status-unchecked").prop("checked", filterData.statusUnchecked);
  if (! filterData.statusUnchecked) $("#filter-changed").show();

  filterData.statusChecked ??= true;
  $("#filter-status-checked").prop("checked", filterData.statusChecked);
  if (! filterData.statusChecked) $("#filter-changed").show();

  filterData.dateFromOffset ??= 0;
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() + filterData.dateFromOffset);
  $("#filter-date-from").val(msToInputDate(dateFrom.getTime()));
  if (filterData.dateFromOffset !== 0) $("#filter-changed").show();

  filterData.dateUntilOffset ??= 0;
  const dateUntil = new Date();
  dateUntil.setMonth(dateUntil.getMonth() + 1);
  dateUntil.setDate(dateUntil.getDate() + filterData.dateUntilOffset);
  $("#filter-date-until").val(msToInputDate(dateUntil.getTime()));
  if (filterData.dateUntilOffset !== 0) $("#filter-changed").show();
  
  if (! ignoreSubjects) {
    renderSubjectList();
  }
}

function toggleShownButtons(): void {
  $("#edit-toggle, #edit-toggle-label").toggle(user.permissionLevel >= 1);
  $("#show-add-homework-button").toggle(user.permissionLevel >= 1);
  if (user.permissionLevel < 1) {
    $(".edit-option").addClass("d-none");
  }
}

export async function init(): Promise<void> {
  return new Promise(res => {
    justCheckedHomeworkId = -1;
    animations = JSON.parse(localStorage.getItem("animations") ?? "true") as boolean;
    homeworkFeedbackLastPercentage = null as null | number;

    $("#edit-toggle").on("click", function () {
      $(".edit-option").toggle($(this).is(":checked"));
    }).prop("checked", false);

    function appendFilterContent(): void {
      $("#filter-content").appendTo(`#filter-${window.innerWidth >= 768 ? "modal" : "offcanvas"}-body`);
    }

    $("#filter-toggle").on("click", function () {
      appendFilterContent();
      if (window.innerWidth >= 768) $("#filter-modal").modal("show");
      else $("#filter-offcanvas").offcanvas("show");
    });
    appendFilterContent();

    $("#search-toggle").on("change", function () {
      const checked = $(this).is(":checked");
      $("#search-homework").toggle(checked);
      if (checked) $("#search-homework input").trigger("focus");
      else $("#search-homework").val("");
    }).prop("checked", false).trigger("change");

    updateFilters(true);
    $(".filter-reset").on("click", () => {
      localStorage.setItem("homeworkFilter", "{}");
      updateFilters();
      renderHomeworkList();
    });

    $("#search-homework").on("input", renderHomeworkList);

    async function subjectInputCallback(this: HTMLElement, addOrEdit: "add" | "edit"): Promise<void> {
      const now = new Date();

      const selectedSubjectId = $(this).val()?.toString();
      const selectedSubjectName = $(this).find("option:selected").text();
      if (selectedSubjectId === undefined) {
        return;
      }

      const nextLessonWithDate = await getNextLessonWithDate(Number.parseInt(selectedSubjectId));

      if (nextLessonWithDate === null) { // "Other" or never in timetable
        $(`#${addOrEdit}-homework-team`).val("-1").removeClass("is-autocompleted is-suspicious");
        tryAutocomplete($(`#${addOrEdit}-homework-date-submission`), msToInputDate(now.setDate(now.getDate() + 7)));
        $(`#${addOrEdit}-homework-date-submission`).removeClass("is-suspicious").find("~ .autocompleted-feedback")
          .html("Automatisch: Eine Woche");
        return;
      }

      $(`#${addOrEdit}-homework-date-submission ~ .autocompleted-feedback`).html("Automatisch: Die nächste Stunde in <b></b>");

      const $submissionDate = $(`#${addOrEdit}-homework-date-submission`);
      if (tryAutocomplete($submissionDate, msToInputDate(nextLessonWithDate.date.getTime()))) {
        // The user hasn't decided for a specific submission date
        $submissionDate.find("~ .autocompleted-feedback b").text(selectedSubjectName);
      }
      else {
        $submissionDate.trigger("autocomplete");
      }

      const teamId = nextLessonWithDate.lesson.teamId;
      tryAutocomplete($(`#${addOrEdit}-homework-team`), nextLessonWithDate.lesson.teamId, "-1");
      $(`#${addOrEdit}-homework-team`).find("~ .autocompleted-feedback b").text(selectedSubjectName);
      if (teamId === -1) {
        $(`#${addOrEdit}-homework-team`).removeClass("is-autocompleted");
      }
    }

    const checkSubmissionAfterAssignment = (addOrEdit: "add" | "edit"): void => {
      const assignment = getInputValue($(`#${addOrEdit}-homework-date-assignment`));
      const submission = getInputValue($(`#${addOrEdit}-homework-date-submission`));
      if (assignment === "" || submission === "") return;
      $(`#${addOrEdit}-homework-date-submission`).toggleClass("is-invalid", new Date(assignment).getTime() > new Date(submission).getTime());
    };

    async function dateAssignmentInputCallback(this: HTMLElement, addOrEdit: "add" | "edit"): Promise<void> {
      const val = getInputValue($(this));
      if (val === "") {
        $(this).removeClass("is-suspicious");
        return;
      }

      checkSubmissionAfterAssignment(addOrEdit);

      const date = new Date(val);
      const now = new Date();

      $(this).toggleClass("is-suspicious", date.getTime() > now.getTime() && !isSameDay(date, now));
    }

    async function dateSubmissionInputCallback(this: HTMLElement, addOrEdit: "add" | "edit"): Promise<void> {
      const val = getInputValue($(this));
      if (val === "") {
        $(this).removeClass("is-suspicious is-invalid");
        return;
      }

      checkSubmissionAfterAssignment(addOrEdit);
      
      const date = new Date(val);
      const now = new Date();
      if (date.getTime() < now.getTime() && !isSameDay(date, now)) {
        $(this).addClass("is-suspicious").find("~ .suspicious-feedback")
          .html("Bist du dir sicher? Dieses Datum liegt in der Vergangenheit!");
        return;
      }

      const selectedSubjectId = $(`#${addOrEdit}-homework-subject`).val()?.toString() ?? "";
      const selectedSubjectName = $(`#${addOrEdit}-homework-subject option:selected`).text();

      const nextLessonWithDate = await getNextLessonWithDate(Number.parseInt(selectedSubjectId));

      if (nextLessonWithDate !== null) {
        if (!nextLessonWithDate.otherWeekDays.includes(new Date(val).getDay() - 1)) {
          $(this).addClass("is-suspicious").find("~ .suspicious-feedback")
            .html(`Bist du dir sicher? An diesem Tag gibt es im Fach <b>${escapeHTML(selectedSubjectName)}</b> keinen Unterricht!`);
          return;
        }
      }

      $(this).removeClass("is-suspicious");
    }

    // On changing any information in the add homework modal, disable the add button if any information is empty
    $(".add-homework-input").on("input", () => {
      // Required so the autocompleted submission date gets updated first if the subject is changed
      requestAnimationFrame(() => {
        const subject = $("#add-homework-subject").val();
        const content = $("#add-homework-content").val()?.toString().trim();
        const assignmentDate = $("#add-homework-date-assignment").val();
        const submissionDate = $("#add-homework-date-submission").val();

        $("#add-homework-button").prop("disabled",
          [content, assignmentDate, submissionDate].includes("")
          || subject === null
          || $("#add-homework-date-submission").hasClass("is-invalid")
        );
      });
    });

    $("#add-homework-subject").on("input autocomplete", function () {
      subjectInputCallback.call(this, "add");
    });
    $("#add-homework-date-assignment").on("input autocomplete", function () {
      dateAssignmentInputCallback.call(this, "add");
    });
    $("#add-homework-date-submission").on("input autocomplete", function () {
      dateSubmissionInputCallback.call(this, "add");
    });
    $("#add-homework-team").on("input autocomplete", checkTeamInputForSuspicious);

    // On changing any information in the edit homework modal, disable the edit button if any information is empty
    $(".edit-homework-input").on("input", () => {
      const subject = $("#edit-homework-subject").val();
      const content = $("#edit-homework-content").val()?.toString().trim();
      const assignmentDate = $("#edit-homework-date-assignment").val();
      const submissionDate = $("#edit-homework-date-submission").val();

      $("#edit-homework-button").prop(
        "disabled", [content, assignmentDate, submissionDate].includes("")
        || subject === null
        || $("#edit-homework-date-submission").hasClass("is-invalid")
      );
    });

    $("#edit-homework-subject").on("input autocomplete", function () {
      subjectInputCallback.call(this, "edit");
    });
    $("#edit-homework-date-assignment").on("input autocomplete", function () {
      dateAssignmentInputCallback.call(this, "edit");
    });
    $("#edit-homework-date-submission").on("input autocomplete", function () {
      dateSubmissionInputCallback.call(this, "edit");
    });
    $("#edit-homework-team").on("input autocomplete", checkTeamInputForSuspicious);

    $("#app").on("click", "#homework-feedback-random", prepareRandomHomework);

    $("#show-add-homework-button").on("click", addHomework);

    // Pin the homework on clicking its pin icon
    $("#app").on("click", ".homework-pin", function () {
      pinHomework($(this).data("id"));
    });

    // Request deleting the homework on clicking its delete icon
    $("#app").on("click", ".homework-delete", function () {
      deleteHomework($(this).data("id"));
    });

    // Request editing the homework on clicking its delete icon
    $("#app").on("click", ".homework-edit", function () {
      editHomework($(this).data("id"));
    });

    // Request checking the homework on clicking its checkbox
    $("#app").on("click", ".homework-check", function () {
      checkHomework($(this).data("id"));
    });

    // On changing the filter unchecked option, update the homework list & saved filters
    $("#filter-status-unchecked").on("change", () => {
      const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
      filterData.statusUnchecked = $("#filter-status-unchecked").prop("checked");
      localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
      updateFilters();
      renderHomeworkList();
    });

    // On changing the filter checked option, update the homework list & saved filters
    $("#filter-status-checked").on("change", () => {
      const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
      filterData.statusChecked = $("#filter-status-checked").prop("checked");
      localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
      updateFilters();
      renderHomeworkList();
    });

    // On clicking the all subjects option, check all and update the homework list
    $("#filter-subject-all").on("click", () => {
      const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
      filterData.subject ??= {};
      $(".filter-subject-option").prop("checked", true);
      $(".filter-subject-option").each(function () {
        filterData.subject[$(this).data("id")] = true;
      });
      localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
      updateFilters();
      renderHomeworkList();
    });

    // On clicking the none subjects option, uncheck all and update the homework list
    $("#filter-subject-none").on("click", () => {
      const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
      filterData.subject ??= {};
      $(".filter-subject-option").prop("checked", false);
      $(".filter-subject-option").each(function () {
        filterData.subject[$(this).data("id")] = false;
      });
      localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
      updateFilters();
      renderHomeworkList();
    });

    // If any subject filter gets changed, update the shown homework
    $("#app").on("change", ".filter-subject-option", function () {
      renderHomeworkList();
      const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
      filterData.subject ??= {};
      filterData.subject[$(this).data("id")] = $(this).prop("checked");
      localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
      updateFilters();
    });

    // On changing any filter date option, update the homework list
    $("#filter-date-from").on("change", function () {
      const selectedDate = new Date($(this).val()?.toString() ?? "");
      const normalDate = new Date();
      const diff = dateDaysDifference(selectedDate, normalDate);

      const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
      filterData.dateFromOffset = Number.isNaN(diff) ? "NaN" : diff;
      localStorage.setItem("homeworkFilter", JSON.stringify(filterData));

      updateFilters();
      renderHomeworkList();
    });

    // On changing any filter date option, update the homework list
    $("#filter-date-until").on("change", function () {
      const selectedDate = new Date($(this).val()?.toString() ?? "");
      const normalDate = new Date();
      normalDate.setMonth(normalDate.getMonth() + 1);
      const diff = dateDaysDifference(selectedDate, normalDate);

      const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
      filterData.dateUntilOffset = Number.isNaN(diff) ? "NaN" : diff;
      localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
      
      updateFilters();
      renderHomeworkList();
    });

    res();
  });
}

let justCheckedHomeworkId: number;
let animations: boolean;
let homeworkFeedbackLastPercentage: null | number;
let randomHomeworkDeactivated: number[] = [];

await lessonData.init();
(await homeworkData.init()).on("update", onlyThisSite(renderHomeworkList));
(await homeworkCheckedData.init()).on("update", onlyThisSite(renderHomeworkList));
(await subjectData.init()).on("update", onlyThisSite(renderSubjectList));
(await teamsData.init()).on("update", onlyThisSite(() => {
  renderTeamList(); 
  renderHomeworkList(); 
}));

await user.awaitAuthed();

(await joinedTeamsData.init()).on("update", onlyThisSite(renderHomeworkList));

export async function renderAllFn(): Promise<void> {
  await renderSubjectList();
  await renderHomeworkList();
  await renderTeamList();

  toggleShownButtons();
};
