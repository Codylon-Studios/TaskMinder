import { user } from "../navbar/navbar.js";

const tutorial: {
  highlight: string | null,
  isBottom?: boolean,
  condition?: string,
  prerequisite?: string,
  continue?: string,
  text: string
}[] = [
  {
    highlight: null, isBottom: true,
    text: "Auf dieser Seite findest du alle Einstellungen für TaskMinder."
  },
  {
    highlight: "#nav-settings-app", isBottom: true, prerequisite: "click:#nav-tab-app",
    text: `Diese Einstellungen beziehen sich auf das Aussehen der App. Sie gelten nur für dieses Gerät.`
  },
  {
    highlight: "#nav-tab-account", isBottom: true, condition: "account", continue: "click",
    text: "Wenn du hier klickst, kannst du die Einstellungen für deinen Account sehen."
  },
  {
    highlight: "#nav-settings-account", condition: "account",
    text: "Du kannst dich hier abmelden, dein Passwort und deinen Namen ändern oder deinen Account löschen."
  },
  {
    highlight: "#nav-tab-account", isBottom: true, condition: "!account",
    text: "Wenn du angemeldet wärst, gäbe es hier Einstellungen für deinen Account."
  },
  {
    highlight: null, isBottom: true,
    text: "JETZT NACH ACCOUNT"
  },
]

if (localStorage.getItem("tutorial") == "true") {
  function updateBoxShadowSize(): void {
    $("body").css("--tutorial-box-shadow-size", Math.sqrt(($(document).height() ?? 0) ** 2 + ($(document).width() ?? 0) ** 2) +  "px")
  }
  updateBoxShadowSize()
  $(window).on("resize scroll", () => {updateBoxShadowSize(); updateOverlay($(".tutorial-highlight"))})

  function updateOverlay($el: JQuery<HTMLElement>) {
    const offset = $el.is("#tutorial-disable-all") ? 0 : 8
    $("#tutorial-overlay").css({
      top: $el.position().top - offset,
      left: $el.position().left - offset,
      height: ($el.outerHeight() ?? 0) + 2 * offset,
      width: ($el.outerWidth() ?? 0) + 2 * offset
    })
  }

  function matchesSequenceCondition(): boolean {
    console.log(sequenceId)
    const condition = tutorial[sequenceId].condition
    if (! condition) return true
    for (const c of condition.split(" ")) {
      if (c === "account" && ! user.loggedIn) return false
      if (c === "!account" && user.loggedIn) return false
      if (c === "class" && ! user.classJoined) return false
      if (c === "!class" && user.classJoined) return false

      if (/^minlevel:\d$/.test(c)) {
        const minlevel = c.split(":")[1]
        if ((user.permissionLevel ?? 0) < parseInt(minlevel)) return false
      }
    }
    return true
  }

  async function awaitContinue($el: JQuery<HTMLElement>) {
    const seq = tutorial[sequenceId]
    if (seq.continue) {
      $("#tutorial-box-continue").addClass("disabled")
      await new Promise<void>((res) => {
        if (seq.continue == "click") {
          $("#tutorial-box-continue-hint").text("Klicke auf das hervorgehobene Element")
          const _ = () => {
            res();
            $el.off("click", _)
            $("#tutorial-box-continue-hint").text("")
          }
          $el.on("click", _)
        }
      })
      $("#tutorial-box-continue").removeClass("disabled").trigger("click")
    }
    else {
      $("#tutorial-box-continue").removeClass("disabled")
      $("#tutorial-box-continue-hint").text("")
    }
  }

  function showTutorialSequence(): void {
    $("#tutorial-box-back").toggle(sequenceId > 0);
    $("#tutorial-box-continue").toggle(sequenceId < tutorial.length - 1);

    $(".tutorial-highlight").find("*").addBack().attr("tabindex", "-1").removeClass("tutorial-highlight")

    const seq = tutorial[sequenceId]
    if (seq.prerequisite) {
      if (/^click:.*/.test(seq.prerequisite)) {
        $(seq.prerequisite.replace(/^click:/, "")).trigger("click")
      }
    }
    const $highlight = $(seq.highlight ?? "#tutorial-disable-all")
    $highlight.addClass("tutorial-highlight").find("*").addBack().removeAttr("tabindex")
    updateOverlay($highlight)
    updateBoxShadowSize()

    $("#tutorial-box-description").text(seq.text)
    $("#tutorial-box-wrapper").removeClass("top-0 bottom-0").addClass(seq.isBottom ? "bottom-0" : "top-0")

    awaitContinue($highlight)
  }

  let sequenceId = 0
  showTutorialSequence()

  $("body").addClass("tutorial");
  $("body *:not()").each(function () {
    if ($(this).closest("#tutorial-box-wrapper").length == 0) {
      $(this).attr("tabindex", "-1")
    }
  })

  $("#tutorial-box-back").on("click", function () {
    do {
      sequenceId--
    }
    while (!matchesSequenceCondition())

    $(this).toggle(sequenceId > 0);
    showTutorialSequence()
  }).hide()

  $("#tutorial-box-continue").on("click", function () {
    do {
      sequenceId++
    }
    while (!matchesSequenceCondition())
    
    $(this).toggle(sequenceId < tutorial.length - 1);
    showTutorialSequence()
  })
}
else {
  $("#tutorial-box-wrapper").removeClass("d-flex").hide()
}
