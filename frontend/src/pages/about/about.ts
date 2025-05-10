import { addUpdateAllFunction, reloadAll } from "../../global/global.js";

class LicenseDisplay extends HTMLElement {
  constructor() {
    super();
    let content = this.innerHTML
    this.innerHTML = `
      <div class="license-wrapper position-relative my-3 mb-4">
        <div class="license-fade-wrapper">
          <pre class="p-3 rounded border small bg-body-tertiary text-body" style="white-space: pre-wrap;"><span class="license-toggle-placeholder"></span>
${content}</pre>
        </div>
        <button class="license-toggle fa-solid btn btn-sm btn-tertiary position-absolute top-0 end-0 m-3 d-flex align-items-center justify-content-center"
          data-bs-toggle="button">
        </button>
      </div>
    `;
  }
}
customElements.define("license-display", LicenseDisplay);

$(() => {
  addUpdateAllFunction(() => {})
  reloadAll();
})
