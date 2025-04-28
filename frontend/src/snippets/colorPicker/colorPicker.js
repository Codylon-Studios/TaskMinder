function hsvToRgb({hue: h, saturation: s, value: v}) {
  h /= 60;
  const c = v * s;
  const x = c * (1 - Math.abs(h % 2 - 1))
  const m = v - c

  let [r, g, b] = 
    h < 1 ? [c, x, 0] :
    h < 2 ? [x, c, 0] :
    h < 3 ? [0, c, x] :
    h < 4 ? [0, x, c] :
    h < 5 ? [x, 0, c] :
            [c, 0, x] ;

  [r, g, b] = [r, g, b].map(val => Math.round((val + m) * 255.0))

  return {red: r, green: g, blue: b};
}

function rgbToHex({red: r, green: g, blue: b}) {
  return "#" + [r, g, b]
    .map(val => val.toString(16).padStart(2, "0"))
    .join("");
}

function hexToRgb(hexValue) {
  let r = parseInt(hexValue.substring(1,3), 16);
  let g = parseInt(hexValue.substring(3,5), 16);
  let b = parseInt(hexValue.substring(5), 16);

  return {red: r, green: g, blue: b};
}

function rgbToHsv({red: r, green: g, blue: b}) {
  r /= 255; g /= 255; b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  if (diff != 0) {
    switch (max) {
      case r: h = (g - b) / diff % 6; break;
      case g: h = (b - r) / diff + 2; break;
      case b: h = (r - g) / diff + 4; break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max == 0 ? 0 : diff / max
  const v = max

  return {hue: h, saturation: s, value: v}
}

function replaceColorPickers() {
  $(".color-picker:not(.color-picker-replaced)").each(function () {
    let input = $(this);
    let startColor = input.val();

    let trigger = $(`<div class="rounded cursor-pointer color-picker-trigger">`).css("background-color", startColor);
    input.after(trigger).addClass("color-picker-replaced");

    let popup = $($("#color-picker-template").html());

    popup.find(`.color-picker-option[data-color="${startColor}"]`).addClass("selected");
    popup.find(".color-picker-hex").val(startColor);

    popup.hide();
    $("body").append(popup);

    trigger.on("click", function (ev) {
      ev.stopPropagation();
      $(".color-picker-popup").not(popup).hide();
      let offset = trigger.offset();
      let yBelow = offset.top + trigger.outerHeight() + 4;
      let yAbove = offset.top - popup.outerHeight() - 4;
      let xLeft = offset.left;
      let xRight = offset.left + trigger.outerWidth() - popup.outerWidth();

      let positionY = "below"; // Standard position
      if (yBelow + popup.outerHeight() - $(window).scrollTop() > $(window).height() && // Not enough space below
         (yAbove - $(window).scrollTop() >= 0)) { // Enough space above
        positionY = "above";
      }

      let positionX = "left"; // Standard position
      if (xLeft + popup.outerWidth() > $(window).width() && // Not enough space on the left
         (xRight - popup.outerWidth() < 0)) { // Enough space on the right
        positionX = "right";
      }

      popup.css({
        top: (positionY == "below") ? yBelow : yAbove,
        left: (positionX == "left") ? xLeft : xRight,
      }).toggle();

      setHslSelection(input.val());
    });

    function setHslSelection(hexColor) {
      let hsvColor = rgbToHsv(hexToRgb(hexColor));
      selectedHslColor = hsvColor;
      markerHue.css({top: hsvColor.hue / 360 * hueContainer.outerHeight()});
      markerSaturationValue.css({
        left: hsvColor.saturation * saturationValueContainer.outerWidth(),
        top: (1 - hsvColor.value) * saturationValueContainer.outerHeight()
      });
      let gradientColor = `hsl(${hsvColor.hue}, 100%, 50%)`;
      saturationValueContainer.css({background: `
        linear-gradient(transparent 0%, black 100%),
        linear-gradient(90deg, white 0%, transparent 100%),
        linear-gradient(${gradientColor} 0%, ${gradientColor} 100%)`})
    }

    let selectedHslColor = rgbToHsv(hexToRgb(startColor));

    let suppressClick = false;

    let markerSaturationValueDragging = false;
    let markerSaturationValue = popup.find(".color-picker-marker-saturation-value");
    let saturationValueContainer = popup.find(".color-picker-saturation-value");

    function moveMarkerSaturationValue(x, y) {
      let containerOffset = saturationValueContainer.offset();
      let containerWidth = saturationValueContainer.outerWidth();
      let containerHeight = saturationValueContainer.outerHeight();

      let newX = x - containerOffset.left;
      newX = Math.max(0, Math.min(newX, containerWidth));

      let newY = y - containerOffset.top;
      newY = Math.max(0, Math.min(newY, containerHeight));

      markerSaturationValue.css({ left: newX, top: newY });

      selectedHslColor.saturation = newX / containerWidth;
      selectedHslColor.value = 1 - newY / containerHeight;

      let hexColor = rgbToHex(hsvToRgb(selectedHslColor));
      popup.find(".color-picker-option").removeClass("selected");
      input.val(hexColor).trigger("change");
      trigger.css("background-color", hexColor);
      popup.find(".color-picker-hex").val(hexColor).removeClass("is-invalid");
      popup.find(`.color-picker-option[data-color="${hexColor}"]`).addClass("selected");
    }

    saturationValueContainer.on("click", function (ev) {
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
      let position = ev.originalEvent.touches[0]
      moveMarkerSaturationValue(position.pageX, position.pageY);
      ev.preventDefault();
    });

    $(document).on("mousemove", function (ev) {
      if (markerSaturationValueDragging) {
        moveMarkerSaturationValue(ev.pageX, ev.pageY);
      }
    }).on("mouseup", () => {
      markerSaturationValueDragging = false;
    })
    .on("touchmove", function (ev) {
      if (markerSaturationValueDragging) {
        let position = ev.originalEvent.touches[0]
        moveMarkerSaturationValue(position.pageX, position.pageY);
      }
    }).on("touchend touchcancel", function () {
      markerSaturationValueDragging = false;
    });


    let markerHueDragging = false;
    let markerHue = popup.find(".color-picker-marker-hue");
    let hueContainer = popup.find(".color-picker-hue");

    function moveMarkerHue(y) {
      let containerOffset = hueContainer.offset().top;
      let containerHeight = hueContainer.outerHeight();

      let newY = y - containerOffset;
      newY = Math.max(0, Math.min(newY, containerHeight));

      markerHue.css({ top: newY });

      selectedHslColor.hue = newY / containerHeight * 360

      let hue = selectedHslColor.hue;
      let color = `hsl(${hue}, 100%, 50%)`;

      saturationValueContainer.css({background: `
        linear-gradient(transparent 0%, black 100%),
        linear-gradient(90deg, white 0%, transparent 100%),
        linear-gradient(${color} 0%, ${color} 100%)`})

      let hexColor = rgbToHex(hsvToRgb(selectedHslColor));
      popup.find(".color-picker-option").removeClass("selected");
      input.val(hexColor).trigger("change");
      trigger.css("background-color", hexColor);
      popup.find(".color-picker-hex").val(hexColor).removeClass("is-invalid");
      popup.find(`.color-picker-option[data-color="${hexColor}"]`).addClass("selected");
    }

    hueContainer.on("mousedown", function (ev) {
      markerHueDragging = true;
      suppressClick = true;
      moveMarkerHue(ev.pageY);
      ev.preventDefault();
    })
    .on("touchstart", function (ev) {
      markerHueDragging = true;
      moveMarkerHue(ev.originalEvent.touches[0].pageY);
      ev.preventDefault();
    });

    $(document).on("mousemove", function (ev) {
      if (markerHueDragging) {
        moveMarkerHue(ev.pageY);
      }
    }).on("mouseup", () => {
      markerHueDragging = false;
    })
    .on("touchmove", function (ev) {
      if (markerHueDragging) {
        moveMarkerHue(ev.originalEvent.touches[0].pageY);
      }
    }).on("touchend touchcancel", function () {
      markerHueDragging = false;
    });

    popup.find(".color-picker-hex").on("change", function () {
      let color = $(this).val();
      if (! /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
        $(this).addClass("is-invalid");
      }
      else {
        $(this).removeClass("is-invalid");
        if (/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
          color = "#" + color;
        }
        if (/^#[0-9a-fA-F]{3}$/.test(color)) {
          color = "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        color = color.toLowerCase();
        $(this).val(color);
        popup.find(".color-picker-option").removeClass("selected");
        trigger.css("background-color", color);
        input.val(color).trigger("change");
        popup.find(`.color-picker-option[data-color="${color}"]`).addClass("selected");
        setHslSelection(color);
      }
    });

    popup.find(".color-picker-option").on("click", function () {
      let color = $(this).data("color");
      popup.find(".color-picker-option").removeClass("selected");
      $(this).addClass("selected");
      input.val(color).trigger("change");
      trigger.css("background-color", color);
      popup.find(".color-picker-hex").val(color).removeClass("is-invalid");
      setHslSelection(color);
    });

    $(document).on("click", (ev) => {
      if (! $(ev.target).closest(".color-picker-popup").length &&
         ! suppressClick) {
        popup.hide();
      }
      suppressClick = false;
    });
  });
}

$(() => {
  new MutationObserver((mutationsList) => {
    mutationsList.forEach((mutation) => {
      $(mutation.addedNodes).each(function () {
        if ($(this).find(".color-picker")) {
          replaceColorPickers();
        }
      });
    });
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  replaceColorPickers();
})
