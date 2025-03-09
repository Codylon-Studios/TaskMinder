async function updateEventList() {
  await dataLoaded("eventData")
  await dataLoaded("eventTypeData")

  // Clear the list
  $("#event-list").empty();
  
  // Check if user is in edit mode
  let editEnabled = $("#edit-toggle").is(":checked");

  for (let event of eventData) {
    // Get the information for the event
    let eventId = event.eventId;
    let type = event.type;
    let name = event.name;
    let description = event.description;
    let startDate = msToDisplayDate(event.startDate).split('.').slice(0, 2).join('.');
    let lesson = event.lesson;
    let endDate;
    if (event.endDate) {
      endDate = msToDisplayDate(event.endDate).split('.').slice(0, 2).join('.');
    }
    else {
      endDate = null;
    }

    // Filter by type
    if (!$(`#filter-type-${type}`).prop("checked")) {
      continue;
    }

    // Filter by min. date
    if ($("#filter-date-from").val() != "") {
      let filterDate = Date.parse($("#filter-date-from").val());
      if (filterDate > parseInt(event.endDate || event.startDate)) {
        continue;
      }
    }

    // Filter by max. date
    if ($("#filter-date-until").val() != "") {
      let filterDate = Date.parse($("#filter-date-until").val());
      if (filterDate < parseInt(event.startDate)) {
        continue;
      }
    }

    // The template for an event with edit options
    let template = 
      `<div class="col p-2">
        <div class="card event-${type} h-100">
          <div class="card-body p-2 d-flex">
            <div class="d-flex flex-column me-3">
              <span class="fw-bold event-${type}">${name}</span>
              <b>${startDate}${(endDate) ? ` - ${endDate}` : ""}${(lesson) ? ` (${lesson}. Stunde)` : ""}</b>
              <span>${description}</span>
            </div>
            <div class="event-edit-options ${(editEnabled) ? "" : "d-none"} position-absolute end-0 top-0 m-2">
              <button class="btn btn-sm btn-tertiary event-edit" data-id="${eventId}">
                <i class="fa-solid fa-edit opacity-50"></i>
              </button>
              <button class="btn btn-sm btn-tertiary event-delete" data-id="${eventId}">
                <i class="fa-solid fa-trash opacity-50"></i>
              </button>
            </div>
          </div>
        </div>
      </div>`;

    // Add this event to the list
    $("#event-list").append(template);
  };

  // If no events match, add an explanation text
  if ($("#event-list").html() == "") {
    $("#event-list").html(`<div class="text-secondary">Keine Ereignisse mit diesen Filtern.</div>`)
  }
}
updateEventList = runOnce(updateEventList);

async function updateEventTypeList() {
  await dataLoaded("eventTypeData")

  // Clear the select element in the add event modal
  $("#add-event-type").empty();
  $("#add-event-type").append('<option value="" disabled selected>Art</option>');
  // Clear the select element in the edit event modal
  $("#edit-event-type").empty();
  $("#edit-event-type").append('<option value="" disabled selected>Art</option>');
  // Clear the list for filtering by type
  $("#filter-type-list").empty();

  eventTypeData.forEach((eventType, eventTypeId) => {
    // Get the event type data
    let eventName = eventType.name;

    // Add the template for filtering by type
    let templateFilterType =
      `<div class="form-check">
        <input type="checkbox" class="form-check-input filter-type-option" id="filter-type-${eventTypeId}" checked>
        <label class="form-check-label" for="filter-type-${eventTypeId}">
          ${eventName}
        </label>
      </div>`;
    $("#filter-type-list").append(templateFilterType)

    // Add the template for the select elements
    let templateFormSelect =
      `<option value="${eventTypeId}">${eventName}</option>`;
    $("#add-event-type").append(templateFormSelect);
    $("#edit-event-type").append(templateFormSelect);
  });

  // If any type filter gets changed, update the shown events
  $(".filter-type-option").on("change", () => {
    updateEventList();
  });
}
updateEventTypeList = runOnce(updateEventTypeList);

function addEvent() {
  //
  // CALLED WHEN THE USER CLICKS THE "ADD" BUTTON ON THE MAIN VIEW, NOT WHEN USER ACTUALLY ADDS AN EVENT
  //

  // Reset the data inputs in the add event modal
  $("#add-event-type").val("");
  $("#add-event-name").val("");
  $("#add-event-description").val("");
  $("#add-event-start-date").val("");
  $("#add-event-lesson").val("");
  $("#add-event-end-date").val("");

  // Disable the actual "add" button, because not all information is given
  $("#add-event-button").addClass("disabled");

  // Show the add event modal
  $("#add-event-modal").modal("show");

  // Called when the user clicks the "add" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#add-event-button").off("click").on("click", () => {
    // Save the given information in variables
    const type = $("#add-event-type").val();
    const name = $("#add-event-name").val().trim();
    const description = $("#add-event-description").val().trim();
    const startDate = $("#add-event-start-date").val();
    const lesson = $("#add-event-lesson").val().trim();
    const endDate = $("#add-event-end-date").val();

    // Prepare the POST request
    let data = {
      type: type,
      name: name,
      description: description,
      startDate: dateToMs(startDate),
      lesson: lesson,
      endDate: dateToMs(endDate)
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url : "/events/add_event",
      type: "POST",
      data: data,
      success: () => {
        // Show a success notification and update the shown events
        $("#add-event-success-toast").toast("show");
        eventData = undefined;
        loadEventData();
        updateEventList();
      },
      error: (xhr) => {
        if (xhr.status === 401) { // The user has to be logged in but isn't
          // Show an error notification
          $navbarToasts.notLoggedIn.toast("show");
        }
        else if (xhr.status === 500) { // An internal server error occurred
          $navbarToasts.serverError.toast("show");
        }
        else {
          $navbarToasts.unknownError.toast("show");
        }
      },
      complete: () => {
        // The server has responded
        hasResponded = true;
        // Hide the add event modal
        $("#add-event-modal").modal("hide");
      }
    });
    setTimeout(() => {
      // Wait for 1s
      if (!hasResponded) {
        // If the server hasn't answered, show the internal server error notification
        $navbarToasts.serverError.toast("show");
      }
    }, 1000);
  });
}

function editEvent(eventId) {
  //
  // CALLED WHEN THE USER CLICKS THE "EDIT" OPTION OF AN EVENT, NOT WHEN USER ACTUALLY EDITS AN EVENT
  //

  // Get the data of the event
  let data;
  for (let event of eventData) {
    if (event.eventId == eventId) {
      data = event;
      break;
    }
  }

  // Set the inputs on the already saved information
  $("#edit-event-type").val(data.type);
  $("#edit-event-name").val(data.name);
  $("#edit-event-description").val(data.description);
  $("#edit-event-start-date").val(msToInputDate(data.startDate));
  $("#edit-event-lesson").val(data.lesson);
  $("#edit-event-end-date").val(msToInputDate(data.endDate));

  // Enable the actual "edit" button, because all information is given
  $("#edit-event-button").removeClass("disabled");

  // Show the edit event modal
  $("#edit-event-modal").modal("show");

  // Called when the user clicks the "edit" button in the modal
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#edit-event-button").off("click").on("click", () => {
    // Save the given information in variables
    const type = $("#edit-event-type").val();
    const name = $("#edit-event-name").val();
    const description = $("#edit-event-description").val();
    const startDate = $("#edit-event-start-date").val();
    const lesson = $("#edit-event-lesson").val().trim();
    const endDate = $("#edit-event-end-date").val();

    let data = {
      eventId: eventId,
      type: type,
      name: name,
      description: description,
      startDate: dateToMs(startDate),
      lesson: lesson,
      endDate: dateToMs(endDate)
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url : "/events/edit_event",
      type: "POST",
      data: data,
      success: () => {
        // Show a success notification and update the shown events
        $("#edit-event-success-toast").toast("show");
        eventData = undefined;
        loadEventData();
        updateEventList();
      },
      error: (xhr) => {
        if (xhr.status === 401) { // The user has to be logged in but isn't
          // Show an error notification
          $navbarToasts.notLoggedIn.toast("show");
        }
        else if (xhr.status === 500) { // An internal server error occurred
          $navbarToasts.serverError.toast("show");
        }
        else {
          $navbarToasts.unknownError.toast("show");
        }
      },
      complete: () => {
        // The server has responded
        hasResponded = true;
        $("#edit-event-modal").modal("hide");
      }
    });
    setTimeout(() => {
      // Wait for 1s
      if (!hasResponded) {
        // If the server hasn't answered, show the internal server error notification
        $navbarToasts.serverError.toast("show");
      }
    }, 1000);
  });
}

function deleteEvent(eventId) {
  //
  // CALLED WHEN THE USER CLICKS THE "DELETE" OPTION OF AN EVENT, NOT WHEN USER ACTUALLY DELETES AN EVENT
  //

  // Show a confirmation notification
  $("#delete-event-confirm-toast").toast("show");

  // Called when the user clicks the "confirm" button in the notification
  // Note: .off("click") removes the existing click event listener from a previous call of this function
  $("#delete-event-confirm-toast-button").off("click").on("click", () => {
    // Hide the confirmation toast
    $("#delete-event-confirm-toast").toast("hide");

    let data = {
      eventId: eventId
    };
    // Save whether the server has responed
    let hasResponded = false;

    // Post the request
    $.ajax({
      url : "/events/delete_event",
      type: "POST",
      data: data,
      success: () => {
        // Show a success notification and update the shown events
        $("#delete-event-success-toast").toast("show");
        eventData = undefined;
        loadEventData();
        updateEventList();
      },
      error: (xhr) => {
        if (xhr.status === 401) { // The user has to be logged in but isn't
          // Show an error notification
          $navbarToasts.notLoggedIn.toast("show");
        }
        else if (xhr.status === 500) { // An internal server error occurred
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
  });
}

function resetFilters() {
  $("#filter-date-from").val(msToInputDate(Date.now()))
  $("#filter-date-until").val("")
}

let $ui;

$(function(){
  updateAllFunctions.push(() => {
    updateEventTypeList();
    updateEventList();
  })
  
  updateAll();

  $(window).on("userDataLoaded", () => {
    // If user is logged in, show the edit toggle button
    user.on("login", () => {
      $("#edit-toggle-label").removeClass("d-none");
    });

    user.on("logout", () => {
      $("#edit-toggle-label").addClass("d-none")
      $("#show-add-event-button").addClass("d-none");
      $(".event-edit-options").addClass("d-none");
    });
  });

  // Leave edit mode (if user entered it in a previous session)
  $("#edit-toggle").prop("checked", false);

  $("#edit-toggle").on("click", function () {
    if ($("#edit-toggle").is(":checked")) {
      // On checking the edit toggle, show the add button and edit options
      $("#show-add-event-button").removeClass("d-none");
      $(".event-edit-options").removeClass("d-none");
    }
    else {
      // On unchecking the edit toggle, hide the add button and edit options
      $("#show-add-event-button").addClass("d-none");
      $(".event-edit-options").addClass("d-none");
    }
  });

  // Leave filter mode (if user entered it in a previous session)
  $("#filter-toggle").prop("checked", false);

  $("#filter-toggle").on("click", function () {
    if ($("#filter-toggle").is(":checked")) {
      // On checking the filter toggle, show the filter options
      $("#filter-content").removeClass("d-none");
    }
    else {
      // On checking the filter toggle, hide the filter options
      $("#filter-content").addClass("d-none");
    }
  });

  resetFilters();

  // On changing any information in the add event modal, disable the add button if any information is empty
  $(".add-event-input").on("input", function () {
    const type = $("#add-event-type").val();
    const name = $("#add-event-name").val().trim();
    const startDate = $("#add-event-start-date").val();

    if ([ name, startDate ].includes("") || type == null) {
      $("#add-event-button").addClass("disabled");
    }
    else {
      $("#add-event-button").removeClass("disabled");
    }

    if ($(this).is("#add-event-end-date")) {
      $("#add-event-lesson").val("")
    }
    if ($(this).is("#add-event-lesson")) {
      $("#add-event-end-date").val("")
    }
  })

  // On changing any information in the edit event modal, disable the edit button if any information is empty
  $(".edit-event-input").on("input", () => {
    const type = $("#edit-event-type").val();
    const name = $("#edit-event-name").val().trim();
    const startDate = $("#edit-event-start-date").val();

    if ([ name, startDate ].includes("") || type == null) {
      $("#edit-event-button").addClass("disabled");
    }
    else {
      $("#edit-event-button").removeClass("disabled");
    }

    if ($(this).is("#edit-event-end-date")) {
      $("#edit-event-lesson").val("")
    }
    if ($(this).is("#edit-event-lesson")) {
      $("#edit-event-end-date").val("")
    }
  })

  // Don't close the dropdown when the user clicked inside of it
  $(".dropdown-menu").each(function () {
    $(this).on('click', (ev) => {
      ev.stopPropagation();
    });
  });

  // Request deleting the event on clicking its delete icon
  $(document).on('click', '.event-delete', function () {
    const eventId = $(this).data('id');
    deleteEvent(eventId);
  });

  // Request editing the event on clicking its delete icon
  $(document).on('click', '.event-edit', function () {
    const eventId = $(this).data('id');
    editEvent(eventId);
  });

  // On clicking the all types option, check all and update the event list
  $("#filter-type-all").on("click", () => {
    $(".filter-type-option").prop("checked", true);
    updateEventList();
  });

  // On clicking the none types option, uncheck all and update the event list
  $("#filter-type-none").on("click", () => {
    $(".filter-type-option").prop("checked", false);
    updateEventList();
  });

  // On changing any filter date option, update the event list
  $(".filter-date").on("change", () => {
    updateEventList();
  });

  $(document).on("click", "#show-add-event-button", () => {
    addEvent();
  });
});

socket.on('updateEventData', ()=>{
  try {
  eventData = undefined;
  loadEventData();
  updateEventList();
  console.log("event UI updated");
  } catch (error) {
    console.error("Error handling updateEventData:", error);
  }
});