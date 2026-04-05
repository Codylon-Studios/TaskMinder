import { $cloneTemplate } from "../../global/global.js";

export class RichInput extends HTMLElement {
  static readonly observedAttributes = ["placeholder", "type", "value", "readonly"];
  static readonly formAssociated = true;
  private _internals: ElementInternals;
  protected $input!: JQuery<HTMLElement>;
  private initialized = false;
  private finalInitialized = false;

  protected getTemplateId(): string {
    return "#rich-input-template";
  }

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._internals.role = "";
  }

  connectedCallback(): void {
    if (this.initialized) return;
    this.initialized = true;

    $(this).append($cloneTemplate(this.getTemplateId()));
    const $input = $(this).find(".rich-input-element");
    this.$input = $input;

    $(this).on("click", () => {
      this.focus();
    });

    this.onConnect();

    this.finalInitialized = true;

    for (const a of RichInput.observedAttributes) {
      if (this.hasAttribute(a)) this.attributeChangedCallback(a, "", this.getAttribute(a));
    }
  }

  protected onConnect(): void {}
  
  get value(): string {
    return this.$input.val()?.toString() ?? "";
  }

  set value(val: string) {
    this.$input.val(val);
  }

  focus(): void {
    this.$input[0].focus();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (! this.finalInitialized) return;

    const mirrorAttributes = ["placeholder", "type", "value", "readonly"];
    for (const a of mirrorAttributes) {
      if (name === a) {
        this.$input.attr(a, newValue);
        return;
      }
    }
  }
}

export class SearchBox extends RichInput {
  protected getTemplateId(): string {
    return "#search-box-template";
  }

  onConnect(): void {
    const $wrapper = $(this);
    const $clear = $wrapper.find(".search-box-clear");

    this.$input.on("input", () => {
      $wrapper.toggleClass("search-box-not-empty", this.$input.val() !== "");
    });

    $clear.on("mousedown", ev => {
      ev.preventDefault();
      this.$input.val("").trigger("input");
    });
  }

  searchMatches(...content: string[]): boolean {
    for (const query of this.value.split(" ")) {
      if (! content.some(c => c.toLowerCase().includes(query.toLowerCase()))) return false;
    }
    return true;
  }
}

export class PasswordInput extends RichInput {
  protected $toggle!: JQuery<HTMLElement>;

  protected getTemplateId(): string {
    return "#password-input-template";
  }

  onConnect(): void {
    this.$toggle = $(this).find(".password-input-toggle");

    this.$toggle.hide();
    this.$input.on("input", () => {
      this.$toggle.toggle(this.$input.val() !== "");
      if (this.$input.val() === "") {
        visible = false;
        this.updateVisibility(false);
      }
    });

    let visible = false;
    this.$toggle.on("mousedown", ev => {
      ev.preventDefault();
      visible = !visible;
      this.updateVisibility(visible);
    });
  }

  updateVisibility(visible: boolean): void {
    this.$input.attr("type", visible ? "text" : "password");
    this.$toggle.find("i").toggleClass("fa-eye", !visible).toggleClass("fa-eye-slash", visible);
  }
}

export class CopyInput extends RichInput {
  protected $copyBtn!: JQuery<HTMLElement>;

  protected getTemplateId(): string {
    return "#copy-input-template";
  }

  onConnect(): void {
    this.$copyBtn = $(this).find(".copy-input-btn");

    this.$copyBtn.on("mousedown", async ev => {
      ev.preventDefault();
      try {
        await navigator.clipboard.writeText(this.value);
        this.$copyBtn.prop("disabled", true).addClass("text-success")
          .find("i").removeClass("far fa-copy").addClass("fas fa-check");
      }
      catch {
        this.$copyBtn.prop("disabled", true).addClass("text-danger")
          .find("i").removeClass("far fa-copy").addClass("fas fa-xmark");
      }
      setTimeout(() => {
        this.$copyBtn.prop("disabled", false).removeClass("text-success text-danger")
          .find("i").removeClass("fas fa-check fa-xmark").addClass("far fa-copy");
      }, 2000);
    });
  }
}

customElements.define("rich-input", RichInput);
customElements.define("search-box", SearchBox);
customElements.define("password-input", PasswordInput);
customElements.define("copy-input", CopyInput);
