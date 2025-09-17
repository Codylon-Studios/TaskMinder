function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

$(() => {
  if (isIos() && !isInStandaloneMode() && localStorage.getItem("showPwaBanner") !== "false") {
    $(".pwa-banner").addClass("d-flex").removeClass("d-none");
    $("body, .navbar").css({ marginTop: "80px" });
    $(".pwa-banner-close").on("click", () => {
      $(".pwa-banner").removeClass("d-flex").addClass("d-none");
      $("body, .navbar").css({ marginTop: "0" });
      localStorage.setItem("showPwaBanner", "false");
    });
  }
});
