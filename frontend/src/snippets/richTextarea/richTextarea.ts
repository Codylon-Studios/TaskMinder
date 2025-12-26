import { deepCompare, escapeHTML } from "../../global/global.js";
import { rgbToHex } from "../colorPicker/colorPicker.js";

export function richTextToHtml(
  val: string | null,
  targetElement?: JQuery<HTMLElement>,
  options?: {
    showMoreButton?: boolean | JQuery<HTMLElement>;
    showMoreButtonChange?: ((btn: JQuery<HTMLElement>) => void);
    parseLinks?: boolean;
    displayBlockIfNewline?: boolean;
    merge?: boolean;
  }
): string {
  // Addressing double escaping/unescaping and DOM text reinterpreted as HTML
  function sanitizeHtml(html: string): string {
    const tempDiv = document.createElement("div");
    tempDiv.textContent = html;
    return tempDiv.innerHTML;
  }

  function handleOptions(): void {
    if (targetElement) {
      if (options?.showMoreButton) insertShowMoreButton(targetElement);
      if (options?.displayBlockIfNewline && parsedText.html().includes("<br>")) {
        targetElement.addClass("d-block");
      }
    }
    if (options?.parseLinks) {
      parsedText.find("span[data-link-url]").each(function () {
        const url = $(this)
          .attr("data-link-url")
          ?.replaceAll(String.raw`\«`, "<")
          .replaceAll(String.raw`\»`, ">")
          .replaceAll(String.raw`\;`, ";")
          .replaceAll(String.raw`\\`, "\\");
        if (url && url !== "") {
          const sanitizedUrl = sanitizeHtml(url);
          const neighbourLinkElements = $(this)
            .add(
              $(this).prevUntil(`:not([data-link-url="${$(this).attr("data-link-url")?.replaceAll("\\", "\\\\")}"])`)
            )
            .add(
              $(this).nextUntil(`:not([data-link-url="${$(this).attr("data-link-url")?.replaceAll("\\", "\\\\")}"])`)
            );

          $(this)
            .css("cursor", "pointer")
            .on("click", () => {
              const absUrl = (/^[a-z]+:\/\//i.test(url) ? "" : "https://") + url;
              try {
                if ((new URL(absUrl)).host === location.host) {
                  globalThis.open(absUrl, "_blank", "noopener,noreferrer");
                  return;
                }
                else throw new Error("External");
              }
              catch {
                $("#rich-textarea-unsafe-link").toast("show").find("b").text(sanitizedUrl);
                $("#rich-textarea-unsafe-link-confirm")
                  .off("click")
                  .on("click", () => {
                    globalThis.open(absUrl, "_blank", "noopener,noreferrer");
                  });
              }
            })
            .on("mouseenter", function () {
              neighbourLinkElements.addClass("rich-textarea-link-enabled");
            })
            .on("mouseleave", function () {
              neighbourLinkElements.removeClass("rich-textarea-link-enabled");
            });
        }
      });
    }
    targetElement?.empty().append(parsedText.children());
  }
  function insertShowMoreButton(targetElement: JQuery<HTMLElement>): void {
    const more = "<i class=\"far fa-square-plus\" aria-hidden=\"true\"></i>Mehr anzeigen";
    const less = "<i class=\"far fa-square-minus\" aria-hidden=\"true\"></i>Weniger anzeigen";
    let expanded = false;

    const showMoreButton = $("<a href=\"#\">" + more + "</a>");
    if (options?.showMoreButtonChange) {
      options.showMoreButtonChange(showMoreButton);
    }
    showMoreButton.on("click", function (ev) {
      ev.preventDefault();
      if (expanded) {
        $(this).html(more);
        targetElement.css({ maxHeight: "96px" });
        expanded = false;
      }
      else {
        $(this).html(less);
        targetElement.css({ maxHeight: "none" });
        expanded = true;
      }
    });
    targetElement.after(showMoreButton);

    targetElement.css({ maxHeight: "96px", overflow: "hidden" });

    function updateButton(): void {
      targetElement.css({ maxHeight: "none" });
      const naturalHeight = targetElement[0].getBoundingClientRect().height;

      if (naturalHeight > 96) {
        targetElement.css({ maxHeight: expanded ? "none" : "96px" });
        showMoreButton.show().html(expanded ? less : more);
      }
      else if (naturalHeight == 0) {
        targetElement.css({ maxHeight: "96px" });
      }
      else {
        targetElement.css({ maxHeight: "none" });
        showMoreButton.hide();
        expanded = false;
      }
    }
    
    requestAnimationFrame(updateButton);
    $(globalThis).on("resize", updateButton);
    (new IntersectionObserver(updateButton)).observe(targetElement[0]);
  }
  function parseNormalChar(char: string): void {
    function handleStyleToggles(): void {
      if (activeTags.some(tag => tag.tagName === "b")) {
        span.css("font-weight", "700");
      }
      if (activeTags.some(tag => tag.tagName === "u")) {
        span.css("text-decoration", "underline");
      }
      if (activeTags.some(tag => tag.tagName === "i")) {
        span.css("font-style", "italic");
      }
    }
    function handleFontSizeStyles(): void {
      const fsMatch = activeTags.find(tag => tag.tagName === "fs");
      if (fsMatch) {
        span.attr("data-font-size", fsMatch.args[0]);
        span.css("font-size", fsMatch.args[0] + "px");
      }
      if (activeTags.some(tag => tag.tagName === "sub")) {
        span.css("font-size", Number.parseInt(fsMatch?.args[0] ?? "16") * 0.83);
        span.addClass("sub");
      }
      if (activeTags.some(tag => tag.tagName === "sup")) {
        span.css("font-size", Number.parseInt(fsMatch?.args[0] ?? "16") * 0.83);
        span.addClass("sup");
      }
    }

    if (deepCompare(previousActiveTags, activeTags) && options?.merge) {
      const previousSpan = parsedText.find("span").last();
      previousSpan.html(previousSpan.html() + sanitizeHtml(char));
      return;
    }
    const span = $(`<span>${sanitizeHtml(char)}</span>`);
    handleStyleToggles();
    handleFontSizeStyles();
    const cMatch = activeTags.find(tag => tag.tagName === "c");
    if (cMatch) {
      span.attr("data-color", cMatch.args[0]);
      span.css("color", cMatch.args[0]);
    }
    const aMatch = activeTags.find(tag => tag.tagName === "a");
    if (aMatch) {
      span.attr(
        "data-link-url",
        aMatch.args[0].replaceAll("\\", "\\\\").replaceAll(";", String.raw`\;`).replaceAll("<", String.raw`\«`).replaceAll(">", String.raw`\»`)
      );
    }
    parsedText.append(span[0].outerHTML);
  }

  if (!val) return "";
  const length = val.length;

  const parsedText = $("<div></div>");
  let escaped = false;
  let activeTags: { tagName: string; args: string[] }[] = [];
  let previousActiveTags: { tagName: string; args: string[] }[] | null = null;
  let inTag = false;
  let activeTagName = "";
  let activeTagArgs: string[] = [];
  let activeArgsId = -1;

  for (let index = 0; index < length; index++) {
    function parseChar(): boolean {
      function handleEscapedChar(): boolean | undefined {
        if (char === "\\") {
          escaped = !escaped;
          return escaped;
        }
        if (char === "«" && escaped) {
          char = "<";
          escaped = false;
          return false;
        }
        if (char === "»" && escaped) {
          char = ">";
          escaped = false;
          return false;
        }
      }

      const res = handleEscapedChar();
      if (res !== undefined) return res;

      if (char === ";" && !escaped && inTag) {
        activeArgsId++;
        activeTagArgs[activeArgsId] = "";
        return true;
      }
      if (escaped) escaped = false;
      if (char === "<") {
        inTag = true;
        activeTagName = "";
        activeTagArgs = [];
        activeArgsId = -1;
        return true;
      }
      if (char === ">") {
        inTag = false;
        if (activeTagName.startsWith("/")) {
          activeTags = activeTags.filter(t => t.tagName !== activeTagName.substring(1));
        }
        else {
          activeTags.push({ tagName: activeTagName, args: activeTagArgs });
        }
        return true;
      }
      return false;
    }
    let char = val.substring(index, index + 1);

    if (parseChar()) continue;
    if (inTag) {
      if (activeArgsId === -1) {
        activeTagName += char;
      }
      else {
        activeTagArgs[activeArgsId] += char;
      }
    }
    else if (char === "\n") {
      parsedText.append('<br><span class="newline">&#8203;</span>');
      previousActiveTags = null;
    }
    else {
      parseNormalChar(char);
      previousActiveTags = [ ...activeTags ];
    }
  }

  handleOptions();

  return parsedText.html();
}

export function richTextToPlainText(val: string): string {
  while (val.includes("<") || val.includes(">")) {
    val = val.replace(/<(.*?)>(.*?)<\/\1>/g, "$2");
  }
  val = val.replaceAll(String.raw`\«`, "<");
  val = val.replaceAll(String.raw`\»`, ">");
  val = val.replaceAll("\\\\", "\\");
  return escapeHTML(val);
}

function replaceRichTextareas(): void {
  $(".rich-textarea:not(.rich-textarea-replaced)").each(function () {
    // Get the selection in the textarea instead of in the text nodes of the <span> elements
    function extractSelectedRanges(): Range[] {
      function normalizeSelectedRange(range: Range): void {
        if (textarea[0].contains(range.startContainer) && textarea[0].contains(range.endContainer)) {
          if (range.startContainer.nodeType === range.startContainer.TEXT_NODE) {
            const startSpan = range.startContainer.parentNode;
            const startOffset =
              Array.prototype.indexOf.call(startSpan?.parentNode?.children, startSpan) + range.startOffset;
            range.setStart(textarea[0], startOffset);
          }
          if (range.endContainer.nodeType === range.endContainer.TEXT_NODE) {
            const endSpan = range.endContainer.parentNode;
            const endOffset = Array.prototype.indexOf.call(endSpan?.parentNode?.children, endSpan) + range.endOffset;
            range.setEnd(textarea[0], endOffset);
          }
        }
      }

      const selection = document.getSelection();
      if (!selection) return [];

      const ranges: Range[] = [];
      for (let rangeId = 0; rangeId < selection.rangeCount; rangeId++) {
        const range = selection.getRangeAt(rangeId).cloneRange();

        normalizeSelectedRange(range);

        ranges.push(range);
      }

      return ranges;
    }
    function updateInput(): void {
      let newVal = "";

      textarea.find("span, br").each(function () {
        function handleControlChars(element: HTMLElement): void {
          if ($(element).is("br")) {
            newVal += "\n";
            return;
          }
          if ($(element).is(".newline")) {
            return;
          }
        }
        function handleSimpleStyleToggles(element: HTMLElement): void {
          if ($(element).css("font-weight") === "700") {
            singleValue = `<b>${singleValue}</b>`;
          }
          if ($(element).css("text-decoration").includes("underline")) {
            singleValue = `<u>${singleValue}</u>`;
          }
          if ($(element).css("font-style").includes("italic")) {
            singleValue = `<i>${singleValue}</i>`;
          }
        }

        handleControlChars(this);
        
        let singleValue = $(this).text().replaceAll("\\", "\\\\").replaceAll("<", String.raw`\«`).replaceAll(">", String.raw`\»`);

        handleSimpleStyleToggles(this);
        const fontSize = Number.parseInt($(this).attr("data-font-size") ?? "16");
        if (fontSize !== 16) {
          singleValue = `<fs;${fontSize}>${singleValue}</fs;${fontSize}>`;
        }
        if ($(this).hasClass("sub")) {
          singleValue = `<sub>${singleValue}</sub>`;
        }
        if ($(this).hasClass("sup")) {
          singleValue = `<sup>${singleValue}</sup>`;
        }
        const color = $(this).attr("data-color") ?? "";
        if (color !== "") {
          singleValue = `<c;${color}>${singleValue}</c;${color}>`;
        }
        const linkUrl = $(this).attr("data-link-url") ?? "";
        if (linkUrl !== "") {
          singleValue = `<a;${linkUrl}>${singleValue}</a;${linkUrl}>`;
        }
        newVal += singleValue;
      });

      let previousVal = "";
      do {
        previousVal = newVal;
        newVal = newVal.replace(/<\/(.+)>((?:<[^<>]*?>)*?)<\1>/g, "$2");
      } while (newVal !== previousVal);

      input.val(newVal);
    }
    function forEachSelectedSpan(func: (span: JQuery<HTMLElement>) => void): void {
      const ranges = extractSelectedRanges();
      globalThis.getSelection()?.removeAllRanges();
      for (const range of ranges) {
        if (textarea[0].contains(range.startContainer) && textarea[0].contains(range.endContainer)) {
          const selectedSpans = textarea.find("span, br").slice(range.startOffset, range.endOffset);
          selectedSpans.each(function () {
            func($(this));
          });

          updateInput();
        }
        globalThis.getSelection()?.addRange(range);
      }
    }
    function copyStyles(node: JQuery<HTMLElement>): void {
      for (const styleToggle of styleToggles) {
        if (currentStyles[styleToggle.styleName]) {
          node.css(styleToggle.cssPropName, styleToggle.cssPropNewVal);
        }
      }
      if (currentStyles.fontSize.enabled) {
        node.attr("data-font-size", currentStyles.fontSize.value);
        node.css("font-size", currentStyles.fontSize.value);
      }
      if (currentStyles.sub) {
        node.addClass("sub");
        node.css("font-size", Number.parseInt(node.attr("data-font-size") ?? "16") * 0.83 + "px");
      }
      if (currentStyles.sup) {
        node.addClass("sup");
        node.css("font-size", Number.parseInt(node.attr("data-font-size") ?? "16") * 0.83 + "px");
      }
      if (currentStyles.color.enabled && currentStyles.color.value !== "auto") {
        node.attr("data-color", currentStyles.color.value);
        node.css("color", currentStyles.color.value);
      }
    }
    function insertAtRange(insertion: string, ranges: Range[], options?: { copyStyles?: boolean; replace?: boolean }): void {
      function checkReplace(): void {
        if (options?.replace) {
          let oldVal = newNode.text();
          for (let length = 1; length <= maxReplacementLength; length++) {
            const match = findReplacement("old", oldVal);
            if (match) {
              newNode
                .prevAll()
                .slice(0, length - 1)
                .remove();
              newNode.text(match.new);
              break;
            }
            oldVal =
              newNode
                .prevAll()
                .eq(length - 1)
                .text() + oldVal;
          }
        }
      }
      deleteSelectedRanges(ranges);

      const range = ranges[0];
      if (!range) return;
      const newNode = $(insertion);
      if (options?.copyStyles) {
        copyStyles(newNode);
      }

      if (textarea.find("span, br").length === 0) {
        textarea.append(newNode);
      }
      else if (range.startOffset === 0) {
        textarea.prepend(newNode);
      }
      else {
        const previous = textarea.find("span, br").eq(range.startOffset - 1);
        previous.after(newNode);
      }

      checkReplace();

      range.setStartAfter(newNode.last()[0]);
      range.setEndAfter(newNode.last()[0]);
      globalThis.getSelection()?.removeAllRanges();
      globalThis.getSelection()?.addRange(range);
    }
    function deleteSelectedRanges(ranges: Range[]): void {
      for (const range of ranges) {
        if (range.startOffset === range.endOffset) {
          continue;
        }
        let toRemove = textarea.find("span, br").slice(range.startOffset, range.endOffset);
        const additional = toRemove.filter("span.newline").prev();
        toRemove = toRemove.add(additional);
        toRemove.remove();

        globalThis.getSelection()?.removeAllRanges();
        globalThis.getSelection()?.addRange(range);
      }
    }
    function deleteAtRange(ranges: Range[]): void {
      const firstRange = ranges[0].cloneRange();
      const firstRangeCollapsed = firstRange.collapsed;

      deleteSelectedRanges(ranges);

      if (firstRangeCollapsed && firstRange.startOffset !== 0) {
        let target: JQuery<HTMLElement>;
        target = textarea.find("span, br").eq(firstRange.startOffset - 1);
        const match = findReplacement("new", target.text());
        if (match) {
          for (const char of match.old.split("")) {
            insertAtRange(`<span>${char}</span>`, ranges, { copyStyles: true });
          }
          target.remove();
        }
        else {
          const additional = target.filter("span.newline").prev();
          target = target.add(additional);
          target.remove();
        }
      }

      globalThis.getSelection()?.removeAllRanges();
      for (const range of ranges) {
        globalThis.getSelection()?.addRange(range);
      }
    }
    async function pasteAtRange(ranges: Range[]): Promise<void> {
      try {
        function getAllNodes(root: Node): Node[] {
          const textNodes: Node[] = [];
      
          function recurse(node: Node): void {
            if (
              (node.nodeType === Node.TEXT_NODE && node.nodeValue !== "") ||
              (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "BR")
            ) {
              textNodes.push(node);
            }
            else {
              for (const cn of node.childNodes) recurse(cn);
            }
          }
      
          recurse(root);
          return textNodes;
        }
        
        async function extractStyledTextFromBlob(blob: Blob): Promise<string> {
          function handleNode(node: Node): void {
            function applyBr(node: Node): boolean {
              if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "BR") {
                result.append($("<br><span class=\"newline\">&#8203;</span>"));
                return true;
              }
              return false;
            }
            function getRealUnderline(element: HTMLElement): boolean {
              while (element.parentElement) {
                if (getComputedStyle(element).textDecorationLine === "underline" || element.tagName === "U") {
                  return true;
                }
                if (element.style.textDecorationLine === "none") {
                  return false;
                }
                element = element.parentElement;
              }
              return false;
            }
            function isSub(element: HTMLElement): boolean {
              while (element.parentElement) {
                if (element.tagName === "SUB" || element.style.verticalAlign === "sub") {
                  return true;
                }
                element = element.parentElement;
              }
              return false;
            }
            function isSup(element: HTMLElement): boolean {
              while (element.parentElement) {
                if (element.tagName === "SUP" || element.style.verticalAlign === "super") {
                  return true;
                }
                element = element.parentElement;
              }
              return false;
            }
            function applySubAndSup(element: HTMLElement): void {
              if (isSub(element)) {
                fontSize /= 0.83;
                fontSize = Math.round(fontSize);
                spans.addClass("sub");
                spans.css("font-size", fontSize * 0.83 + "px");
              }
              else if (isSup(element)) {
                fontSize /= 0.83;
                fontSize = Math.round(fontSize);
                spans.addClass("sup");
                spans.css("font-size", fontSize * 0.83 + "px");
              }
            }
            function isLink(element: HTMLElement): false | string | null {
              while (element.parentElement) {
                if (element.tagName === "A" && element.getAttribute("href") !== null) {
                  return element.getAttribute("href");
                }
                element = element.parentElement;
              }
              return false;
            }

            if (applyBr(node)) return;

            const parentElement = node.parentElement;
            if (! parentElement) return;

            const computedStyle = getComputedStyle(parentElement);
            const spans = $(node.textContent?.split("").map(c => c === "" ? "" : `<span>${c}</span>`).join("") ?? "");
            if (Number.parseInt(computedStyle.fontWeight) > 500) {
              spans.css("font-weight", "700");
            }
            // Get the underline style. As it isn't inherited normally, you need to iterate over the parents
            if (getRealUnderline(parentElement)) {
              spans.css("text-decoration", "underline");
            }
            if (computedStyle.fontStyle === "italic") {
              spans.css("font-style", "italic");
            }
            let fontSize = Number.parseInt(computedStyle.fontSize);
            spans.css("font-size", Math.round(fontSize) + "px");
            applySubAndSup(parentElement);
            spans.attr("data-font-size", fontSize);
            let color = computedStyle.color;
            if (! ["rgb(33, 37, 41)", "rgb(222, 226, 230)"].includes(color)) {
              color = color.substring(4, color.length - 1);
              const colors = color.split(", ").map(v => Number.parseInt(v));
              const hex = rgbToHex({ red: colors[0], green: colors[1], blue: colors[2] });
              spans.attr("data-color", hex);
              spans.css("color", hex);
            }
            const link = isLink(parentElement);
            if (link) {
              spans.attr("data-link-url",
                link.replaceAll("\\", "\\\\")
                  .replaceAll(";", String.raw`\;`)
                  .replaceAll("<", String.raw`\«`)
                  .replaceAll(">", String.raw`\»`)
              );
            }
            result.append(spans);
          }
          const result = $("<div></div>");
          const htmlText = (await blob.text()).replaceAll("\n", "");
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, "text/html");
          $(doc).find("p").each(function ()  {
            if ($(this).next().length) {
              $(this).after("<br>");
            }
          });
        
          // Get all text nodes and <br> tags
          const nodes = getAllNodes(doc.body);
          
          pasteAreaShadowRoot.appendChild(doc.body);
          for (const node of nodes) {
            handleNode(node);
          }
          pasteAreaShadowRoot.innerHTML = "";
          return result.html();
        }
      
        const clipboardItems = await navigator.clipboard.read();
        const blobs: { [key: string]: Blob } = {};

        for (const clipboardItem of clipboardItems) {
          for (const type of clipboardItem.types) {
            blobs[type] = await clipboardItem.getType(type);
          }
        }
        
        const html = blobs["text/html"];
        const plain = blobs["text/plain"];
        if (html) {
          insertAtRange(await extractStyledTextFromBlob(html), ranges);
        }
        else if (plain) {
          insertAtRange((await plain.text()).split("").map(c => c === "" ? "" : `<span>${c}</span>`).join("") ?? "", ranges);
        }
        else {
          $("#rich-textarea-pasting-error").toast("show");
        }
      }
      catch {
        $("#rich-textarea-pasting-error").toast("show");
      }
    }

    const input = $(this);
    let isExternalInputChangeEvent = true;
    const richTextareaTemplate = $($("#rich-textarea-template").html());
    const richTextarea = richTextareaTemplate.filter(".rich-textarea-wrapper");
    const pasteArea = richTextareaTemplate.filter(".rich-textarea-paste-area");
    const pasteAreaElement = pasteArea.get(0);
    if (! pasteAreaElement) {
      console.error("No paste area found for the rich text area");
      return;
    }
    const pasteAreaShadowRoot = pasteAreaElement.attachShadow({ mode: "open" });
    const textarea = richTextarea.find(".rich-textarea-input");
    $(`label[for="${$(this).attr("id")}"]`).on("click", () => {
      textarea.trigger("focus");
    });

    textarea.html(richTextToHtml(input.val()?.toString() ?? ""));
    textarea.toggleClass("rich-textarea-empty", textarea.html() === "");

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if ((entry.contentRect.height ?? 0) >= 120) {
          textarea.css("height", "auto");
          textarea.css("height", textarea[0].scrollHeight + 2 + "px");
        }
      }
    });
    resizeObserver.observe(textarea[0]);

    const currentStyles = {
      bold: false,
      underline: false,
      italic: false,
      fontSize: { enabled: false, value: 16 },
      sub: false,
      sup: false,
      color: { enabled: false, value: "auto" }
    };

    richTextarea.find(".rich-textarea-color svg").hide();
    richTextarea.find(".rich-textarea-color-enabled").hide();
    richTextarea.find(".rich-textarea-color-picker").val("auto");

    richTextarea.find(".rich-textarea-toolbar").hide();
    richTextarea.find(".rich-textarea-input-toggle").on("click", function () {
      richTextarea.find(".rich-textarea-toolbar").toggle();
    });

    input.on("input change", () => {
      if (isExternalInputChangeEvent) {
        textarea.html(richTextToHtml(input.val()?.toString() ?? ""));
        textarea.toggleClass("rich-textarea-empty", textarea.html() === "");
      }
      isExternalInputChangeEvent = true;
    });

    function findReplacement(direction: "old" | "new", val: string): { old: string, new: string } | undefined {
      if (direction === "old") {
        return replacements.find(r => r.old === val);
      }
      else {
        return replacements.find(r => r.new === val);
      }
    }
    const maxReplacementLength = 4;
    const replacements = [
      { old: "-->", new: "⭢" },
      { old: "<--", new: "⭠" },
      { old: "<->", new: "⭤" },
      { old: "*", new: "☆" }
    ];

    textarea.on("beforeinput", async e => {
      const ev = e.originalEvent as InputEvent;
      if (!ev) return;
      if (composing) return;

      const ranges = extractSelectedRanges();

      ev.preventDefault();
      if (ev.inputType === "insertText" && ev.data) {
        insertAtRange(`<span>${ev.data}</span>`, ranges, {
          copyStyles: true,
          replace: true
        });
      }
      else if (["insertParagraph", "insertLineBreak"].includes(ev.inputType)) {
        insertAtRange("<br>", ranges);
        // You need this zero-width-character to select an empty line
        insertAtRange('<span class="newline">&#8203;</span>', ranges);
      }
      else if (ev.inputType === "deleteContentBackward") {
        deleteAtRange(ranges);
      }
      else if (ev.inputType === "insertFromPaste") {
        await pasteAtRange(ranges);
      }
      else if (ev.inputType !== "insertCompositionText") {
        $("#rich-textarea-unsupported-input-type").toast("show").find("i").eq(1).text(ev.inputType);
      }

      updateInput();

      isExternalInputChangeEvent = false;
      input.trigger("input");
      textarea.toggleClass("rich-textarea-empty", textarea.html() === "");
    });

    let composing = false;

    textarea.on("compositionstart", () => {
      composing = true;
      textarea.toggleClass("rich-textarea-empty", false);
    });

    textarea.on("compositionupdate", () => {
      composing = true;
    });

    textarea.on("compositionend", () => {
      composing = false;
      textarea.find("br").each(function() {
        if (! $(this).next().is("span.newline")) {
          $(this).remove();
        }
      });

      textarea.contents().filter(function() {
        return this.nodeType === 3;
      }).each(function() {
        const text = this.nodeValue || "";
        const spans = text.split("").map(char => $("<span>").text(char)[0]);
        $(this).replaceWith(spans);

        const sel = globalThis.getSelection();
        if (!sel) return;
        const range = document.createRange();
        range.setStartAfter(spans.at(-1) as Node);

        sel.removeAllRanges();
        sel.addRange(range);
      });

      textarea.find("span").filter(function() {
        return $(this).text().length > 1;
      }).each(function() {
        const text = $(this).text();
        const spans = text.split("").map(char => $("<span>").text(char)[0]);
        $(this).replaceWith(spans);
        
        const sel = globalThis.getSelection();
        if (!sel) return;
        const range = document.createRange();
        range.setStartAfter(spans.at(-1) as Node);

        sel.removeAllRanges();
        sel.addRange(range);
      });

      updateInput();

      isExternalInputChangeEvent = false;
      input.trigger("input");
      textarea.toggleClass("rich-textarea-empty", textarea.html() === "");
    });

    const styleToggles: {
      styleName: "bold" | "underline" | "italic";
      btnName: string;
      cssPropName: string;
      cssPropBaseVal: string;
      cssPropNewVal: string;
    }[] = [
      {
        styleName: "bold",
        btnName: ".rich-textarea-bold",
        cssPropName: "font-weight",
        cssPropBaseVal: "400",
        cssPropNewVal: "700"
      },
      {
        styleName: "underline",
        btnName: ".rich-textarea-underline",
        cssPropName: "text-decoration",
        cssPropBaseVal: "none",
        cssPropNewVal: "underline"
      },
      {
        styleName: "italic",
        btnName: ".rich-textarea-italic",
        cssPropName: "font-style",
        cssPropBaseVal: "normal",
        cssPropNewVal: "italic"
      }
    ];

    for (const styleToggle of styleToggles) {
      richTextarea.find(styleToggle.btnName).on("click", function () {
        currentStyles[styleToggle.styleName] = !currentStyles[styleToggle.styleName];
        $(this).toggleClass("enabled");

        forEachSelectedSpan(span => {
          if (span.css(styleToggle.cssPropName).includes(styleToggle.cssPropNewVal)) {
            span.css(styleToggle.cssPropName, styleToggle.cssPropBaseVal);
          }
          else {
            span.css(styleToggle.cssPropName, styleToggle.cssPropNewVal);
          }
        });
      });
    }

    richTextarea.find(".rich-textarea-font-size-dropdown input").on("input", function () {
      richTextarea.find(".rich-textarea-font-size span").text(`(${$(this).val()})`);
      currentStyles.fontSize.value = Number.parseInt($(this).val()?.toString() ?? "16");
    });

    richTextarea.find(".rich-textarea-font-size").on("click", function () {
      const newFontSize = Number.parseInt(
        richTextarea.find(".rich-textarea-font-size-dropdown input").val()?.toString() ?? "16"
      );
      if (!newFontSize) return;
      currentStyles.fontSize.enabled = !currentStyles.fontSize.enabled;
      currentStyles.fontSize.value = newFontSize;
      $(this).toggleClass("enabled");
      forEachSelectedSpan(span => {
        if (Number.parseInt(span.attr("data-font-size") ?? "16") === newFontSize) {
          span.attr("data-font-size", 16);
          if (span.hasClass("sub") || span.hasClass("sup")) {
            span.css("font-size", 16 * 0.83);
          }
          else {
            span.css("font-size", 16);
          }
        }
        else {
          span.attr("data-font-size", newFontSize);
          if (span.hasClass("sub") || span.hasClass("sup")) {
            span.css("font-size", newFontSize * 0.83);
          }
          else {
            span.css("font-size", newFontSize);
          }
        }
      });
    });

    richTextarea.find(".rich-textarea-sub").on("click", function () {
      currentStyles.sub = !currentStyles.sub;
      currentStyles.sup = false;
      $(this).toggleClass("enabled");
      richTextarea.find(".rich-textarea-sup").removeClass("enabled");

      forEachSelectedSpan(span => {
        if (span.hasClass("sub")) {
          span.removeClass("sub");
          span.css("font-size", (span.attr("data-font-size") ?? 16) + "px");
        }
        else {
          span.addClass("sub");
          span.removeClass("sup");
          span.css("font-size", Number.parseInt(span.attr("data-font-size") ?? "16") * 0.83 + "px");
        }
      });
    });

    richTextarea.find(".rich-textarea-sup").on("click", function () {
      currentStyles.sup = !currentStyles.sup;
      currentStyles.sub = false;
      $(this).toggleClass("enabled");
      richTextarea.find(".rich-textarea-sub").removeClass("enabled");

      forEachSelectedSpan(span => {
        if (span.hasClass("sup")) {
          span.removeClass("sup");
          span.css("font-size", (span.attr("data-font-size") ?? 16) + "px");
        }
        else {
          span.addClass("sup");
          span.removeClass("sub");
          span.css("font-size", Number.parseInt(span.attr("data-font-size") ?? "16") * 0.83 + "px");
        }
      });
    });

    richTextarea.find(".rich-textarea-color-picker-toggle").on("click", ev => {
      ev.stopPropagation();
      richTextarea.find(".rich-textarea-color-picker ~ .color-picker-trigger").trigger("click");
    });

    richTextarea.find(".rich-textarea-color-picker").on("change", function () {
      const color = $(this).val()?.toString() ?? "#3bb9ca";
      currentStyles.color.value = color;
      if (color === "auto") {
        richTextarea.find(".rich-textarea-color svg").hide().find("~ span").show();
        richTextarea.find(".rich-textarea-color-enabled").hide();
      }
      else {
        richTextarea.find(".rich-textarea-color svg").css("fill", color).show().find("~ span").hide();
        richTextarea.find(".rich-textarea-color-enabled").toggle(currentStyles.color.enabled);
      }
    });

    richTextarea.find(".rich-textarea-color").on("click", function () {
      const newColor = richTextarea.find(".rich-textarea-color-picker").val()?.toString() ?? "#3bb9ca";
      currentStyles.color.enabled = !currentStyles.color.enabled;
      currentStyles.color.value = newColor;
      $(this).toggleClass("enabled");
      if (newColor !== "auto") {
        $(this).find(".rich-textarea-color-enabled").toggle();
      }
      forEachSelectedSpan(span => {
        if (span.attr("data-color") === newColor || newColor === "auto") {
          span.css("color", "");
          span.attr("data-color", "");
        }
        else {
          span.css("color", newColor);
          span.attr("data-color", newColor);
        }
      });
    });

    richTextarea.find(".rich-textarea-link").on("click", () => {
      let newUrl = richTextarea.find(".rich-textarea-link-dropdown input").val()?.toString() ?? "";
      newUrl = newUrl.replaceAll("\\", "\\\\").replaceAll(";", String.raw`\;`).replaceAll("<", String.raw`\«`).replaceAll(">", String.raw`\»`);
      forEachSelectedSpan(span => {
        if (span.attr("data-link-url") === newUrl || newUrl === "") {
          span.css("link-url", "");
          span.attr("data-link-url");
        }
        else {
          span.css("link-url", newUrl);
          span.css("font-weight", "700");
          span.css("text-decoration", "underline");
          span.css("color", "#3bb9ca");
          span.attr("data-color", "#3bb9ca");
          span.attr("data-link-url", newUrl);
        }
      });
    });

    richTextarea.find(".rich-textarea-clear").on("click", () => {
      forEachSelectedSpan(span => {
        span.removeAttr("style").removeAttr("data-font-size").removeAttr("data-color").removeAttr("data-link-url");
        span.removeClass("sub").removeClass("sup");
      });
    });

    richTextarea.find(".rich-textarea-link-dropdown span").hide();

    $(document).on("selectionchange", () => {
      if (composing) return;

      let selectedSpans: JQuery<HTMLElement> = $();

      const ranges = extractSelectedRanges();
      for (const range of ranges) {
        if (textarea[0].contains(range.startContainer) && textarea[0].contains(range.endContainer)) {
          if (range.collapsed && range.startOffset !== 0) {
            selectedSpans = textarea.find("span, br").eq(range.startOffset - 1);
          }
          else {
            selectedSpans = textarea.find("span, br").slice(range.startOffset, range.endOffset);
          }
        }
      }

      textarea.find("span").removeClass("rich-textarea-link-enabled");
      richTextarea.find(".rich-textarea-link").removeClass("enabled");
      richTextarea.find(".rich-textarea-link-dropdown span").hide();
      if (ranges.length === 1) {
        let commonLinkUrl: string | undefined | null;
        selectedSpans.each(function () {
          if (commonLinkUrl === undefined) {
            commonLinkUrl = $(this).attr("data-link-url")?.replaceAll("\\", "\\\\");
          }
          else if (commonLinkUrl !== $(this).attr("data-link-url")?.replaceAll("\\", "\\\\")) {
            commonLinkUrl = null;
          }
        });
        if (typeof commonLinkUrl === "string" && commonLinkUrl !== "") {
          selectedSpans
            .add(selectedSpans.prevUntil(`:not([data-link-url="${commonLinkUrl}"])`))
            .add(selectedSpans.nextUntil(`:not([data-link-url="${commonLinkUrl}"])`))
            .addClass("rich-textarea-link-enabled");
          richTextarea.find(".rich-textarea-link").addClass("enabled");
          const displayedUrl = commonLinkUrl
            .replaceAll(String.raw`\«`, "<")
            .replaceAll(String.raw`\»`, ">")
            .replaceAll(String.raw`\;`, ";")
            .replaceAll("\\\\", "\\");
          richTextarea.find(".rich-textarea-link-dropdown span").show().find("b").text(displayedUrl);
        }
      }
    });

    input.after(richTextareaTemplate).addClass("rich-textarea-replaced");
  });
}

$(() => {
  new MutationObserver(mutationsList => {
    for (const mutation of mutationsList) {
      $(mutation.addedNodes).each(function () {
        if ($(this).find(".rich-textarea").length > 0) {
          replaceRichTextareas();
        }
      });
    };
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  replaceRichTextareas();
});
