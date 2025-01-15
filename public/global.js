//
// This script will run on every single Website
//

function loadTemplateContent() {
  $(".load-content").each(async function() {
    const url = `/templates/${$(this).data("url")}.`;
    if ($(this).data("html") != undefined) {
      $(this).load(url + "html", () => {
        if ($(this).data("js") != undefined) {
          $.getScript(url + 'js');
        }
      })
    }
    else if ($(this).data("js") != undefined) {
      $.getScript(url + 'js');
    }
    if ($(this).data("css") != undefined) {
      $head.append(`<link rel="stylesheet" type="text/css" href="${url}css">`);
    }
  });
}

// Declare socket as a global variable
let socket;
// Load jQuery without jQuery
let jQueryScript = document.createElement('script');
jQueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
jQueryScript.defer = true;
jQueryScript.onload = () => {
  let $head = $("head");
  let resources = [];
  // Load Bootstrap
  resources.push(`<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">`);
  resources.push(`<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>`);

  // Load global CSS
  resources.push(`<link href="/global.css" rel="stylesheet">`);

  // Load Font Awesome icons
  resources.push(`<script src="https://kit.fontawesome.com/0ca04b82ef.js"></script>`);

  $head.append(resources.join(""));

  // Add possibility to include divs with class "load-content" to load e.g. the navbar
  $(document).ready(() => {
    loadTemplateContent();

    // Load site specific resources
    let url = $("body").data("url");

    let siteSpecificScript = document.createElement("script");
    siteSpecificScript.src = `/${url}/${url}.js`;
    document.head.appendChild(siteSpecificScript);

    $head.append(`<link href="/${url}/${url}.css" rel="stylesheet"></link>`);
  });
};
document.head.appendChild(jQueryScript);
