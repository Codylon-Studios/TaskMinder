function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return globalThis.matchMedia("(display-mode: standalone)").matches;
}

if (isIos() && !isInStandaloneMode() && localStorage.getItem("showPwaBanner") !== "false") {
  $(".pwa-banner").addClass("d-flex").removeClass("d-none");
  $("body").css("--pwa-banner-height", "80px");
  $(".pwa-banner-close").on("click", () => {
    $(".pwa-banner").removeClass("d-flex").addClass("d-none");
    localStorage.setItem("showPwaBanner", "false");
    $("body").css("--pwa-banner-height", "0px");
  });
}
else {
  $("body").css("--pwa-banner-height", "0px");
}
