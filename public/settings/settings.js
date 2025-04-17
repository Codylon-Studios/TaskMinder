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

async function updateTeamSelectionList() {
  await dataLoaded("joinedTeamsData");
  await dataLoaded("teamsData");
  
  $("#team-list").empty()

  teamsData.forEach((team, teamId) => {
    let selected = joinedTeamsData.includes(teamId)
    let template = `
      <div class="form-check">
        <input type="checkbox" class="form-check-input" data-id="${teamId}" id="team-selection-team-${teamId}" ${(selected) ? "checked" : ""}>
        <label class="form-check-label" for="team-selection-team-${teamId}">
          ${team.name}
        </label>
      </div>`;
    $("#team-list").append(template)
  })
}


$(async () => {
  updateAllFunctions.push(() => {
    updateTeamSelectionList();
  });

  
  await userDataLoaded()
  if (user.classJoined) {
    $(".not-joined-info").addClass("d-none")
    $("#settings-student").removeClass("d-none")
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
  $("#team-list input").each(function () {
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
        $("#team-selection-save").html(`<i class="fa-solid fa-circle-check"></i>`);
        $("#team-selection-save").prop("disabled", true);
        setTimeout(() => {
          $("#team-selection-save").html("Speichern");
          $("#team-selection-save").prop("disabled", false);
        }, 3000);
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
    $("#team-selection-save").html(`<i class="fa-solid fa-circle-check"></i>`);
    $("#team-selection-save").prop("disabled", true);
    setTimeout(() => {
      $("#team-selection-save").html("Speichern");
      $("#team-selection-save").prop("disabled", false);
    }, 3000);
  }
  
  $("#team-selection-modal").modal("hide")
  updateAll()
})