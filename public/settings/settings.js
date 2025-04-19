function updateColorTheme() {
  let colorTheme
  if ($("#color-theme-dark")[0].checked) {
    colorTheme = "dark"
    localStorage.setItem("colorTheme", "dark");
  }
  else if ($("#color-theme-light")[0].checked) {
    colorTheme = "light"
    localStorage.setItem("colorTheme", "light");
  }
  else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      colorTheme = "dark"
    }
    else {
      colorTheme = "light"
    }
    localStorage.setItem("colorTheme", "auto");
  }

  if (colorTheme == "light") {
    document.getElementsByTagName("html")[0].style.background = "#ffffff";
    document.body.setAttribute("data-bs-theme", "light");
    $(`meta[name="theme-color"]`).attr("content", "#f8f9fa")
  }
  else {
    document.getElementsByTagName("html")[0].style.background = "#212529";
    document.body.setAttribute("data-bs-theme", "dark");
    $(`meta[name="theme-color"]`).attr("content", "#2b3035")
  }
}

async function updateTeamLists() {
  await dataLoaded("joinedTeamsData");
  await dataLoaded("teamsData");
  
  $("#team-selection-list").empty()
  $("#teams-list").empty()

  teamsData.forEach(team => {
    let teamId = team.teamId
    let selected = joinedTeamsData.includes(teamId)
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
          <input class="form-control form-control-sm d-inline w-fit-content me-3 team-name-input"
            type="text" value="${team.name}" placeholder="${team.name}" data-id="${teamId}">
          <span class="text-warning fw-bold mt-2 mt-md-0 d-none team-renamed" data-id="${teamId}">
            Umbenannt
            <span class="text-secondary fw-normal team-renamed-name" data-id="${teamId}">(${team.name} zu <b>NEU</b>)</span>
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
  })

  if (teamsData.length == 0) {
    $("#team-selection-list, #teams-list").append(`<span class="text-secondary no-teams">Keine Teams vorhanden</span>`)
  }

  $(".team-name-input").on("change", function () {
    $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none")

    let teamId = $(this).data("id")
    let newName = $(this).val()
    let oldName = teamsData.find(team => team.teamId == teamId).name
    if (newName != oldName) {
      if ($(`.team-deleted[data-id="${teamId}"]`).hasClass("d-none")) {
        $(`.team-renamed[data-id="${teamId}"]`).removeClass("d-none").find("*").removeClass("d-none").find("b").text(newName)
      }
    }
    else {
      $(`.team-renamed[data-id="${teamId}"]`).addClass("d-none").find("*").addClass("d-none")
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
}


$(async () => {
  updateAllFunctions.push(() => {
    updateTeamLists();
  });

  
  await userDataLoaded()
  if (user.classJoined) {
    $(".not-joined-info").addClass("d-none")
    $("#settings-student, #settings-class").removeClass("d-none")
  }
});

let animations = JSON.parse(localStorage.getItem("animations"));
if (animations == undefined) animations = true
$("#animations input").prop("checked", animations);
$("#animations input").on("click", function () {
  animations = $(this).prop("checked");
  localStorage.setItem("animations", animations)
})

let colorThemeSetting = localStorage.getItem("colorTheme") || "auto";
document.body.setAttribute("data-bs-theme", colorTheme);
$("#color-theme-auto").prop("checked", colorThemeSetting == "auto") 
$("#color-theme-dark").prop("checked", colorThemeSetting == "dark") 
$("#color-theme-light").prop("checked", colorThemeSetting == "light")

$("#color-theme input").each(() => {
  $(this).on("click", () => {
    updateColorTheme();
  });
});

window.matchMedia('(prefers-color-scheme: light)').addEventListener("change", updateColorTheme)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", updateColorTheme)

$("#team-selection-save").on("click", () => {
  let newJoinedTeamsData = []
  $("#team-selection-list input").each(function () {
    if ($(this).prop("checked")) {
      newJoinedTeamsData.push(Number($(this).data("id")))
    }
  })
  joinedTeamsData = newJoinedTeamsData;

  if (user.loggedIn) {
    let data = {
      teams: joinedTeamsData,
    };
    let hasResponded = false;

    $.ajax({
      url: "/teams/set_joined_teams_data",
      type: 'POST',
      data: JSON.stringify(data),
      contentType: 'application/json',
      success: () => {
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

$("#new-team").on("click", () => {
  $("#teams-save-confirm-container, #teams-save-confirm").addClass("d-none")

  $("#teams-list .no-teams").remove()

  let template = `
    <div class="card m-2 p-2 flex-row justify-content-between align-items-center">
      <div class="d-flex flex-column flex-md-row align-items-md-center">
        <input class="form-control form-control-sm d-inline w-fit-content me-3 team-name-input"
          type="text" value="" placeholder="Neues Team" data-id="">
        <span class="text-success fw-bold mt-2 mt-md-0" data-id="">Neu</span>
      </div
      <div>
        <button class="btn btn-sm btn-sm-square btn-danger float-end new-team-delete" data-id="">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`
  $("#teams-list").append(template)

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
  let newTeamsData = []
  $(".team-name-input").each(function () {
    if ($(this).parent().find("~ .btn-success").length > 0) return
    newTeamsData.push({
      teamId: $(this).data("id"),
      name: $(this).val()
    })
  })
  
  let data = {
    teams: newTeamsData,
  };
  let hasResponded = false;

  $.ajax({
    url: "/teams/set_teams_data",
    type: 'POST',
    data: JSON.stringify(data),
    contentType: 'application/json',
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
  let deleted = []
  $(".team-deleted:not(.d-none)").each(function () {
    deleted.push($(this).parent().find("input").attr("placeholder"))
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
