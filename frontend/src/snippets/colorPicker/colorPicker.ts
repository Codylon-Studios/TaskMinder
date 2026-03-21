import { $cloneTemplate, escapeHTML } from "../../global/global.js";
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

  [r, g, b] = [r, g, b].map(val => Math.round((val + m) * 255));

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
  const r = Number.parseInt(hexValue.substring(1, 3), 16);
  const g = Number.parseInt(hexValue.substring(3, 5), 16);
  const b = Number.parseInt(hexValue.substring(5), 16);

  return { red: r, green: g, blue: b };
}

export function rgbToHex({ red: r, green: g, blue: b }: ColorRGB): string {
  return "#" + [r, g, b].map(val => val.toString(16).padStart(2, "0")).join("");
}

function hexToCSS(hexValue: string): string {
  const r = Number.parseInt(hexValue.substring(1, 3), 16);
  const g = Number.parseInt(hexValue.substring(3, 5), 16);
  const b = Number.parseInt(hexValue.substring(5), 16);

  return [r, g, b].toString();
}

const suggestedColors: Record<string, string> = {
  Gelb: "#ffee33",
  Orange: "#ff9955",
  Rot: "#ff4433",
  Pink: "#ff55aa",
  Lila: "#9955ff",
  Blau: "#5599ff",
  Hellblau: "#44ddee",
  Hellgrün: "#44dd33",
  Grün: "#449933",
  Grau: "#888888"
};
const suggestedColorsHtml = Object.entries(suggestedColors).map(e =>
  `<button class="color-picker-option fa-solid" data-color="${e[1]}" aria-label="${e[0]}"></button>`
).join("");

const savedColors: string[] = JSON.parse(localStorage.getItem("savedColors") ?? "[]") ?? [];
let savedColorsHtml = `
  <button class="btn btn-tertiary color-picker-save" aria-label="Speichern">
    <i class="fas far fa-bookmark" aria-hidden="true"></i>
  </button>` + savedColors.map(c =>`
    <button class="color-picker-option fa-solid" data-color="${c}" aria-label="${c}" style="background:${c}"></button>
  `).join("");

class ColorPicker extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["auto-option", "disabled"]; 
  }

  private initialized = false;
  private _value = "";
  private selectedHsvColor!: ColorHSV;

  connectedCallback(): void {
    if (this.initialized) return;
    this.initialized = true;
    $(this).append($cloneTemplate("#color-picker-template"));

    this.attributeChangedCallback("auto-option", null, this.getAttribute("auto-option"));
    this.attributeChangedCallback("disabled", null, this.getAttribute("disabled"));

    const popup = $(this).find(".color-picker-popup");

    popup.find(".color-picker-suggestions").html(suggestedColorsHtml);
    popup.find(".color-picker-saved").html(savedColorsHtml);

    this.setValue(this.getAttribute("value") ?? "#3bb9ca", false);
    this.setHsvSelection(this.value);

    const trigger = $(this).find(".color-picker-trigger").css("--selected-color", hexToCSS(this.value));

    popup.hide();
    trigger.css({ zIndex: 0 });

    trigger.on("click", ev => {
      ev.stopPropagation();
      function getOptimalXPosition(): "left" | "right" {
        return (
          // Not enough space on the right
          xRight + offset.left + (popup.outerWidth() ?? 0) > ($(globalThis).width() ?? 0) &&
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
          yBelow + offset.top + height(popup) - globalThis.scrollY > globalThis.innerHeight - height($(".bottombar")) &&
          // Enough space above
          yAbove + offset.top - ($(globalThis).scrollTop() ?? 0) >= 0
        ) ? "above" : "below";
      }
      
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
    });

    let suppressClick = false;

    let markerSaturationValueDragging = false;
    const markerSaturationValue = popup.find(".color-picker-marker-saturation-value");
    const saturationValueContainer = popup.find(".color-picker-saturation-value");

    const moveMarkerSaturationValue = (x: number, y: number, isAlreadyRelative?: boolean): void => {
      const containerOffset = saturationValueContainer.offset() ?? {
        left: 0,
        top: 0
      };
      const containerWidth = saturationValueContainer.outerWidth() ?? 0;
      const containerHeight = saturationValueContainer.outerHeight() ?? 0;

      let newX = x - (isAlreadyRelative ? 0 : containerOffset.left);
      newX = Math.max(0, Math.min(newX, containerWidth));

      let newY = y - (isAlreadyRelative ? 0 : containerOffset.top);
      newY = Math.max(0, Math.min(newY, containerHeight));

      markerSaturationValue.css({ left: newX, top: newY });

      this.selectedHsvColor.saturation = newX / containerWidth;
      this.selectedHsvColor.value = 1 - newY / containerHeight;

      this.value = rgbToHex(hsvToRgb(this.selectedHsvColor));
    };

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
      let left = Number.parseInt(markerSaturationValue.css("left"));
      let top = Number.parseInt(markerSaturationValue.css("top"));
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

    const moveMarkerHue = (y: number, isAlreadyRelative?: boolean): void => {
      const containerOffset = hueContainer.offset()?.top ?? 0;
      const containerHeight = hueContainer.outerHeight() ?? 0;

      let newY = y - (isAlreadyRelative ? 0 : containerOffset);
      newY = Math.max(0, Math.min(newY, containerHeight));

      markerHue.css({ top: newY });
      
      this.selectedHsvColor.hue = (newY / containerHeight) * 360;
      this.value = rgbToHex(hsvToRgb(this.selectedHsvColor));

      const gradientColor = `hsl(${this.selectedHsvColor.hue}, 100%, 50%)`;
      saturationValueContainer.css({
        background: `
        linear-gradient(transparent 0%, black 100%),
        linear-gradient(90deg, white 0%, transparent 100%),
        linear-gradient(${gradientColor} 0%, ${gradientColor} 100%)`
      });
    };

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
      let top = Number.parseInt(markerHue.css("top"));
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

    popup.find(".color-picker-hex").on("change", () => {
      let color = popup.find(".color-picker-hex").val()?.toString() ?? "#3bb9ca";
      if (
        /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ||
        ((color === "auto" || color === "Automatisch") && this.getAttribute("auto-option") === "true")
      ) {
        popup.find(".color-picker-hex").removeClass("is-invalid");
        if (!color.startsWith("#")) {
          color = "#" + color;
        }
        if (color.length === 4) {
          color = "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        color = color.toLowerCase();
        this.value = color;
        this.setHsvSelection(color);
      }
      else {
        popup.find(".color-picker-hex").addClass("is-invalid");
      }
    });

    popup.on("click", ".color-picker-option", ev => {
      const color = $(ev.target).data("color");
      this.value = color;
      this.setHsvSelection(color);
    });

    $(this).on("click", ".color-picker-save", ev => {
      ev.stopPropagation();
      ev.preventDefault();
      const color = escapeHTML(this.value ?? "auto");
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
          <i class="fas ${popup.find(`.color-picker-saved [data-color="${this.value}"]`).length > 0 ? "far" : ""} fa-bookmark" aria-hidden="true">
          </i>
        </button>` + savedColors.map(c =>`
          <button class="color-picker-option fa-solid" data-color="${c}" style="background:${c}" aria-label="${c}"></button>
        `).join("");
      $(".color-picker-saved").html(savedColorsHtml);
      $(".color-picker").each(function () {
        $(this).next()
          .find(`[data-color="${$(this).val()}"]`).addClass("selected").end()
          .find(".color-picker-save i").toggleClass("far", !savedColors.includes($(this).val()?.toString() ?? ""));
      });
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
  }
  
  private setHsvSelection(color: string): void {
    this.selectedHsvColor = rgbToHsv(hexToRgb(color));

    const rem = Number.parseInt($("html").css("font-size"));

    $(this).find(".color-picker-marker-hue").css({
      top: Math.round((this.selectedHsvColor.hue / 360) * 6 * rem) // container is 6rem high
    });

    const saturationValueContainer = $(this).find(".color-picker-saturation-value");
    $(this).find(".color-picker-marker-saturation-value").css({
      left: Math.round(this.selectedHsvColor.saturation * 8.5 * rem), // container is 8.5rem wide
      top: Math.round((1 - this.selectedHsvColor.value) * 6 * rem) // container is 6rem high
    });

    const gradientColor = `hsl(${this.selectedHsvColor.hue}, 100%, 50%)`;
    saturationValueContainer.css({
      background: `
      linear-gradient(transparent 0%, black 100%),
      linear-gradient(90deg, white 0%, transparent 100%),
      linear-gradient(${gradientColor} 0%, ${gradientColor} 100%)`
    });
  }

  private setValue(val: string, triggerChange: boolean) {
    this._value = val;
    $(this).find(".color-picker-trigger").css("--selected-color", hexToCSS(val));
    $(this).find(".color-picker-hex").val(val).removeClass("is-invalid");
    $(this).find(".color-picker-option").removeClass("selected");
    $(this).find(`.color-picker-option[data-color="${escapeHTML(val)}"]`).addClass("selected");
    $(this).find(".color-picker-save i").toggleClass("far", !savedColors.includes(val));
    if (triggerChange) $(this).trigger("change");
  }

  get value(): string {
    return this._value;
  }

  set value(val: string) {
    this.setValue(val, true);
  }
  
  get disabled(): boolean {
    return this.hasAttribute("disabled");
  }

  set disabled(val) {
    if (val) {
      this.setAttribute("disabled", "");
    }
    else {
      this.removeAttribute("disabled");
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === "auto-option") {
      $(this).find(".color-picker-auto-option-wrapper").toggle(newValue === "true");
    }
    else if (name === "disabled") {
      $(this).find(".color-picker-trigger").prop("disabled", this.hasAttribute("disabled"));
    }
  }
}

$(document).on("click", "label[for]", function (ev) {
  const el = document.getElementById(this.htmlFor);

  if (el?.tagName === "COLOR-PICKER") {
    $(el).filter(":not([disabled])").find(".color-picker-trigger").trigger("click");
    ev.stopPropagation();
  }
});

customElements.define("color-picker", ColorPicker);
