import {
  dateToMs,
  getHomeworkCheckStatus,
  homeworkCheckedData,
  homeworkData,
  isSameDay,
  joinedTeamsData,
  msToDisplayDate,
  msToInputDate,
  subjectData,
  teamsData,
  socket,
  csrfToken,
  lessonData,
  escapeHTML,
  getCirclePath
} from "../../global/global.js";
import { HomeworkData } from "../../global/types";
import { $navbarToasts, user } from "../../snippets/navbar/navbar.js";
import { richTextToHtml } from "../../snippets/richTextarea/richTextarea.js";

async function updateHomeworkList(): Promise<void> {
  async function getFilteredData(): Promise<(HomeworkData[number] & { checked: boolean })[]> {
    // Add the check value to each homework
    let data = await Promise.all(
      (await homeworkData()).map(async h => ({
        ...h,
        checked: await getHomeworkCheckStatus(h.homeworkId)
      }))
    );
    // Filter by min. date
    const filterDateMin = Date.parse($("#filter-date-from").val()?.toString() ?? "");
    if (!isNaN(filterDateMin)) {
      data = data.filter(h => filterDateMin <= parseInt(h.submissionDate));
    }
    // Filter by max. date
    const filterDateMax = Date.parse($("#filter-date-until").val()?.toString() ?? "");
    if (!isNaN(filterDateMax)) {
      data = data.filter(h => filterDateMax >= parseInt(h.assignmentDate));
    }
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
    
    return data;
  }

  const newContent = $("<div></div>");
  let showMoreButtonElements: JQuery<HTMLElement> = $();

  // Check if user is in edit mode
  const editEnabled = $("#edit-toggle").is(":checked");

  const data = await getFilteredData();

  let nextWeek = false;

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

    const today = new Date();
    today.setDate(today.getDate() + 7 - today.getDay());
    if (!nextWeek && parseInt(homework.submissionDate) > today.getTime()) {
      nextWeek = true;
      newContent.append(`
        <hr class="border-2 text-primary mb-0 mt-2">
        <div class="form-text text-primary opacity-50 mt-0">Nächste Woche</div>
      `);
    }

    const homeworkId = homework.homeworkId;

    // Get the information for the homework
    const subject = (await subjectData()).find(s => s.subjectId === homework.subjectId)?.subjectNameLong ?? "Sonstiges";
    const content = homework.content;
    const assignmentDate = msToDisplayDate(homework.assignmentDate);
    const submissionDate = msToDisplayDate(homework.submissionDate);

    // The template for a homework with checkbox and edit options
    const template = $(`
      <div class="mb-1 mt-2 d-flex">
        <div class="form-check">
          <div class="homework-check-wrapper form-check-input invisible">
            <input type="checkbox" class="form-check-input homework-check visible" id="homework-check-${homeworkId}"
              data-id="${homeworkId}" ${homework.checked ? "checked" : ""}>
          </div>
          <label class="form-check-label" for="homework-check-${homeworkId}">
            <span class="fw-bold">${escapeHTML(subject)}</span>
          </label>
          <span class="homework-content"></span>
          <span class="ms-4 d-block">Von ${assignmentDate} auf ${submissionDate}</span>
        </div>

        <div class="homework-edit-options ms-2 text-nowrap">
          <button class="btn btn-sm btn-semivisible homework-edit ${editEnabled ? "" : "d-none"}" data-id="${homeworkId}" aria-label="Bearbeiten">
            <i class="fa-solid fa-edit opacity-75" aria-hidden="true"></i>
          </button>
          <button class="btn btn-sm btn-semivisible homework-delete ${editEnabled ? "" : "d-none"}" data-id="${homeworkId}" aria-label="Löschen">
            <i class="fa-solid fa-trash opacity-75" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `);
    
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

  // If no homeworks match, add an explanation text
  $("#edit-toggle, #edit-toggle-label").toggle(newContent.html() !== "" && (user.permissionLevel ?? 0) >= 1);
  $("#filter-toggle, #filter-toggle ~ label").toggle((await homeworkData()).length > 0);
  if (newContent.html() === "") {
    newContent.html('<div class="text-secondary">Keine Hausaufgaben mit diesen Filtern.</div>');
  }
  $("#homework-list").empty().append(newContent.children());
  showMoreButtonElements.trigger("addedToDom");

  updateHomeworkFeedback();
};

async function updateHomeworkFeedback(): Promise<void> {
  const currentJoinedTeamsData = await joinedTeamsData();

  const todoHomeworkData = (await homeworkData()).filter(h =>
    (currentJoinedTeamsData.includes(h.teamId) || h.teamId === -1)
    && (Date.now() <= parseInt(h.submissionDate) || isSameDay(new Date(), new Date(parseInt(h.submissionDate))))
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
      ${todo > 1 ? '<button id="homework-feedback-random" class="btn btn-primary btn-sm fw-bold ms-2">Zufällige auswählen</button>' : ""}
    `);
    $("#homework-feedback-done").hide();
    $("#homework-feedback-outer-circle").show();

    const halfSize = ($("#homework-feedback-inner-circle").outerWidth() ?? 0) / 2;
    const percentage = 1 - todo / total;
    let animationPercentage = (homeworkFeedbackLastPercentage && animations) ? homeworkFeedbackLastPercentage : percentage;

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

async function chooseRandomHomework(excludeId?: number): Promise<void> {
  const currentJoinedTeamsData = await joinedTeamsData();
  const currentSubjectData = await subjectData();

  const currentHomeworkData = (await homeworkData()).filter(h =>
    (currentJoinedTeamsData.includes(h.teamId) || h.teamId === -1) && Date.now() <= parseInt(h.submissionDate) && h.homeworkId !== excludeId
  );

  const todoHomework: HomeworkData = [];
  for (const h of currentHomeworkData) {
    if (!await getHomeworkCheckStatus(h.homeworkId)) {
      todoHomework.push(h);
    }
  }
  const todo = todoHomework.length;

  $("#random-homework-wheel").toggle(animations);
  $("#random-homework-result").empty();
  $("#random-homework-modal").modal("show");
  $("#random-homework-next").prop("disabled", true);
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
        "rotate": angle * (i + 0.5) + "deg"
      }).end();
  }));

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
    const assignmentDate = msToDisplayDate(h.assignmentDate);
    const submissionDate = msToDisplayDate(h.submissionDate);
    $("#random-homework-result").html(`
      <h5>Ausgewählte Hausaufgabe:</h5>
      <div>
        <span class="fw-bold">${escapeHTML(subject)}</span>
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
        chooseRandomHomework(h.homeworkId);
      }
    });
  }
}

async function updateSubjectList(): Promise<void> {
  // Clear the select element in the add homework modal
  $("#add-homework-subject").empty();
  $("#add-homework-subject").append('<option value="" disabled selected>Fach</option>');
  // Clear the select element in the edit homework modal
  $("#edit-homework-subject").empty();
  $("#edit-homework-subject").append('<option value="" disabled selected>Fach</option>');
  // Clear the list for filtering by subject
  $("#filter-subject-list").empty();

  const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
  filterData.subject ??= {};

  await Promise.all((await subjectData()).map(subject => {
    // Get the subject data
    const subjectId = subject.subjectId;
    const subjectName = subject.subjectNameLong;

    filterData.subject[subjectId] ??= true;
    const checkedStatus = filterData.subject[subjectId] ? "checked" : "";
    if (checkedStatus !== "checked") $("#filter-changed").removeClass("d-none");

    // Add the template for filtering by subject
    const templateFilterSubject = `<div class="form-check">
        <input type="checkbox" class="form-check-input filter-subject-option"
          id="filter-subject-${subjectId}" data-id="${subjectId}" ${checkedStatus}>
        <label class="form-check-label" for="filter-subject-${subjectId}">
          ${escapeHTML(subjectName)}
        </label>
      </div>`;
    $("#filter-subject-list").append(templateFilterSubject);

    // Add the template for the select elements
    const templateFormSelect = `<option value="${subjectId}">${escapeHTML(subjectName)}</option>`;
    $("#add-homework-subject").append(templateFormSelect);
    $("#edit-homework-subject").append(templateFormSelect);
  }));

  $("#add-homework-subject").append('<option value="-1">Sonstiges</option>');
  $("#edit-homework-subject").append('<option value="-1">Sonstiges</option>');

  // If any subject filter gets changed, update the shown homework
  $(".filter-subject-option").on("change", function () {
    updateHomeworkList();
    const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
    filterData.subject ??= {};
    filterData.subject[$(this).data("id")] = $(this).prop("checked");
    localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
    updateFilters();
  });

  localStorage.setItem("homeworkFilter", JSON.stringify(filterData));

  $("#add-homework-no-subjects").toggleClass("d-none", (await subjectData()).length !== 0).find("b").text(
    (user.permissionLevel ?? 0) < 3 ?
      "Bitte einen Admin / ein:e Manager:in, welche hinzuzufügen!" :
      "Füge in den Einstellungen unter \"Klasse\" > \"Fächer\" welche hinzu!"
  );
};

async function updateTeamList(): Promise<void> {
  // Clear the select element in the add homework modal
  $("#add-homework-team").empty();
  $("#add-homework-team").append('<option value="-1" selected>Alle</option>');
  // Clear the select element in the edit homework modal
  $("#edit-homework-team").empty();
  $("#edit-homework-team").append('<option value="-1" selected>Alle</option>');

  (await teamsData()).forEach(team => {
    // Get the team data
    const teamName = team.name;

    // Add the template for the select elements
    const templateFormSelect = `<option value="${team.teamId}">${escapeHTML(teamName)}</option>`;
    $("#add-homework-team").append(templateFormSelect);
    $("#edit-homework-team").append(templateFormSelect);
  });
};

async function addHomework(): Promise<void> {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS A HOMEWORK
  //

  // Set the data inputs in the add homework modal
  const now = new Date();
  const currentJoinedTeamsData = (await joinedTeamsData());
  const timeNow = (now.getHours() * 60 + now.getMinutes() - 5) * 60 * 1000; // Pretend it's 5min earlier, in case the lesson was just over
  const currentLessonData = await lessonData();
  const currentLesson = currentLessonData.find(lesson => // Find the current lesson
    (lesson.teamId === -1 || currentJoinedTeamsData.includes(lesson.teamId)) // The user is in the team
    && lesson.weekDay === now.getDay() - 1 // The lesson is today
    && parseInt(lesson.startTime) < timeNow && parseInt(lesson.endTime) > timeNow // The lesson is now
  );
  if (currentLesson) {
    $("#add-homework-subject").val(currentLesson.subjectId).addClass("autocomplete");
    const nextLessons = currentLessonData.filter(lesson => lesson.subjectId === currentLesson.subjectId); // The next lessons of the subject

    const nextLessonsWeekdays = [...new Set(nextLessons.map(e => e.weekDay))]; // Get the unique weekdays
    const minDiff = nextLessonsWeekdays.reduce((previous, current) => {
      let diff = (current - (now.getDay() - 1) + 7) % 7; // The difference in days
      if (diff === 0) diff = 7;
      return Math.min(diff, previous);
    }, 7);
    
    const nextLessonDate = (new Date());
    nextLessonDate.setDate(nextLessonDate.getDate() + minDiff);

    $("#add-homework-date-submission").val(msToInputDate(nextLessonDate.getTime())).addClass("autocomplete")
      .find("~ .autocomplete-feedback b").text($("#add-homework-subject option:selected").text());
    
    if (currentLesson.teamId !== -1) {
      $("#add-homework-team").val(currentLesson.teamId).addClass("autocomplete")
        .find("~ .autocomplete-feedback b").text($("#add-homework-subject option:selected").text());
    }
    else {
      $("#add-homework-team").val("-1").removeClass("autocomplete");
    }
  }
  else {
    $("#add-homework-subject").val("").removeClass("autocomplete");
    $("#add-homework-date-submission").val("").removeClass("autocomplete");
    $("#add-homework-team").val("-1").removeClass("autocomplete");
  }
  $("#add-homework-content").val("");
  $("#add-homework-content").trigger("change");
  $("#add-homework-date-assignment").val(msToInputDate(Date.now())).addClass("autocomplete");

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
      const subject = $("#add-homework-subject").val();
      const content = $("#add-homework-content").val()?.toString().trim();
      const assignmentDate = $("#add-homework-date-assignment").val()?.toString() ?? "";
      const submissionDate = $("#add-homework-date-submission").val()?.toString() ?? "";
      const team = $("#add-homework-team").val();

      // Prepare the POST request
      const data = {
        subjectId: subject,
        content: content,
        assignmentDate: dateToMs(assignmentDate),
        submissionDate: dateToMs(submissionDate),
        teamId: team
      };
      // Save whether the server has responed
      let hasResponded = false;

      // Post the request
      $.ajax({
        url: "/homework/add_homework",
        type: "POST",
        data: data,
        headers: {
          "X-CSRF-Token": await csrfToken()
        },
        success: () => {
          // Show a success notification and update the shown homework
          $("#add-homework-success-toast").toast("show");
          // Hide the add homework modal
          $("#add-homework-modal").modal("hide");
        },
        error: xhr => {
          if (xhr.status === 401) {
            // The user has to be logged in but isn't
            // Show an error notification
            $navbarToasts.notLoggedIn.toast("show");
          }
          else if (xhr.status === 500) {
            // An internal server error occurred
            $navbarToasts.serverError.toast("show");
          }
          else {
            $navbarToasts.unknownError.toast("show");
          }
        },
        complete: () => {
          // The server has responded
          hasResponded = true;
        }
      });
      setTimeout(() => {
        // Wait for 1s
        if (!hasResponded) {
          // If the server hasn't answered, show the internal server error notification
          $navbarToasts.serverError.toast("show");
        }
      }, 5000);
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
  $("#edit-homework-date-assignment").val(msToInputDate(homework.assignmentDate));
  $("#edit-homework-date-submission").val(msToInputDate(homework.submissionDate));
  $("#edit-homework-team").val(homework.teamId);

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
      const subject = $("#edit-homework-subject").val();
      const content = $("#edit-homework-content").val()?.toString().trim();
      const assignmentDate = $("#edit-homework-date-assignment").val()?.toString() ?? "";
      const submissionDate = $("#edit-homework-date-submission").val()?.toString() ?? "";
      const team = $("#edit-homework-team").val();

      const data = {
        homeworkId: homeworkId,
        subjectId: subject,
        content: content,
        assignmentDate: dateToMs(assignmentDate),
        submissionDate: dateToMs(submissionDate),
        teamId: team
      };
      // Save whether the server has responed
      let hasResponded = false;

      // Post the request
      $.ajax({
        url: "/homework/edit_homework",
        type: "POST",
        data: data,
        headers: {
          "X-CSRF-Token": await csrfToken()
        },
        success: () => {
          // Show a success notification and update the shown homework
          $("#edit-homework-success-toast").toast("show");
          $("#edit-homework-modal").modal("hide");
        },
        error: xhr => {
          if (xhr.status === 401) {
            // The user has to be logged in but isn't
            // Show an error notification
            $navbarToasts.notLoggedIn.toast("show");
          }
          else if (xhr.status === 500) {
            // An internal server error occurred
            $navbarToasts.serverError.toast("show");
          }
          else {
            $navbarToasts.unknownError.toast("show");
          }
        },
        complete: () => {
          // The server has responded
          hasResponded = true;
        }
      });
      setTimeout(() => {
        // Wait for 1s
        if (!hasResponded) {
          // If the server hasn't answered, show the internal server error notification
          $navbarToasts.serverError.toast("show");
        }
      }, 5000);
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

      const data = {
        homeworkId: homeworkId
      };
      // Save whether the server has responed
      let hasResponded = false;

      // Post the request
      $.ajax({
        url: "/homework/delete_homework",
        type: "POST",
        data: data,
        headers: {
          "X-CSRF-Token": await csrfToken()
        },
        success: () => {
          // Show a success notification and update the shown homework
          $("#delete-homework-success-toast").toast("show");
          homeworkData.reload();
          updateHomeworkList();
        },
        error: xhr => {
          if (xhr.status === 401) {
            // The user has to be logged in but isn't
            // Show an error notification
            $navbarToasts.notLoggedIn.toast("show");
          }
          else if (xhr.status === 500) {
            // An internal server error occurred
            $navbarToasts.serverError.toast("show");
          }
          else {
            $navbarToasts.unknownError.toast("show");
          }
        },
        complete: () => {
          // The server has responded
          hasResponded = true;
        }
      });
      setTimeout(() => {
        // Wait for 1s
        if (!hasResponded) {
          // If the server hasn't answered, show the internal server error notification
          $navbarToasts.serverError.toast("show");
        }
      }, 5000);
    });
}

async function checkHomework(homeworkId: number, checkStatus?: boolean): Promise<void> {
  justCheckedHomeworkId = homeworkId;
  // Save whether the user has checked or unchecked the homework
  checkStatus ??= $(`.homework-check[data-id="${homeworkId}"]`).prop("checked");

  // Check whether the user is logged in
  if (user.loggedIn) {
    // The user is logged in
    const data = {
      homeworkId: homeworkId,
      checkStatus: checkStatus
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url: "/homework/check_homework",
      type: "POST",
      data: data,
      headers: {
        "X-CSRF-Token": await csrfToken()
      },
      error: xhr => {
        if (xhr.status === 401) {
          // The user has to be logged in but isn't
          // Show an error notification
          $navbarToasts.notLoggedIn.toast("show");
        }
        else if (xhr.status === 500) {
          // An internal server error occurred
          $navbarToasts.serverError.toast("show");
        }
        else {
          $navbarToasts.unknownError.toast("show");
        }
      },
      complete: () => {
        // The server has responded
        hasResponded = true;
      }
    });
    setTimeout(() => {
      // Wait for 1s
      if (!hasResponded) {
        // If the server hasn't answered, show the internal server error notification
        $navbarToasts.serverError.toast("show");
      }
    }, 1000);
  }
  else {
    // The user is not logged in

    // Get the already saved data
    let dataString = localStorage.getItem("homeworkCheckedData");
    let data = [];

    if (dataString !== null && dataString !== undefined) {
      data = JSON.parse(dataString);
    }

    if (checkStatus) {
      data.push(homeworkId);
    }
    else {
      data.splice(data.indexOf(homeworkId), 1);
    }

    dataString = JSON.stringify(data);

    localStorage.setItem("homeworkCheckedData", dataString);
    
    homeworkCheckedData.reload();
    updateHomeworkList();
  }
}

function updateFilters(ignoreSubjects?: boolean): void {
  function updateDateFilters(): void {
    if (filterData.dateFrom === undefined) {
      $("#filter-date-from").val(msToInputDate(Date.now()));
    }
    else {
      $("#filter-date-from").val(filterData.dateFrom);
      if (!isSameDay(new Date(filterData.dateFrom), new Date())) $("#filter-changed").removeClass("d-none");
    }
  
    if (filterData.dateUntil === undefined) {
      const nextMonth = new Date(Date.now());
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      $("#filter-date-until").val(msToInputDate(nextMonth.getTime()));
    }
    else {
      $("#filter-date-until").val(filterData.dateUntil);
      const nextMonth = new Date(Date.now());
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      if (!isSameDay(new Date(filterData.dateUntil), nextMonth)) $("#filter-changed").removeClass("d-none");
    }
  }

  $("#filter-changed").addClass("d-none");

  const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};

  filterData.statusUnchecked ??= true;
  $("#filter-status-unchecked").prop("checked", filterData.statusUnchecked);
  if (! filterData.statusUnchecked) $("#filter-changed").removeClass("d-none");

  filterData.statusChecked ??= true;
  $("#filter-status-checked").prop("checked", filterData.statusChecked);
  if (! filterData.statusChecked) $("#filter-changed").removeClass("d-none");

  updateDateFilters();
  
  if (! ignoreSubjects) {
    updateSubjectList();
  }
}

function toggleShownButtons(): void {
  const loggedIn = user.loggedIn;
  $("#edit-toggle, #edit-toggle-label").toggle((user.permissionLevel ?? 0) >= 1);
  $("#show-add-homework-button").toggle((user.permissionLevel ?? 0) >= 1);
  if (!loggedIn) {
    $(".homework-edit-options button").addClass("d-none");
  }
}

export async function init(): Promise<void> {
  return new Promise(res => {
    justCheckedHomeworkId = -1;
    animations = JSON.parse(localStorage.getItem("animations") ?? "true") as boolean;
    homeworkFeedbackLastPercentage = null as null | number;

    $(function () {
      // Leave edit mode (if user entered it in a previous session)
      $("#edit-toggle").prop("checked", false);

      $("#edit-toggle").on("click", function () {
        if ($("#edit-toggle").is(":checked")) {
          // On checking the edit toggle, show the add button and edit options
          $(".homework-edit-options button").removeClass("d-none");
        }
        else {
          // On unchecking the edit toggle, hide the add button and edit options
          $(".homework-edit-options button").addClass("d-none");
        }
      });

      // Leave filter mode (if user entered it in a previous session)
      $("#filter-toggle").prop("checked", false);

      $("#filter-toggle").on("click", function () {
        if ($("#filter-toggle").is(":checked")) {
          // On checking the filter toggle, show the filter options
          $("#filter-content").removeClass("d-none");
          $("#filter-reset").removeClass("d-none");
        }
        else {
          // On checking the filter toggle, hide the filter options
          $("#filter-content").addClass("d-none");
          $("#filter-reset").addClass("d-none");
        }
      });

      if (!localStorage.getItem("homeworkFilter")) {
        localStorage.setItem("homeworkFilter", "{}");
      }
      updateFilters(true);
      $("#filter-reset").on("click", () => {
        localStorage.setItem("homeworkFilter", "{}");
        updateFilters();
        updateHomeworkList();
      });

      // On changing any information in the add homework modal, disable the add button if any information is empty
      $(".add-homework-input").on("input", () => {
        const subject = $("#add-homework-subject").val();
        const content = $("#add-homework-content").val()?.toString().trim();
        const assignmentDate = $("#add-homework-date-assignment").val();
        const submissionDate = $("#add-homework-date-submission").val();

        if ([content, assignmentDate, submissionDate].includes("") || subject === null) {
          $("#add-homework-button").prop("disabled", true);
        }
        else {
          $("#add-homework-button").prop("disabled", false);
        }
      });

      $("#add-homework-subject").on("input", async function () {
        const currentLessonData = await lessonData();
        const now = new Date();

        const selectedSubjectId = $(this).val()?.toString();
        if (["-1", undefined].includes(selectedSubjectId)) {
          return;
        }

        // The next lessons of the new selected subject
        const nextLessons = currentLessonData.filter(lesson => lesson.subjectId === parseInt(selectedSubjectId!));

        const nextLessonsWeekdays = [...new Set(nextLessons.map(e => e.weekDay))]; // Get the unique weekdays
        const minDiff = nextLessonsWeekdays.reduce((previous, current) => {
          let diff = (current - (now.getDay() - 1) + 7) % 7; // The difference in days
          if (diff === 0) diff = 7;
          return Math.min(diff, previous);
        }, 7);
        
        const nextLessonDate = (new Date());
        nextLessonDate.setDate(nextLessonDate.getDate() + minDiff);

        // Only overwrite if the user hasn't decided for a specific date
        const $submissionDate = $("#add-homework-date-submission");
        if (nextLessonsWeekdays.length > 0) {
          if ($submissionDate.is(".autocomplete") || $submissionDate.val() === "") {
            $submissionDate.val(msToInputDate(nextLessonDate.getTime())).addClass("autocomplete")
              .find("~ .autocomplete-feedback b").text($("#add-homework-subject option:selected").text());
          }
        }
        else {
          $submissionDate.val("").removeClass("autocomplete");
        }

        if (nextLessons.length > 0) {
          if ($("#add-homework-team").is(".autocomplete") || $("#add-homework-team").val() === "-1") {
            if (nextLessons[0].teamId === -1) {
              $("#add-homework-team").val("-1").removeClass("autocomplete");
            }
            else {
              $("#add-homework-team").val(nextLessons[0].teamId).addClass("autocomplete")
                .find("~ .autocomplete-feedback b").text($("#add-homework-subject option:selected").text());
            }
          }
        }
        else {
          $("#add-homework-team").val("-1").removeClass("autocomplete");
        }
      });

      // On changing any information in the edit homework modal, disable the edit button if any information is empty
      $(".edit-homework-input").on("input", () => {
        const subject = $("#edit-homework-subject").val();
        const content = $("#edit-homework-content").val()?.toString().trim();
        const assignmentDate = $("#edit-homework-date-assignment").val();
        const submissionDate = $("#edit-homework-date-submission").val();

        if ([content, assignmentDate, submissionDate].includes("") || subject === null) {
          $("#edit-homework-button").prop("disabled", true);
        }
        else {
          $("#edit-homework-button").prop("disabled", false);
        }
      });

      $(document).on("click", "#homework-feedback-random", () => {
        chooseRandomHomework();
      });

      // Don't close the dropdown when the user clicked inside of it
      $(".dropdown-menu").each(function () {
        $(this).on("click", ev => {
          ev.stopPropagation();
        });
      });

      // Request deleting the homework on clicking its delete icon
      $(document).on("click", ".homework-delete", function () {
        const homeworkId = $(this).data("id");
        deleteHomework(homeworkId);
      });

      // Request editing the homework on clicking its delete icon
      $(document).on("click", ".homework-edit", function () {
        const homeworkId = $(this).data("id");
        editHomework(homeworkId);
      });

      // Request checking the homework on clicking its checkbox
      $(document).on("click", ".homework-check", function () {
        const homeworkId = $(this).data("id");
        checkHomework(homeworkId);
      });

      // On changing the filter unchecked option, update the homework list & saved filters
      $("#filter-status-unchecked").on("change", () => {
        const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
        filterData.statusUnchecked = $("#filter-status-unchecked").prop("checked");
        localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
        updateFilters();
        updateHomeworkList();
      });

      // On changing the filter checked option, update the homework list & saved filters
      $("#filter-status-checked").on("change", () => {
        const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
        filterData.statusChecked = $("#filter-status-checked").prop("checked");
        localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
        updateFilters();
        updateHomeworkList();
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
        updateHomeworkList();
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
        updateHomeworkList();
      });

      // On changing any filter date option, update the homework list
      $("#filter-date-from").on("change", () => {
        const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
        filterData.dateFrom = $("#filter-date-from").val();
        localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
        updateFilters();
        updateHomeworkList();
      });

      // On changing any filter date option, update the homework list
      $("#filter-date-until").on("change", () => {
        const filterData = JSON.parse(localStorage.getItem("homeworkFilter") ?? "{}") ?? {};
        filterData.dateUntil = $("#filter-date-until").val();
        localStorage.setItem("homeworkFilter", JSON.stringify(filterData));
        updateFilters();
        updateHomeworkList();
      });

      $(document).on("click", "#show-add-homework-button", () => {
        addHomework();
      });
    });

    socket.on("updateHomeworkData", () => {
      try {
        homeworkData.reload();
        homeworkCheckedData.reload();

        updateHomeworkList();
      }
      catch (error) {
        console.error("Error handling updateHomeworkData:", error);
      }
    });

    res();
  });
}

export const reloadAllFn = async () => {
  homeworkCheckedData.reload();
  homeworkData.reload();
  joinedTeamsData.reload();
  subjectData.reload();
  teamsData.reload();
  lessonData.reload();
  await updateSubjectList();
  await updateHomeworkList();
  await updateTeamList();

  toggleShownButtons();
};

let justCheckedHomeworkId: number;
let animations: boolean;
let homeworkFeedbackLastPercentage: null | number;
