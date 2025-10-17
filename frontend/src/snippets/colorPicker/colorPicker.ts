import { escapeHTML } from "../../global/global.js";
import { ColorRGB, ColorHSV } from "./types";

function hsvToRgb({ hue: h, saturation: s, value: v }: ColorHSV): ColorRGB {
  h /= 60;
  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;

  let [r, g, b] = (() => {
    if (h < 1) return [c, x, 0];
    if (h < 2) return [x, c, 0];
    if (h < 3) return [0, c, x];
    if (h < 4) return [0, x, c];
    if (h < 5) return [x, 0, c];
    return [c, 0, x];
  })();

  [r, g, b] = [r, g, b].map(val => Math.round((val + m) * 255.0));

  return { red: r, green: g, blue: b };
}

function rgbToHsv({ red: r, green: g, blue: b }: ColorRGB): ColorHSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    switch (max) {
    case r:
      h = ((g - b) / diff) % 6;
      break;
    case g:
      h = (b - r) / diff + 2;
      break;
    case b:
      h = (r - g) / diff + 4;
      break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : diff / max;
  const v = max;

  return { hue: h, saturation: s, value: v };
}

function hexToRgb(hexValue: string): ColorRGB {
  const r = parseInt(hexValue.substring(1, 3), 16);
  const g = parseInt(hexValue.substring(3, 5), 16);
  const b = parseInt(hexValue.substring(5), 16);

  return { red: r, green: g, blue: b };
}

export function rgbToHex({ red: r, green: g, blue: b }: ColorRGB): string {
  return "#" + [r, g, b].map(val => val.toString(16).padStart(2, "0")).join("");
}

function hexToCSS(hexValue: string): string {
  const r = parseInt(hexValue.substring(1, 3), 16);
  const g = parseInt(hexValue.substring(3, 5), 16);
  const b = parseInt(hexValue.substring(5), 16);

  return [r, g, b].toString();
}

function replaceColorPickers(): void {
  $(".color-picker:not(.color-picker-replaced)").each(function () {
    const input = $(this);
    const startColor = input.val()?.toString() ?? "#3bb9ca";

    const trigger = $('<button class="rounded cursor-pointer color-picker-trigger" tabindex="0">').css("--selected-color", hexToCSS(startColor));
    input.after(trigger).addClass("color-picker-replaced");

    const popup = $($("#color-picker-template").html());

    popup.find(".color-picker-suggestions").html(suggestedColorsHtml);
    popup.find(".color-picker-saved").html(savedColorsHtml);
    popup.find(".color-picker-save i").toggleClass("far", !savedColors.includes(startColor));

    popup.find(`.color-picker-option[data-color="${escapeHTML(startColor)}"]`).addClass("selected");
    popup.find(".color-picker-hex").val(startColor === "auto" ? "Automatisch" : startColor);

    if ($(this).attr("data-show-auto-option") === "true") {
      popup.find(".color-picker-auto-option-wrapper").addClass("d-flex").removeClass("d-none");
    }

    popup.hide();
    trigger.css({ zIndex: 0 });
    trigger.append(popup);

    trigger.on("click", function (ev) {
      function getOptimalXPosition(): "left" | "right" {
        return (
          // Not enough space on the right
          xRight + offset.left + (popup.outerWidth() ?? 0) > ($(window).width() ?? 0) &&
          // Enough space on the left
          xLeft + offset.left > 0
        ) ? "left" : "right";
      }

      function getOptimalYPosition(): "above" | "below" {
        function height($el: JQuery<HTMLElement>): number {
          return $el.outerHeight() ?? 0;
        }
        return (
          // Not enough space below
          yBelow + offset.top + height(popup) - window.scrollY > window.innerHeight - height($(".bottombar")) &&
          // Enough space above
          yAbove + offset.top - ($(window).scrollTop() ?? 0) >= 0
        ) ? "above" : "below";
      }
      
      ev.stopPropagation();
      $(".color-picker-popup").not(popup).hide();
      const offset = trigger.offset() ?? { left: 0, top: 0 };
      const yBelow = (trigger.outerHeight() ?? 0) + 4;
      const yAbove = -(popup.outerHeight() ?? 0) - 4;
      const xRight = 0;
      const xLeft = (trigger.outerWidth() ?? 0) - (popup.outerWidth() ?? 0);

      $(".color-picker-trigger").css({ zIndex: 0 });
      trigger.css({ zIndex: "1" });
      popup
        .css({
          left: getOptimalXPosition() === "right" ? xRight : xLeft,
          top: getOptimalYPosition() === "below" ? yBelow : yAbove
        })
        .toggle();

      setHsvSelection(input.val() as string);
    });

    function setHsvSelection(hexColor: string): void {
      if (hexColor === "auto") return;
      const hsvColor = rgbToHsv(hexToRgb(hexColor));
      selectedHsvColor = hsvColor;
      markerHue.css({
        top: Math.round((hsvColor.hue / 360) * (hueContainer.outerHeight() ?? 0))
      });
      markerSaturationValue.css({
        left: Math.round(hsvColor.saturation * (saturationValueContainer.outerWidth() ?? 0)),
        top: Math.round((1 - hsvColor.value) * (saturationValueContainer.outerHeight() ?? 0))
      });
      const gradientColor = `hsl(${hsvColor.hue}, 100%, 50%)`;
      saturationValueContainer.css({
        background: `
        linear-gradient(transparent 0%, black 100%),
        linear-gradient(90deg, white 0%, transparent 100%),
        linear-gradient(${gradientColor} 0%, ${gradientColor} 100%)`
      });
    }

    let selectedHsvColor = rgbToHsv(hexToRgb(startColor));

    let suppressClick = false;

    let markerSaturationValueDragging = false;
    const markerSaturationValue = popup.find(".color-picker-marker-saturation-value");
    const saturationValueContainer = popup.find(".color-picker-saturation-value");

    function moveMarkerSaturationValue(x: number, y: number, isAlreadyRelative?: boolean): void {
      const containerOffset = saturationValueContainer.offset() ?? {
        left: 0,
        top: 0
      };
      const containerWidth = saturationValueContainer.outerWidth() ?? 0;
      const containerHeight = saturationValueContainer.outerHeight() ?? 0;

      let newX = x - (isAlreadyRelative ? 0: containerOffset.left);
      newX = Math.max(0, Math.min(newX, containerWidth));

      let newY = y - (isAlreadyRelative ? 0: containerOffset.top);
      newY = Math.max(0, Math.min(newY, containerHeight));

      markerSaturationValue.css({ left: newX, top: newY });

      selectedHsvColor.saturation = newX / containerWidth;
      selectedHsvColor.value = 1 - newY / containerHeight;

      const hexColor = rgbToHex(hsvToRgb(selectedHsvColor));
      popup.find(".color-picker-option").removeClass("selected");
      input.val(hexColor).trigger("change");
      trigger.css("--selected-color", hexToCSS(hexColor));
      popup.find(".color-picker-hex").val(hexColor).removeClass("is-invalid");
      popup.find(`.color-picker-option[data-color="${escapeHTML(hexColor)}"]`).addClass("selected");
      popup.find(".color-picker-save i").toggleClass("far", !savedColors.includes(hexColor));
    }

    saturationValueContainer
      .on("click", function (ev) {
        moveMarkerSaturationValue(ev.pageX, ev.pageY);
      })
      .on("mousedown", function (ev) {
        markerSaturationValueDragging = true;
        suppressClick = true;
        moveMarkerSaturationValue(ev.pageX, ev.pageY);
        ev.preventDefault();
      })
      .on("touchstart", function (ev) {
        markerSaturationValueDragging = true;
        const position = ev.originalEvent?.touches[0];
        moveMarkerSaturationValue(position?.pageX ?? 0, position?.pageY ?? 0);
        ev.preventDefault();
      });

    $(document)
      .on("mousemove", function (ev) {
        if (markerSaturationValueDragging) {
          moveMarkerSaturationValue(ev.pageX, ev.pageY);
        }
      })
      .on("mouseup", () => {
        markerSaturationValueDragging = false;
      })
      .on("touchmove", function (ev) {
        if (markerSaturationValueDragging) {
          const position = ev.originalEvent?.touches[0];
          moveMarkerSaturationValue(position?.pageX ?? 0, position?.pageY ?? 0);
        }
      })
      .on("touchend touchcancel", function () {
        markerSaturationValueDragging = false;
      });

    markerSaturationValue.on("keydown", ev => {
      let step = 5;
      step = ev.shiftKey ? 20 : step;
      step = ev.altKey ? 1 : step;
      let left = parseInt(markerSaturationValue.css("left"));
      let top = parseInt(markerSaturationValue.css("top"));
      if (["w", "ArrowUp"].includes(ev.key)) {
        top -= step;
        ev.preventDefault();
      }
      else if (["a", "ArrowLeft"].includes(ev.key)) {
        left -= step;
        ev.preventDefault();
      }
      else if (["s", "ArrowDown"].includes(ev.key)) {
        top += step;
        ev.preventDefault();
      }
      else if (["d", "ArrowRight"].includes(ev.key)) {
        left += step;
        ev.preventDefault();
      }
      moveMarkerSaturationValue(left, top, true);
    });

    let markerHueDragging = false;
    const markerHue = popup.find(".color-picker-marker-hue");
    const hueContainer = popup.find(".color-picker-hue");

    function moveMarkerHue(y: number, isAlreadyRelative?: boolean): void {
      const containerOffset = hueContainer.offset()?.top ?? 0;
      const containerHeight = hueContainer.outerHeight() ?? 0;

      let newY = y - (isAlreadyRelative ? 0 : containerOffset);
      newY = Math.max(0, Math.min(newY, containerHeight));

      markerHue.css({ top: newY });

      selectedHsvColor.hue = (newY / containerHeight) * 360;

      const hue = selectedHsvColor.hue;
      const color = `hsl(${hue}, 100%, 50%)`;

      saturationValueContainer.css({
        background: `
        linear-gradient(transparent 0%, black 100%),
        linear-gradient(90deg, white 0%, transparent 100%),
        linear-gradient(${color} 0%, ${color} 100%)`
      });

      const hexColor = rgbToHex(hsvToRgb(selectedHsvColor));
      popup.find(".color-picker-option").removeClass("selected");
      input.val(hexColor).trigger("change");
      trigger.css("--selected-color", hexToCSS(hexColor));
      popup.find(".color-picker-hex").val(hexColor).removeClass("is-invalid");
      popup.find(`.color-picker-option[data-color="${escapeHTML(hexColor)}"]`).addClass("selected");
      popup.find(".color-picker-save i").toggleClass("far", !savedColors.includes(hexColor));
    }

    hueContainer
      .on("mousedown", function (ev) {
        markerHueDragging = true;
        suppressClick = true;
        moveMarkerHue(ev.pageY);
        ev.preventDefault();
      })
      .on("touchstart", function (ev) {
        markerHueDragging = true;
        moveMarkerHue(ev.originalEvent?.touches[0]?.pageY ?? 0);
        ev.preventDefault();
      });

    $(document)
      .on("mousemove", function (ev) {
        if (markerHueDragging) {
          moveMarkerHue(ev.pageY);
        }
      })
      .on("mouseup", () => {
        markerHueDragging = false;
      })
      .on("touchmove", function (ev) {
        if (markerHueDragging) {
          moveMarkerHue(ev.originalEvent?.touches[0]?.pageY ?? 0);
        }
      })
      .on("touchend touchcancel", function () {
        markerHueDragging = false;
      });

    markerHue.on("keydown", ev => {
      let step = 5;
      step = ev.shiftKey ? 20 : step;
      step = ev.altKey ? 1 : step;
      let top = parseInt(markerHue.css("top"));
      if (["w", "ArrowUp"].includes(ev.key)) {
        top -= step;
        ev.preventDefault();
      }
      else if (["s", "ArrowDown"].includes(ev.key)) {
        top += step;
        ev.preventDefault();
      }
      moveMarkerHue(top, true);
    });

    popup.find(".color-picker-hex").on("change", function () {
      let color = $(this).val()?.toLocaleString() ?? "#3bb9ca";
      if (
        /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ||
        ((color === "auto" || color === "Automatisch") && input.attr("data-show-auto-option") === "true")
      ) {
        $(this).removeClass("is-invalid");
        if (/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
          color = "#" + color;
          color = color.toLowerCase();
        }
        if (/^#[0-9a-fA-F]{3}$/.test(color)) {
          color = "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
          color = color.toLowerCase();
        }
        $(this).val(color === "auto" ? "Automatisch" : color);
        popup.find(".color-picker-option").removeClass("selected");
        trigger.css("--selected-color", hexToCSS(color));
        input.val(color).trigger("change");
        popup.find(`.color-picker-option[data-color="${color}"]`).addClass("selected");
        setHsvSelection(color);
        popup.find(".color-picker-save i").toggleClass("far", !savedColors.includes(color));
      }
      else {
        $(this).addClass("is-invalid");
      }
    });

    popup.on("click", ".color-picker-option", function () {
      const color = $(this).data("color");
      popup.find(".color-picker-option").removeClass("selected");
      popup.find(`.color-picker-option[data-color="${color}"]`).addClass("selected");
      input.val(color).trigger("change");
      trigger.css("--selected-color", hexToCSS(color));
      popup.find(".color-picker-hex").val(color === "auto" ? "Automatisch" : color).removeClass("is-invalid");
      setHsvSelection(color);
      popup.find(".color-picker-save i").toggleClass("far", !savedColors.includes(color));
    });

    $(popup).on("click", ".color-picker-save", function (ev) {
      const color = escapeHTML(input.val()?.toString() ?? "auto");
      if (color === "auto") return;
      if (savedColors.includes(color)) {
        savedColors.splice(savedColors.indexOf(color), 1);
      }
      else {
        savedColors.push(color);
      }
      localStorage.setItem("savedColors", JSON.stringify(savedColors));
      savedColorsHtml = `
        <button class="btn btn-tertiary color-picker-save" aria-label="Speichern">
          <i class="fas ${popup.find(`.color-picker-saved [data-color="${input.val()}"]`).length > 0 ? "far" : ""} fa-bookmark" aria-hidden="true">
          </i>
        </button>` + savedColors.map(c =>`
          <button class="color-picker-option fa-solid" data-color="${c}" style="background:${c}" aria-label="${c}"></button>
        `).join("");
      $(".color-picker-saved").html(savedColorsHtml);
      $(".color-picker").each(function () {
        $(this).next()
          .find(`[data-color="${$(this).val()}"]`).addClass("selected")
          .find(".color-picker-save i").toggleClass("far", !savedColors.includes($(this).val()?.toString() ?? ""));
      });
      ev.preventDefault();
    });

    popup.on("click", ev => {
      ev.stopPropagation();
      suppressClick = false;
    });

    $(document).on("click", ev => {
      if (!$(ev.target).closest(".color-picker-popup").length && !suppressClick) {
        popup.hide();
        trigger.css({ zIndex: 0 });
      }
      suppressClick = false;
    });
  });
}

const suggestedColors = [
  {color: "#ffee33", label: "Gelb"},
  {color: "#ff9955", label: "Orange"},
  {color: "#ff4433", label: "Rot"},
  {color: "#ff55aa", label: "Pink"},
  {color: "#9955ff", label: "Lila"},
  {color: "#5599ff", label: "Blau"},
  {color: "#44ddee", label: "Hellblau"},
  {color: "#44dd33", label: "Hellgrün"},
  {color: "#449933", label: "Grün"},
  {color: "#888888", label: "Grau"}
];
const suggestedColorsHtml = suggestedColors.map(o =>
  `<button class="color-picker-option fa-solid" data-color="${o.color}" aria-label="${o.label}"></button>`
).join("");

const savedColors: string[] = JSON.parse(localStorage.getItem("savedColors") ?? "[]") ?? [];
let savedColorsHtml = `
  <button class="btn btn-tertiary color-picker-save" aria-label="Speichern">
    <i class="fas far fa-bookmark" aria-hidden="true"></i>
  </button>` + savedColors.map(c =>`
    <button class="color-picker-option fa-solid" data-color="${c}" aria-label="${c}" style="background:${c}"></button>
  `).join("");

$(() => {
  new MutationObserver(mutationsList => {
    mutationsList.forEach(mutation => {
      $(mutation.addedNodes).each(function () {
        if ($(this).find(".color-picker")) {
          replaceColorPickers();
          $(this).find(".color-picker").each(function () {
            $(this).next().prop("disabled", $(this).prop("disabled"));
          });
        }
      });
      if (mutation.type === "attributes" && mutation.attributeName === "disabled" && $(mutation.target).is(".color-picker")) {
        $(mutation.target).next().prop("disabled", $(mutation.target).prop("disabled"));
      }
    });
  }).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled"]
  });

  replaceColorPickers();
});
