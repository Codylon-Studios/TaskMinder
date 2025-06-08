export function richTextToHtml(val: string, targetElement?: JQuery<HTMLElement>, options?: {
  showMoreButton?: boolean | JQuery<HTMLElement>,
  parseLinks?: boolean,
  displayBlockIfNewline?: boolean
}) {
  function handleOptions() {
    if (targetElement) {
      if (options?.showMoreButton) insertShowMoreButton(targetElement)
      if (options?.displayBlockIfNewline && parsedText.html().includes("<br>")) targetElement.css({ display: "block" })
    }
    if (options?.parseLinks) {
      parsedText.find("span[data-link-url]").each(function () {
        const url = $(this).attr("data-link-url")?.replaceAll("\\\\", "\\").replaceAll("\\«", "<").replaceAll("\\»", ">").replaceAll("\\;", ";")
        if (url && url != "") {
          let neighbourLinkElements = $(this)
            .add($(this).prevUntil(`:not([data-link-url="${$(this).attr("data-link-url")?.replaceAll("\\", "\\\\")}"])`))
            .add($(this).nextUntil(`:not([data-link-url="${$(this).attr("data-link-url")?.replaceAll("\\", "\\\\")}"])`))

          $(this).css("cursor", "pointer").on("click", (ev) => {
            $("#rich-textarea-unsafe-link").toast("show").find("b").text(url)
            $("#rich-textarea-unsafe-link-confirm").off("click").on("click", () => {
              window.open(url, '_blank', 'noopener,noreferrer');
            })
          }).on("mouseenter", function () {
            neighbourLinkElements.addClass("rich-textarea-link-enabled")
          }).on("mouseleave", function () {
            neighbourLinkElements.removeClass("rich-textarea-link-enabled")
          })
        }
      })
    }
    targetElement?.empty().append(parsedText.children())
  }
  function insertShowMoreButton(targetElement: JQuery<HTMLElement>) {
    let showMoreButton = $(`<a href="#">Mehr anzeigen</a>`);
    if (options?.showMoreButton && typeof options?.showMoreButton != "boolean") showMoreButton = options?.showMoreButton
    
    targetElement.on("addedToDom", () => {
      if ((targetElement.height() ?? 0) >= 120) {
        targetElement.css({ maxHeight: "96px", overflow: "hidden", display: "block" }).after(showMoreButton.on("click", function (ev) {
          ev.preventDefault()
          if ($(this).text() == "Mehr anzeigen") {
            $(this).text("Weniger anzeigen");
            targetElement.css({ maxHeight: "none" });
          }
          else {
            $(this).text("Mehr anzeigen");
            targetElement.css({ maxHeight: "96px" })
          }
        }))
      }
    })
  }
  function parseNormalChar(char: string) {
    let span = $(`<span>${char}</span>`)
    if (activeTags.some(tag => tag.tagName == "b")) span.css("font-weight", "700")
    if (activeTags.some(tag => tag.tagName == "u")) span.css("text-decoration", "underline")
    if (activeTags.some(tag => tag.tagName == "i")) span.css("font-style", "italic")
    let fsMatch = activeTags.find(tag => tag.tagName == "fs")
    if (fsMatch) {
      span.attr("data-font-size", fsMatch.args[0])
      span.css("font-size", fsMatch.args[0] + "px")
    }
    if (activeTags.some(tag => tag.tagName == "sub")) {
      span.css("font-size", parseInt(fsMatch?.args[0] ?? "16") * 0.83)
      span.addClass("sub")
    }
    if (activeTags.some(tag => tag.tagName == "sup")) {
      span.css("font-size", parseInt(fsMatch?.args[0] ?? "16") * 0.83)
      span.addClass("sup")
    }
    const cMatch = activeTags.find(tag => tag.tagName == "c")
    if (cMatch) {
      span.attr("data-color", cMatch.args[0])
      span.css("color", cMatch.args[0])
    }
    const aMatch = activeTags.find(tag => tag.tagName == "a")
    if (aMatch) {
      span.attr("data-link-url", aMatch.args[0].replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll("<", "\\«").replaceAll(">", "\\»"))
    }
    parsedText.append(span[0].outerHTML)
  }

  if (! val) return ""
  let length = val.length

  let parsedText = $("<div></div>")
  let escaped = false
  let activeTags: { tagName: string, args: string[]}[] = []
  let inTag = false
  let activeTagName = ""
  let activeTagArgs: string[] = []
  let activeArgsId = -1

  for (let index = 0; index < length; index++) {
    function parseChar() {
      if (char == "\\") {
        escaped = !escaped
        return escaped
      }
      if (char == "«" && escaped ) {
        char = "<"
        escaped = false
        return false
      }
      if (char == "»" && escaped) {
        char = ">"
        escaped = false
        return false
      }
      if (char == ";" && ! escaped && inTag) {
        activeArgsId++
        activeTagArgs[activeArgsId] = ""
        return true
      }
      if (escaped) escaped = false
      if (char == "<") {
          inTag = true
          activeTagName = ""
          activeTagArgs = []
          activeArgsId = -1
          return true
      }
      if (char == ">") {
        inTag = false
        if (activeTagName.startsWith("/")) {
          activeTags = activeTags.filter(t => t.tagName != activeTagName.substring(1))
        }
        else {
          activeTags.push({ tagName: activeTagName, args: activeTagArgs })
        }
        return true
      }
      return false
    }
    let char = val.substring(index, index + 1)

    if (parseChar()) continue
    if (inTag) {
      if (activeArgsId == -1) {
        activeTagName += char
      }
      else {
        activeTagArgs[activeArgsId] += char
      }
    }
    else if (char == "\n") {
      parsedText.append(`<br><span class="newline">&#8203;</span>`)
    }
    else {
      parseNormalChar(char)
    }
  }

  handleOptions()
  
  return parsedText.html()
}

function replaceRichTextareas() {
  $(".rich-textarea:not(.rich-textarea-replaced)").each(function () {
    // Get the selection in the textarea instead of in the text nodes of the <span> elements
    function extractSelectedRanges(): Range[] {
      const selection = document.getSelection()
      if (! selection) return []

      let ranges: Range[] = []
      for (let rangeId = 0; rangeId < selection.rangeCount; rangeId++) {
        const range = selection.getRangeAt(rangeId).cloneRange()

        if (textarea[0].contains(range.startContainer) && textarea[0].contains(range.endContainer)) {
          if (range.startContainer.nodeType == range.startContainer.TEXT_NODE) {
            const startSpan = range.startContainer.parentNode
            const startOffset = Array.prototype.indexOf.call(startSpan?.parentNode?.children, startSpan) + range.startOffset;
            range.setStart(textarea[0], startOffset)
          }
          if (range.endContainer.nodeType == range.endContainer.TEXT_NODE) {
            const endSpan = range.endContainer.parentNode
            const endOffset = Array.prototype.indexOf.call(endSpan?.parentNode?.children, endSpan) + range.endOffset;
            range.setEnd(textarea[0], endOffset)
          }
        }
        
        ranges.push(range)
      }
      
      return ranges
    }
    function updateInput() {
      textarea.css("height", "auto")
      textarea.css("height", textarea[0].scrollHeight + 2 + "px")

      let newVal = ""

      textarea.find("span, br").each(function () {
        if ($(this).is("br")) {
          newVal += "\n"
          return
        }
        if ($(this).is(".newline")) {
          return
        }
        let singleValue = $(this).text().replaceAll("\\", "\\\\").replaceAll("<", "\\«").replaceAll(">", "\\»")
        if ($(this).css("font-weight") == "700") {
          singleValue = `<b>${singleValue}</b>`
        }
        if ($(this).css("text-decoration").includes("underline")) {
          singleValue = `<u>${singleValue}</u>`
        }
        if ($(this).css("font-style").includes("italic")) {
          singleValue = `<i>${singleValue}</i>`
        }
        const fontSize = parseInt($(this).attr("data-font-size") ?? "16")
        if (fontSize != 16) {
          singleValue = `<fs;${fontSize}>${singleValue}</fs;${fontSize}>`
        }
        if ($(this).hasClass("sub")) {
          singleValue = `<sub>${singleValue}</sub>`
        }
        if ($(this).hasClass("sup")) {
          singleValue = `<sup>${singleValue}</sup>`
        }
        const color = $(this).attr("data-color") ?? ""
        if (color != "") {
          singleValue = `<c;${color}>${singleValue}</c;${color}>`
        }
        const linkUrl = $(this).attr("data-link-url") ?? ""
        if (linkUrl != "") {
          singleValue = `<a;${linkUrl}>${singleValue}</a;${linkUrl}>`
        }
        newVal += singleValue
      })

      let previousVal = "";
      do {
        previousVal = newVal;
        newVal = newVal.replace(/<\/(.+)>((?:<[^<>]*?>)*?)<\1>/g, "$2");
      } while (newVal !== previousVal);

      input.val(newVal)
    }
    function forEachSelectedSpan(func: (span: JQuery<HTMLElement>) => void) {
      const ranges = extractSelectedRanges()
      window.getSelection()?.removeAllRanges()
      for (const range of ranges) {
        if (textarea[0].contains(range.startContainer) && textarea[0].contains(range.endContainer)) {
          const selectedSpans = textarea.find("span, br").slice(range.startOffset, range.endOffset)
          selectedSpans.each(function () {
            func($(this))
          })
    
          updateInput()
        }
        window.getSelection()?.addRange(range)
      }
    }

    let input = $(this);
    let richTextarea = $($("#rich-textarea-template").html());
    let textarea = richTextarea.find(".rich-textarea-input");

    textarea.html(richTextToHtml(input.val()?.toString() ?? ""));
    textarea.toggleClass("rich-textarea-empty", textarea.html() == "")
    textarea.css("height", "auto")
    textarea.css("height", textarea[0].scrollHeight + 2 + "px")

    let currentStyles = {
      bold: false,
      underline: false,
      italic: false,
      fontSize: { enabled: false, value: 16 },
      sub: false,
      sup: false,
      color: { enabled: false, value: "Automatisch" }
    }

    richTextarea.find(".rich-textarea-color svg").hide()
    richTextarea.find(".rich-textarea-color-enabled").hide()
    richTextarea.find(".rich-textarea-color-picker").val("Automatisch")

    richTextarea.find(".rich-textarea-toolbar").hide()
    richTextarea.find(".rich-textarea-input-toggle").on("click", function () {
      richTextarea.find(".rich-textarea-toolbar").toggle()
    })

    input.on("input change", () => {
      textarea.html(richTextToHtml(input.val()?.toString() ?? ""));
      textarea.toggleClass("rich-textarea-empty", textarea.html() == "")
      textarea.css("height", "auto")
      textarea.css("height", Math.max(textarea[0].scrollHeight, 36) + 2 + "px")
    })

    function findReplacement(direction: "old" | "new", val: string) {
      if (direction == "old") {
        return replacements.find(r => r.old == val)
      }
      else {
        return replacements.find(r => r.new == val)
      }
    }
    const maxReplacementLength = 4
    const replacements = [
      { old: "-->", new: "⭢" },
      { old: "<--", new: "⭠" },
      { old: "<->", new: "⭤" },
      { old: "...", new: "…"}
    ]

    textarea.on("beforeinput", (e) => {
      function copyStyles(node: JQuery<HTMLElement>) {
        for (let styleToggle of styleToggles) {
          if (currentStyles[styleToggle.styleName]) {
            node.css(styleToggle.cssPropName, styleToggle.cssPropNewVal)
          }
        }
        if (currentStyles.fontSize.enabled) {
          node.attr("data-font-size", currentStyles.fontSize.value)
          node.css("font-size", currentStyles.fontSize.value)
        }
        if (currentStyles.sub) {
          node.addClass("sub")
          node.css("font-size", (parseInt(node.attr("data-font-size") ?? "16")) * 0.83 + "px")
        }
        if (currentStyles.sup) {
          node.addClass("sup")
          node.css("font-size", (parseInt(node.attr("data-font-size") ?? "16")) * 0.83 + "px")
        }
        if (currentStyles.color.enabled && currentStyles.color.value != "Automatisch") {
          node.attr("data-color", currentStyles.color.value)
          node.css("color", currentStyles.color.value)
        }
      }
      function insertAtRange(insertion: string, options?: { copyStyles?: boolean, replace?: boolean }) {

        deleteSelectedRanges()

        const range = ranges[0];
        if (! range) return
        let newNode = $(insertion)
        if (options?.copyStyles) {
          copyStyles(newNode)
        }

        if (textarea.find("span, br").length == 0) {
          textarea.append(newNode)
        }
        else if (range.startOffset == 0) {
          textarea.prepend(newNode)
        }
        else {
          const previous = textarea.find("span, br").eq(range.startOffset - 1)
          previous.after(newNode)
          
          if (options?.replace) {
            let oldVal = newNode.text()
            for (let length = 1; length <= maxReplacementLength; length++) {
              let match = findReplacement("old", oldVal)
              if (match) {
                newNode.prevAll().slice(0, length - 1).remove()
                newNode.text(match.new)
                break
              }
              oldVal = newNode.prevAll().eq(length - 1).text() + oldVal
            }
          }
        }

        range.setStartAfter(newNode[0])
        range.setEndAfter(newNode[0])
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
      function deleteSelectedRanges() {
        for (const range of ranges) {
          let toRemove: JQuery<HTMLElement>;
          if (range.startOffset != range.endOffset) {
            toRemove = textarea.find("span, br").slice(range.startOffset, range.endOffset)
          }
          else {
            continue
          }
          const additional = toRemove.filter("span.newline").prev();
          toRemove = toRemove.add(additional)
          toRemove.remove()

          window.getSelection()?.removeAllRanges()
          window.getSelection()?.addRange(range)
        }
        
      }
      function deleteAtRange() {
        const firstRange = ranges[0].cloneRange()
        const firstRangeCollapsed = firstRange.collapsed

        deleteSelectedRanges()
        
        if (firstRangeCollapsed && firstRange.startOffset != 0) {
          let target: JQuery<HTMLElement>;
          target = textarea.find("span, br").eq(firstRange.startOffset - 1)
          let match = findReplacement("new", target.text())
          if (match) {
            for (let char of match.old.split("")) {
              insertAtRange(`<span>${char}</span>`, { copyStyles: true })
            }
            target.remove()
          }
          else {
            const additional = target.filter("span.newline").prev();
            target = target.add(additional)
            target.remove()
          }
        }

        window.getSelection()?.removeAllRanges()
        for (const range of ranges) {
          window.getSelection()?.addRange(range)
        }
      }

      let ev = e.originalEvent as InputEvent;
      if (! ev) return
      
      const ranges = extractSelectedRanges()

      if (ev.inputType === "insertText" && ev.data) {
        e.preventDefault();
        insertAtRange(`<span>${ev.data}</span>`, { copyStyles: true, replace: true })
      }
      else if (["insertParagraph", "insertLineBreak"].includes(ev.inputType)) {
        e.preventDefault();
        insertAtRange(`<br>`)
        insertAtRange(`<span class="newline">&#8203;</span>`) // You need this zero-width-character to select an empty line
      }
      else if (ev.inputType === "deleteContentBackward") {
        e.preventDefault();
        deleteAtRange()
      }
      else {
        e.preventDefault()
        $("#rich-textarea-unsupported-input-type").toast("show").find("i").eq(1).text(ev.inputType)
      }

      updateInput()

      textarea.toggleClass("rich-textarea-empty", textarea.html() == "")
    })

    let styleToggles : {
      styleName: "bold" | "underline" | "italic", btnName: string, cssPropName: string, cssPropBaseVal: string, cssPropNewVal: string
    }[] = [
      { styleName: "bold", btnName: ".rich-textarea-bold", cssPropName: "font-weight", cssPropBaseVal: "400", cssPropNewVal: "700" },
      { styleName: "underline", btnName: ".rich-textarea-underline", cssPropName: "text-decoration", cssPropBaseVal: "none", cssPropNewVal: "underline" },
      { styleName: "italic", btnName: ".rich-textarea-italic", cssPropName: "font-style", cssPropBaseVal: "normal", cssPropNewVal: "italic" },
    ]

    for (let styleToggle of styleToggles) {
      richTextarea.find(styleToggle.btnName).on("click", function () {
        currentStyles[styleToggle.styleName] = ! currentStyles[styleToggle.styleName]
        $(this).toggleClass("enabled")

        forEachSelectedSpan(span => {
          if (span.css(styleToggle.cssPropName).includes(styleToggle.cssPropNewVal)) {
            span.css(styleToggle.cssPropName, styleToggle.cssPropBaseVal)
          }
          else {
            span.css(styleToggle.cssPropName, styleToggle.cssPropNewVal)
          }
        })
      })
    }

    richTextarea.find(".rich-textarea-font-size-dropdown input").on("input", function () {
      richTextarea.find(".rich-textarea-font-size span").text(`(${$(this).val()})`)
      currentStyles.fontSize.value = parseInt($(this).val()?.toString() ?? "16")
    })

    richTextarea.find(".rich-textarea-font-size").on("click", function () {
      const newFontSize = parseInt(richTextarea.find(".rich-textarea-font-size-dropdown input").val()?.toString() ?? "16")
      if (! newFontSize) return
      currentStyles.fontSize.enabled = ! currentStyles.fontSize.enabled
      currentStyles.fontSize.value = newFontSize
      $(this).toggleClass("enabled")
      forEachSelectedSpan(span => {
        if (parseInt(span.attr("data-font-size") ?? "16") == newFontSize) {
          span.attr("data-font-size", 16)
          if (span.hasClass("sub") || span.hasClass("sup")) {
            span.css("font-size", 16 * 0.83)
          }
          else {
            span.css("font-size", 16)
          }
        }
        else {
          span.attr("data-font-size", newFontSize)
          if (span.hasClass("sub") || span.hasClass("sup")) {
            span.css("font-size", newFontSize * 0.83)
          }
          else {
            span.css("font-size", newFontSize)
          }
        }
      })
    })

    richTextarea.find(".rich-textarea-sub").on("click", function () {
      currentStyles.sub = ! currentStyles.sub
      currentStyles.sup = false
      $(this).toggleClass("enabled")
      richTextarea.find(".rich-textarea-sup").removeClass("enabled")

      forEachSelectedSpan(span => {
        if (span.hasClass("sub")) {
          span.removeClass("sub")
          span.css("font-size", (span.attr("data-font-size") ?? 16) + "px")
        }
        else {
          span.addClass("sub")
          span.removeClass("sup")
          span.css("font-size", (parseInt(span.attr("data-font-size") ?? "16")) * 0.83 + "px")
        }
      })
    })

    richTextarea.find(".rich-textarea-sup").on("click", function () {
      currentStyles.sup = ! currentStyles.sup
      currentStyles.sub = false
      $(this).toggleClass("enabled")
      richTextarea.find(".rich-textarea-sub").removeClass("enabled")

      forEachSelectedSpan(span => {
          if (span.hasClass("sup")) {
          span.removeClass("sup")
          span.css("font-size", (span.attr("data-font-size") ?? 16) + "px")
        }
        else {
          span.addClass("sup")
          span.removeClass("sub")
          span.css("font-size", (parseInt(span.attr("data-font-size") ?? "16")) * 0.83 + "px")
        }
      })
    })

    richTextarea.find(".rich-textarea-color-picker-toggle").on("click", (ev) => {
      ev.stopPropagation()
      richTextarea.find(".rich-textarea-color-picker ~ .color-picker-trigger").trigger("click")
    })

    richTextarea.find(".rich-textarea-color-picker").on("change", function () {
      const color = $(this).val()?.toString() ?? "#3bb9ca"
      currentStyles.color.value = color
      if (color == "Automatisch") {
        richTextarea.find(".rich-textarea-color svg").hide().find("~ span").show()
        richTextarea.find(".rich-textarea-color-enabled").hide()
      }
      else {
        richTextarea.find(".rich-textarea-color svg").css("fill", color).show().find("~ span").hide()
        richTextarea.find(".rich-textarea-color-enabled").toggle(currentStyles.color.enabled)
      }
    })

    richTextarea.find(".rich-textarea-color").on("click", function () {
      const newColor = richTextarea.find(".rich-textarea-color-picker").val()?.toString() ?? "#3bb9ca"
      currentStyles.color.enabled = ! currentStyles.color.enabled
      currentStyles.color.value = newColor
      $(this).toggleClass("enabled")
      if (newColor != "Automatisch") {
        $(this).find(".rich-textarea-color-enabled").toggle()
      }
      forEachSelectedSpan(span => {
        if (span.attr("data-color") == newColor || newColor == "Automatisch") {
          span.css("color", "")
          span.attr("data-color", "")
        }
        else {
          span.css("color", newColor)
          span.attr("data-color", newColor)
        }
      })
    })

    richTextarea.find(".rich-textarea-link").on("click", () => {
      let newUrl = richTextarea.find(".rich-textarea-link-dropdown input").val()?.toString() ?? ""
      newUrl = newUrl.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll("<", "\\«").replaceAll(">", "\\»")
      forEachSelectedSpan(span => {
        if (span.attr("data-link-url") == newUrl || newUrl == "") {
          span.css("link-url", "")
          span.attr("data-link-url")
        }
        else {
          span.css("link-url", newUrl)
          span.css("font-weight", "700")
          span.css("text-decoration", "underline")
          span.css("color", "#3bb9ca")
          span.attr("data-color", "#3bb9ca")
          span.attr("data-link-url", newUrl)
        }
      })
    })

    richTextarea.find(".rich-textarea-clear").on("click", () => {
      forEachSelectedSpan(span => {
        span.removeAttr("style").removeAttr("data-font-size").removeAttr("data-color").removeAttr("data-link-url")
        span.removeClass("sub").removeClass("sup")
      })
    })

    richTextarea.find(".rich-textarea-link-dropdown span").hide()

    $(document).on("selectionchange", () => {
      let selectedSpans: JQuery<HTMLElement> = $();

      const ranges = extractSelectedRanges()
      for (const range of ranges) {
        if (textarea[0].contains(range.startContainer) && textarea[0].contains(range.endContainer)) {
          if (range.collapsed && range.startOffset != 0) {
            selectedSpans = textarea.find("span, br").eq(range.startOffset - 1)
          }
          else {
            selectedSpans = textarea.find("span, br").slice(range.startOffset, range.endOffset)
          }
        }
      }

      textarea.find("span").removeClass("rich-textarea-link-enabled")
      richTextarea.find(".rich-textarea-link").removeClass("enabled")
      richTextarea.find(".rich-textarea-link-dropdown span").hide()
      if (ranges.length == 1) {
        let commonLinkUrl: string | undefined | null;
        selectedSpans.each(function () {
          if (commonLinkUrl === undefined) {
            commonLinkUrl = $(this).attr("data-link-url")?.replaceAll("\\", "\\\\")
          }
          else if (commonLinkUrl != $(this).attr("data-link-url")?.replaceAll("\\", "\\\\")) {
            commonLinkUrl = null;
          }
        })
        if (typeof commonLinkUrl == "string" && commonLinkUrl != "") {
          selectedSpans
            .add(selectedSpans.prevUntil(`:not([data-link-url="${commonLinkUrl}"])`))
            .add(selectedSpans.nextUntil(`:not([data-link-url="${commonLinkUrl}"])`))
            .addClass("rich-textarea-link-enabled")
          richTextarea.find(".rich-textarea-link").addClass("enabled")
          const displayedUrl = commonLinkUrl.replaceAll("\\\\", "\\").replaceAll("\\«", "<").replaceAll("\\»", ">").replaceAll("\\;", ";")
          richTextarea.find(".rich-textarea-link-dropdown span").show().find("b").text(displayedUrl)
        }
      }
    })

    input.after(richTextarea).addClass("rich-textarea-replaced");
  });
}

$(() => {
  new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      $(mutation.addedNodes).each(function () {
        if ($(this).find(".rich-textarea")) {
          replaceRichTextareas();
        }
      });
    });
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  replaceRichTextareas();

  $(".toast-container").append(
    `<div id="rich-textarea-unsupported-input-type" class="toast">
      <div class="toast-header bg-warning text-white">
        <b class="me-auto">InputType nicht verfügbar</b>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">
        Leider ist der <i>inputType</i> "<i></i>" nicht implementiert.
        <br>
        Du kannst aber normal Text eintippen, Zeilenumbrüche eingeben und mit der Backspace Taste Text entfernen.
        <br>
        Bitte kontaktiere uns per Email oder erstelle einen Github Issue, wenn dir eine Implementation wichtig wäre.
      </div>
    </div>
  `,`
    <div id="rich-textarea-unsafe-link" class="toast">
      <div class="toast-header bg-warning text-white">
        <span class="me-auto fw-bold">Fremder Link: <b></b></span>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">
        Achtung, dieser Link führt auf eine andere Website (<b></b>). Klicke nur auf öffnen, wenn du diese Website kennst.
        <div class="mt-2 pt-2 border-top">
          <div class="row g-2 justify-content-end">
            <div class="col-auto">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="toast">Abbrechen</button>
            </div>
            <div class="col-auto">
              <button type="button" class="btn btn-warning btn-sm" data-bs-dismiss="toast" id="rich-textarea-unsafe-link-confirm">Öffnen</button>
            </div>
          </div>
        </div>
      </div>
    </div>`)
})
