import { $cloneTemplate, bytesToText, escapeHTML, isIOS } from "../../global/global.js";

export class RichInput extends HTMLElement {
  static readonly observedAttributes = ["placeholder", "disabled", "type", "value", "readonly"];
  static readonly formAssociated = true;
  protected $input!: JQuery<HTMLElement>;
  private initialized = false;
  private finalInitialized = false;

  protected getTemplateId(): string {
    return "#rich-input-template";
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
      if (this.hasAttribute(a)) this.attributeChangedCallback(a, null, this.getAttribute(a));
    }
  }

  protected onConnect(): void {}
  
  get value(): string {
    return this.$input.val()?.toString() ?? "";
  }

  set value(val: string) {
    if (! this.finalInitialized) return;
    this.$input.val(val);
  }

  focus(): void {
    this.$input[0].focus();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (! this.finalInitialized) return;

    const mirrorAttributes = ["placeholder", "disabled", "type", "value", "readonly"];
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

    const handleClick = (ev: JQuery.TriggeredEvent): void => {
      ev.preventDefault();
      this.$input.val("").trigger("input");
    };
    let pointerDown = false;
    $clear.on("pointerdown", ev => { // We don't want the element to lose focus
      pointerDown = true;
      handleClick(ev);
    });
    $clear.on("click", ev => {
      if (pointerDown) return; 
      handleClick(ev);
      pointerDown = false;
    });
  }

  searchMatches(...content: string[]): boolean {
    for (const query of this.value.split(" ")) {
      if (! content.some(c => c.toLowerCase().includes(query.toLowerCase()))) return false;
    }
    return true;
  }
  
  get value(): string {
    return super.value;
  }

  set value(val: string) {
    $(this).toggleClass("search-box-not-empty", val !== "");
    super.value = val;
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
    
    const handleClick = (ev: JQuery.TriggeredEvent): void => {
      ev.preventDefault();
      visible = !visible;
      this.updateVisibility(visible);
    };
    let pointerDown = false;
    this.$toggle.on("pointerdown", ev => {
      pointerDown = true;
      handleClick(ev);
    });
    this.$toggle.on("click", ev => {
      if (pointerDown) return; 
      handleClick(ev);
      pointerDown = false;
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

    const handleClick = async (ev: JQuery.TriggeredEvent): Promise<void> => {
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
    };
    let pointerDown = false;
    this.$copyBtn.on("pointerdown", ev => {
      pointerDown = true;
      handleClick(ev);
    });
    this.$copyBtn.on("click", ev => {
      if (pointerDown) return; 
      handleClick(ev);
      pointerDown = false;
    });
  }
}

export class DatalistInput extends HTMLElement {
  static readonly observedAttributes = ["options", "disabled", "placeholder", "value", "readonly"];
  static readonly formAssociated = true;

  initialized = false;
  finalInitialized = false;

  private $input!: JQuery<HTMLElement>;

  private options: string[] = [];

  connectedCallback(): void {
    if (this.initialized) return;
    this.initialized = true;
    $(this).append($cloneTemplate("#datalist-input-template"));

    const $wrapper = $(this);
    this.$input = $(this).find(".datalist-input-element");
    const $dropdownMenu = $(this).find(".datalist-input-dropdown-menu");

    this.$input.on("input focus", () => {
      if ((this.$input.val() ?? "") === "") {
        $wrapper.dropdown("hide");
        return;
      }
      
      const query = this.$input.val()?.toString().toLowerCase() ?? "";
      
      const options = this.options
        .filter(o => o.toLowerCase().includes(query))
        .sort((caseSensitiveA, caseSensitiveB) => {
          const a = caseSensitiveA.toLowerCase();
          const b = caseSensitiveB.toLowerCase();
          return a.startsWith(query)
            ? (b.startsWith(query) ? a.localeCompare(b) : -1)
            : (b.startsWith(query) ? 1 : a.localeCompare(b));
        });

      if (options.length === 0) {
        $wrapper.dropdown("hide");
        return;
      }

      $dropdownMenu.empty().append(
        options.map(o =>
          $(`
            <button class="dropdown-item">
              ${escapeHTML(o)}
            </button>
          `).on("pointerdown", () => this.$input.val(o).trigger("input blur"))
        )
      );

      $wrapper.dropdown("show");
    });

    this.$input.on("blur", () => {
      $wrapper.dropdown("hide");
    });

    this.finalInitialized = true;

    for (const a of DatalistInput.observedAttributes) {
      if (this.hasAttribute(a)) this.attributeChangedCallback(a, null, this.getAttribute(a));
    }
  }
  
  get value(): string {
    return this.$input.val()?.toString() ?? "";
  }

  set value(val: string) {
    this.$input.val(val);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (! this.finalInitialized) return;

    if (name === "options") {
      this.options = newValue === null ? [] : newValue.split(/\s*,\s*/g);
    }

    const mirrorAttributes = ["placeholder", "disabled", "value", "readonly"];
    for (const a of mirrorAttributes) {
      if (name === a) {
        this.$input.attr(a, newValue);
        return;
      }
    }
  }
}

export class FileInput extends HTMLElement {
  static readonly observedAttributes = ["accept", "accept-string", "max-number", "max-size"];
  static readonly formAssociated = true;

  private initialized = false;
  private finalInitialized = false;

  private $label!: JQuery<HTMLElement>;
  private $input!: JQuery<HTMLElement>;
  private $preview!: JQuery<HTMLElement>;

  private _files: File[] = [];
  private accepted: string[] = [];
  private minNumber: number = 1;
  private maxNumber: number = Infinity;
  private maxSize: number = Infinity;

  connectedCallback(): void {
    if (this.initialized) return;
    this.initialized = true;

    $(this).append($cloneTemplate("#file-input-template"));
    this.$label = $(this).find(".file-input-label");
    this.$input = $(this).find(".file-input-element");
    this.$preview = $(this).find(".file-input-preview");

    const overLabel = (ev: DragEvent): boolean => $(ev.target as Node).closest(".file-input-label").length !== 0;
    const dataTransferHasFile = (ev: DragEvent): boolean => [...ev.dataTransfer?.items ?? []].some(i => i.kind === "file");

    const globalThisHandler = (ev: DragEvent): void => {
      if (overLabel(ev) && (isIOS || dataTransferHasFile(ev))) {  // ios does weird stuff again
        ev.preventDefault();
      }
      else {
        this.$label.removeClass("file-input-label-focus");
      }
    };
    globalThis.addEventListener("dragover", globalThisHandler);
    globalThis.addEventListener("drop", globalThisHandler);
    
    this.$label.on("dragover", ev => {
      if (! ev.originalEvent) return;
      if (dataTransferHasFile(ev.originalEvent)) {
        this.$label.addClass("file-input-label-focus");
        ev.preventDefault();
      }
    });

    this.$label.on("drop", ev => {
      ev.preventDefault();
      this.$label.removeClass("file-input-label-focus");

      const dt = ev.originalEvent?.dataTransfer;
      if (!dt) return;

      const newFiles = [...dt.items].map(i => i.getAsFile()).filter(f => f !== null);
      this._files.push(...newFiles);
      this.renderFileList();
      this.triggerEvents();
    });

    globalThis.addEventListener("paste", ev => {
      if (this.$label.is(":visible")) {
        const newFiles = ((ev as ClipboardEvent).clipboardData)?.files ?? [];
        this._files.push(...newFiles);
        this.renderFileList();
        ev.preventDefault();
      }
    });

    this.$input.on("change", () => {
      const inputEl = this.$input[0] as HTMLInputElement;
      this._files.push(...inputEl.files ?? []);
      this.renderFileList();
      this.triggerEvents();
      inputEl.value = "";
    });

    this.$preview.on("click", ".file-input-remove-file", ev => {
      this._files.splice(Number.parseInt($(ev.target).closest(".file-input-remove-file").attr("data-id") ?? ""), 1);
      this.renderFileList();
      this.triggerEvents();
    });

    this.finalInitialized = true;

    for (const a of FileInput.observedAttributes) {
      if (this.hasAttribute(a)) this.attributeChangedCallback(a, null, this.getAttribute(a));
    }

    this.renderFileList();
  }

  async renderFileList(): Promise<void> {
    async function filesAreEqual(file1: File, file2: File): Promise<boolean> {
      async function hashFile(file: File): Promise<string> {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        return Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
      }

      for (const key of ["name", "type", "size", "lastModified"] as (keyof File)[]) {
        if (file1[key] !== file2[key]) return false;
      }
      const hash1 = await hashFile(file1);
      const hash2 = await hashFile(file2);
      return hash1 === hash2;
    }

    $(this).find(".file-input-max-number-exceeded-alert").toggle(this._files.length > this.maxNumber);

    const $title = $(this).find(".file-input-preview-title");
    if (this._files.length === 0) {
      $title.attr("data-bs-toggle", null).html("<span class=\"text-secondary\">Noch keine Dateien ausgewählt</span>");
    }
    else {
      $title.attr("data-bs-toggle", "collapse").html(`
        <i class="fa fa-caret-right text-secondary" aria-hidden="true"></i>
        <span class="fw-bold">${this._files.length}</span> Datei${this._files.length > 1 ? "en" : ""} ausgewählt
      `);
    }

    this.$preview.empty();

    for (const fileId in this._files) {
      const file = this._files[fileId];

      const { name, type, size } = file;

      const t = $(`
        <div class="card p-2 flex-row align-items-center justify-content-between">
          <div class="text-break">
            ${escapeHTML(name)}
            <div class="file-input-preview-invalid-type form-text text-danger">
              <i class="fas fa-circle-xmark"></i>
              Dieses Dateiformat wird nicht unterstützt!
            </div>
            <div class="file-input-preview-size-limit-exceeded form-text text-danger">
              <i class="fas fa-circle-xmark"></i>
              Diese Datei ist zu groß! (Max <b>${bytesToText(this.maxSize)}</b>)
            </div>
            <div class="file-input-already-seen form-text text-warning">
              <i class="far fa-circle-question"></i>
              Bist du dir sicher? Du hast diese Datei schon einmal ausgewählt!
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge badge-tertiary rounded-pill border">
              <i class="far fa-floppy-disk me-1" aria-hidden="true"></i>${bytesToText(size)}
            </span>
            <button class="btn btn-sm btn-sm-square btn-danger file-input-remove-file" aria-label="Datei entfernen" data-id="${fileId}">
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      `);
      t.find(".file-input-preview-invalid-type").toggle(!this.accepted.includes(type));
      t.find(".file-input-preview-size-limit-exceeded").toggle(size > this.maxSize);

      t.find(".file-input-already-seen").hide();
      for (const i in this._files) {
        if (i === fileId) break;
        if (await filesAreEqual(file, this._files[i])) {
          t.find(".file-input-already-seen").show();
        }
      }

      this.$preview.append(t);
    }

    this.$preview.scrollTop(this.$preview[0].scrollHeight);
  }

  get files(): File[] {
    return this._files;
  }

  set files(val: File[]) {
    this._files = val;
    this.renderFileList();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (! this.finalInitialized) return;

    if (name === "accept") {
      this.$input.attr("accept", newValue);
      this.accepted = newValue === null ? [] : newValue.replaceAll(" ", "").split(",");
    }
    else if (name === "accept-string") {
      $(this).find(".file-input-accept-string").text(newValue ?? "");
    }
    else if (name === "max-number") {
      this.$input.attr("max", newValue);
      this.maxNumber = newValue === null ? Infinity : Number.parseInt(newValue);
      $(this).find(".file-input-max-number-exceeded-alert b").text(newValue ?? Infinity);
    }
    else if (name === "min-number") {
      this.$input.attr("min", newValue);
      this.minNumber = newValue === null ? 1 : Number.parseInt(newValue);
    }
    else if (name === "max-size") {
      this.maxSize = newValue === null ? Infinity : Number.parseInt(newValue);
    }

    this.renderFileList();
  }

  triggerEvents(): void {
    this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }

  isValid(): boolean {
    return (
      this._files.length <= this.maxNumber
      && this._files.length >= this.minNumber
      && this._files.every(f => this.accepted.includes(f.type) && f.size <= this.maxSize)
    ); 
  }
}

customElements.define("search-box", SearchBox);
customElements.define("password-input", PasswordInput);
customElements.define("copy-input", CopyInput);
customElements.define("datalist-input", DatalistInput);
customElements.define("file-input", FileInput);
