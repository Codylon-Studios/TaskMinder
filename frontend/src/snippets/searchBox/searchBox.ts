import { $cloneTemplate } from "../../global/global.js";

export class SearchBox extends HTMLElement {
  private $input!: JQuery<HTMLElement>;
  private initialized = false;

  connectedCallback(): void {
    if (this.initialized) return;
    this.initialized = true;
    $(this).append($cloneTemplate("#search-box-template"));

    const $wrapper = $(this);
    const $input = $wrapper.find(".search-input");
    this.$input = $input;
    const $clear = $wrapper.find(".search-clear");

    $input.on("input", () => {
      $wrapper.toggleClass("search-box-not-empty", $input.val() !== "");
    });

    $clear.on("mousedown", ev => {
      ev.preventDefault();
      $input.val("").trigger("input");
    });
  }
  
  get value(): string {
    return this.$input.val()?.toString() ?? "";
  }

  set value(val: string) {
    this.$input.val(val).trigger("input");
  }

  searchMatches(...content: string[]): boolean {
    for (const query of this.value.split(" ")) {
      if (! content.some(c => c.toLowerCase().includes(query.toLowerCase()))) return false;
    }
    return true;
  }
}

customElements.define("search-box", SearchBox);
