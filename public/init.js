//
// This script will run on every single Website
//

function loadScript(src, func) {
  let script = document.createElement("script");
  script.src = src;
  script.defer = true;
  script.onload = func
  document.head.appendChild(script)
}

function loadTemplateContent() {
  $(".load-content").each(async function() {
    const url = `/templates/${$(this).data("url")}.`;
    if ($(this).data("html") != undefined) {
      $(this).load(url + "html", () => {
        if ($(this).data("js") != undefined) {
          loadScript(url + 'js');
        }
      })
    }
    else if ($(this).data("js") != undefined) {
      loadScript(url + 'js');
    }
    if ($(this).data("css") != undefined) {
      document.head.appendChild(`<link rel="stylesheet" type="text/css" href="${url}css">`);
    }
  });
}

if (localStorage.getItem("colorTheme") == "dark") {
  document.getElementsByTagName("html")[0].style.background = "#212529"
}

// Load jQuery without jQuery
let jQueryScript = document.createElement('script');
jQueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
jQueryScript.defer = true;
jQueryScript.onload = () => {
  // Load Bootstrap
  loadScript("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js")

  // Load Font Awesome icons
  loadScript("https://kit.fontawesome.com/0ca04b82ef.js")

  // Load favicon
  let favicon = document.createElement("link")
  favicon.rel = "icon"
  favicon.href = "/favicon.ico"
  favicon.type = "image/x-icon"
  document.head.appendChild(favicon);

  // Load pwa manifest
  let manifest = document.createElement("link")
  manifest.rel = "manifest"
  manifest.href = "/manifest.json"
  document.head.appendChild(manifest);

  // Load global JS
  loadScript("/global.js", () => {
    document.body.style.display = "none"  
    // Add possibility to include divs with class "load-content" to load e.g. the navbar
    loadTemplateContent();

    // Load site specific resources
    let url = $("body").data("url");

    loadScript(`/${url}/${url}.js`)

    let siteSpecificStyle = document.createElement("link")
    siteSpecificStyle.href = `/${url}/${url}.css`
    siteSpecificStyle.rel = "stylesheet"
    document.head.appendChild(siteSpecificStyle);
  })
};
document.head.appendChild(jQueryScript);
