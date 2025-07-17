type ColorRGB = {
  red: number;
  green: number;
  blue: number;
}

type ColorHSV = {
  hue: number;
  saturation: number;
  value: number;
}

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

function replaceColorPickers(): void {
  $(".color-picker:not(.color-picker-replaced)").each(function () {
    const input = $(this);
    const startColor = input.val()?.toString() ?? "#3bb9ca";

    const trigger = $('<div class="rounded cursor-pointer color-picker-trigger">').css("background-color", startColor);
    input.after(trigger).addClass("color-picker-replaced");

    const popup = $($("#color-picker-template").html());

    popup.find(`.color-picker-option[data-color="${$.formatHtml(startColor)}"]`).addClass("selected");
    popup.find(".color-picker-hex").val(startColor);

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
        return (
          // Not enough space below
          yBelow + offset.top + (popup.outerHeight() ?? 0) - ($(window).scrollTop() ?? 0) > ($(window).height() ?? 0) &&
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

      setHslSelection(input.val() as string);
    });

    function setHslSelection(hexColor: string): void {
      if (hexColor === "Automatisch") return;
      const hsvColor = rgbToHsv(hexToRgb(hexColor));
      selectedHslColor = hsvColor;
      markerHue.css({
        top: (hsvColor.hue / 360) * (hueContainer.outerHeight() ?? 0)
      });
      markerSaturationValue.css({
        left: hsvColor.saturation * (saturationValueContainer.outerWidth() ?? 0),
        top: (1 - hsvColor.value) * (saturationValueContainer.outerHeight() ?? 0)
      });
      const gradientColor = `hsl(${hsvColor.hue}, 100%, 50%)`;
      saturationValueContainer.css({
        background: `
        linear-gradient(transparent 0%, black 100%),
        linear-gradient(90deg, white 0%, transparent 100%),
        linear-gradient(${gradientColor} 0%, ${gradientColor} 100%)`
      });
    }

    let selectedHslColor = rgbToHsv(hexToRgb(startColor));

    let suppressClick = false;

    let markerSaturationValueDragging = false;
    const markerSaturationValue = popup.find(".color-picker-marker-saturation-value");
    const saturationValueContainer = popup.find(".color-picker-saturation-value");

    function moveMarkerSaturationValue(x: number, y: number): void {
      const containerOffset = saturationValueContainer.offset() ?? {
        left: 0,
        top: 0
      };
      const containerWidth = saturationValueContainer.outerWidth() ?? 0;
      const containerHeight = saturationValueContainer.outerHeight() ?? 0;

      let newX = x - containerOffset.left;
      newX = Math.max(0, Math.min(newX, containerWidth));

      let newY = y - containerOffset.top;
      newY = Math.max(0, Math.min(newY, containerHeight));

      markerSaturationValue.css({ left: newX, top: newY });

      selectedHslColor.saturation = newX / containerWidth;
      selectedHslColor.value = 1 - newY / containerHeight;

      const hexColor = rgbToHex(hsvToRgb(selectedHslColor));
      popup.find(".color-picker-option").removeClass("selected");
      input.val(hexColor).trigger("change");
      trigger.css("background-color", hexColor);
      popup.find(".color-picker-hex").val(hexColor).removeClass("is-invalid");
      popup.find(`.color-picker-option[data-color="${$.formatHtml(hexColor)}"]`).addClass("selected");
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

    let markerHueDragging = false;
    const markerHue = popup.find(".color-picker-marker-hue");
    const hueContainer = popup.find(".color-picker-hue");

    function moveMarkerHue(y: number): void {
      const containerOffset = hueContainer.offset()?.top ?? 0;
      const containerHeight = hueContainer.outerHeight() ?? 0;

      let newY = y - containerOffset;
      newY = Math.max(0, Math.min(newY, containerHeight));

      markerHue.css({ top: newY });

      selectedHslColor.hue = (newY / containerHeight) * 360;

      const hue = selectedHslColor.hue;
      const color = `hsl(${hue}, 100%, 50%)`;

      saturationValueContainer.css({
        background: `
        linear-gradient(transparent 0%, black 100%),
        linear-gradient(90deg, white 0%, transparent 100%),
        linear-gradient(${color} 0%, ${color} 100%)`
      });

      const hexColor = rgbToHex(hsvToRgb(selectedHslColor));
      popup.find(".color-picker-option").removeClass("selected");
      input.val(hexColor).trigger("change");
      trigger.css("background-color", hexColor);
      popup.find(".color-picker-hex").val(hexColor).removeClass("is-invalid");
      popup.find(`.color-picker-option[data-color="${$.formatHtml(hexColor)}"]`).addClass("selected");
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

    popup.find(".color-picker-hex").on("change", function () {
      let color = $(this).val()?.toLocaleString() ?? "#3bb9ca";
      if (
        /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ||
        (color === "Automatisch" && input.attr("data-show-auto-option") === "true")
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
        $(this).val(color);
        popup.find(".color-picker-option").removeClass("selected");
        trigger.css("background-color", color);
        input.val(color).trigger("change");
        popup.find(`.color-picker-option[data-color="${$.formatHtml(color)}"]`).addClass("selected");
        setHslSelection(color);
      }
      else {
        $(this).addClass("is-invalid");
      }
    });

    popup.find(".color-picker-option").on("click", function () {
      const color = $(this).data("color");
      popup.find(".color-picker-option").removeClass("selected");
      $(this).addClass("selected");
      input.val(color).trigger("change");
      trigger.css("background-color", color);
      popup.find(".color-picker-hex").val(color).removeClass("is-invalid");
      setHslSelection(color);
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

$(() => {
  new MutationObserver(mutationsList => {
    mutationsList.forEach(mutation => {
      $(mutation.addedNodes).each(function () {
        if ($(this).find(".color-picker")) {
          replaceColorPickers();
          $(this).find(".color-picker").each(function () {
            if ($(this).attr("disabled") === null) {
              $(this).next().removeAttr("disabled");
            }
            else {
              $(this).next().attr("disabled", "");
            }
          });
        }
      });
      if (mutation.type === "attributes" && mutation.attributeName === "disabled") {
        if ($(mutation.target).attr("disabled") === null) {
          $(mutation.target).next().removeAttr("disabled");
        }
        else {
          $(mutation.target).next().attr("disabled", "");
        }
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
