import { reloadAllFn } from "../../global/global.js";
import "./about.scss";

class LicenseDisplay extends HTMLElement {
  constructor() {
    super();
    const content = this.innerHTML;
    const newContent = content.split("\n").map(l => l.trimStart()).join("\n");
    this.innerHTML = `
      <div class="license-wrapper position-relative my-3 mb-4">
        <div class="license-fade-wrapper">
          <pre class="p-3 rounded border small bg-body-tertiary text-body"><span class="license-toggle-placeholder"></span>
${newContent}</pre>
        </div>
        <button class="license-toggle fa-solid btn btn-sm btn-semivisible position-absolute top-0
          end-0 m-3 d-flex align-items-center justify-content-center" data-bs-toggle="button">
        </button>
      </div>
    `;
  }
}
customElements.define("license-display", LicenseDisplay);

$(() => {
  reloadAllFn.set(async () => {
  });
});
