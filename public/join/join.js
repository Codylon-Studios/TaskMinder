$(window).on("userDataLoaded", () => {
  user.on("login", () => {
    user.joinedClass = true
    if (user.joinedClass) {
      $(location).attr("href", "/");
    }
  });
});

$("#show-join-class-btn").on("click", () => {
  $("#decide-action-panel").addClass("d-none")
  $("#join-class-panel").removeClass("d-none")
})

$("#join-class-btn").on("click", () => {
  if ($("#join-class-classcode").val() == "123") {
    $("#join-class-panel").addClass("d-none")
    $("#decide-account-panel").removeClass("d-none")
  }
  else {
    $("#error-invalid-classcode").removeClass("d-none")
  }
})

$("#join-class-classcode").on("input", () => {
  $("#error-invalid-classcode").addClass("d-none")
})

let urlParams = new URLSearchParams(window.location.search)

if (urlParams.has("action")) {
  if (urlParams.get("action") == "join") {
    $("#decide-action-panel").addClass("d-none")
    $("#join-class-panel").removeClass("d-none")
  }
}

if (urlParams.has("classcode")) {
  $("#join-class-classcode").val(urlParams.get("classcode"))
  $("#join-class-btn").trigger("click");
}
else {
  $("#join-class-classcode").val("")
}
