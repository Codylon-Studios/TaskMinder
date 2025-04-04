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

$("#join-class-back-btn").on("click", () => {
  $("#decide-action-panel").removeClass("d-none")
  $("#join-class-panel").addClass("d-none")
  $("#error-invalid-classcode").addClass("d-none")
})

document.getElementById("join-class-btn").addEventListener("click", async () => {
  const classcode = document.getElementById("join-class-classcode").value;

  try {
    const response = await fetch("/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classcode })
    });

    const data = await response.json();
    if (data.success) {
      $("#join-class-panel").addClass("d-none")
      $("#decide-account-panel").removeClass("d-none")
    } else {
      document.getElementById("error-invalid-classcode").classList.remove("d-none");
    }
  } catch (error) {
    console.error("Error joining class:", error);
  }
});

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