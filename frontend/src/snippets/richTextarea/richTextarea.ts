function replaceRichTextareas() {
  $(".rich-textarea:not(.rich-textarea-replaced)").each(function () {
    // Get the selection in the textarea instead of in the text nodes of the <span> elements
    function extractSelectedRange() {
      const range = document.getSelection()?.getRangeAt(0)
      if (! range) return

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
      return range
    }
    function updateInput() {
      //textarea.css("height", textarea[0].scrollHeight + "px")

      input.val(textarea.html())
      let newVal = ""

      textarea.find("span, br").each(function () {
        if ($(this).is("br")) {
          newVal += "\n"
        }
        else if (! $(this).is(".newline")) {
          let singleValue = $(this).text().replace(/([«»])/g, "\\$1")
          if ($(this).css("font-weight") == "700") {
            singleValue = `«b»${singleValue}«/b»`
          }
          if ($(this).css("text-decoration").includes("underline")) {
            singleValue = `«u»${singleValue}«/u»`
          }
          newVal += singleValue
        }
      })

      newVal = newVal.replace(/«\/b»((?:«\/?\w*»)*?)«b»/g, "$1")
      newVal = newVal.replace(/«\/u»((?:«\/?\w*»)*?)«u»/g, "$1")

      input.val(newVal)
    }
    function updateTextareaValue() {
      let val = input.val()?.toString()
      if (! val) return
      let length = val.length

      let textareaVal = ""
      let escaped = false
      let activeTags: string[] = []
      let inTag = false
      let activeTagName = ""

      for (let index = 0; index < length; index++) {
        let char = val.substring(index, index + 1)

        if (char == "\\") {
          escaped = ! escaped
          continue
        }
        if (char == "«") {
          if (escaped) escaped = false
          else {
            inTag = true
            activeTagName = ""
            continue
          }
        }
        if (char == "»") {
          if (escaped) escaped = false
          else {
            inTag = false
            if (activeTagName.startsWith("/")) {
              activeTags.splice(activeTags.indexOf(activeTagName.substring(1)), 1)
            }
            else {
              activeTags.push(activeTagName)
            }
            continue
          }
        }
        if (inTag) {
          activeTagName += char
        }
        else {
          if (char == "\n") textareaVal += `<br><span class="newline">&#8203;</span>`
          else {
            let span = $(`<span>${char}</span>`)
            if (activeTags.includes("b")) span.css("font-weight", "700")
            if (activeTags.includes("u")) span.css("text-decoration", "underline")
            textareaVal += span[0].outerHTML
          }
        }
      }
      textarea.html(textareaVal)
    }

    let input = $(this);
    let richTextarea = $($("#rich-textarea-template").html());
    let textarea = richTextarea.find(".rich-textarea-input")

    updateTextareaValue();

    textarea.on("beforeinput", (e) => {
      function insertAtRange(insertion: string, options?: { copyStyles?: boolean }) {
        if (! range) return
        let newNode = $(insertion)[0]

        if (range.startOffset != range.endOffset) {
          deleteAtRange()
        }

        if (textarea.find("span, br").length == 0) {
          textarea.append(newNode)
        }
        else if (range.startOffset == 0) {
          textarea.find("span, br").eq(0).before(newNode)
        }
        else {
          if (options?.copyStyles) {
            newNode.style.cssText = textarea.find("span, br").eq(range.startOffset - 1)[0].style.cssText
          }
          textarea.find("span, br").eq(range.startOffset - 1).after(newNode)
        }

        range.setStartAfter(newNode)
        range.setEndAfter(newNode)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
      function deleteAtRange() {
        if (! range) return
        let toRemove: JQuery<HTMLElement>;
        if (range.startOffset === range.endOffset) {
          if (range.startOffset == 0) return
          toRemove = textarea.find("span, br").eq(range.startOffset - 1)
        }
        else {
          toRemove = textarea.find("span, br").slice(range.startOffset, range.endOffset)
        }
        const additional = toRemove.filter("span.newline").prev();
        toRemove = toRemove.add(additional)
        toRemove.remove()

        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }

      let ev = e.originalEvent as InputEvent;
      if (! ev) return
      
      const range = extractSelectedRange()

      if (ev.inputType === "insertText" && ev.data) {
        e.preventDefault();
        insertAtRange(`<span>${ev.data}</span>`, { copyStyles: true })
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
    })

    richTextarea.find(".rich-textarea-bold").on("click", () => {
      const range = extractSelectedRange()
      if (! range) return

      const selected = textarea.find("span, br").slice(range.startOffset, range.endOffset)
      selected.each(function () {
        if ($(this).css("font-weight") == "700") {
          $(this).css("font-weight", "400")
        }
        else {
          $(this).css("font-weight", "700")
        }
      })

      updateInput()
    })

    richTextarea.find(".rich-textarea-underline").on("click", () => {
      const range = extractSelectedRange()
      if (! range) return

      const selected = textarea.find("span, br").slice(range.startOffset, range.endOffset)
      selected.each(function () {
        if ($(this).css("text-decoration").includes("underline")) {
          $(this).css("text-decoration", "none")
        }
        else {
          $(this).css("text-decoration", "underline")
        }
      })

      updateInput()
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

  $(".toast-container").append(`
    <div id="rich-textarea-unsupported-input-type" class="toast">
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
  `)
})
