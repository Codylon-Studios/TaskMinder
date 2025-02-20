//
// This script will run on every single Website
//

function loadScript(src) {
  let script = document.createElement("script");
  script.src = src;
  script.defer = true;
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
        $head.append(`<link rel="stylesheet" type="text/css" href="${url}css">`);
      }
    });
  }
  
  
  // Load jQuery without jQuery
  let jQueryScript = document.createElement('script');
  jQueryScript.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
  jQueryScript.defer = true;
  jQueryScript.onload = () => {
    let $head = $("head");
    let resources = [];
    // Load Bootstrap
    resources.push(`<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>`);
  
    // Load Font Awesome icons
    resources.push(`<script src="https://kit.fontawesome.com/0ca04b82ef.js"></script>`);

    // Load favicon
    resources.push(`<link rel="icon" href="/favicon.ico" type="image/x-icon">`)
  
    $head.append(resources.join(""));
  
    // Load global JS
    loadScript("/global.js")
  
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
