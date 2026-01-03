import {
  ajax,
  cutString,
  escapeHTML,
  eventData,
  homeworkData,
  isSite,
  openRequestQueueDB,
  uploadData
} from "../../global/global.js";
import { AjaxError, SerializedRequest } from "../../global/types.js";
import { UserEventCallback, UserEventName } from "./types.js";

//REGISTER -- REGISTER -- REGISTER -- REGISTER
async function registerAccount(username: string, password: string): Promise<void> {
  await ajax("POST", "/account/register", {
    body: {
      username: username,
      password: password
    }
  });

  $("#register-success-toast .username").text(username);
  $("#register-success-toast").toast("show");
  $("#login-register-modal").modal("hide");
  
  user.auth();
}

//LOGIN -- LOGIN -- LOGIN -- LOGIN -- LOGIN
async function loginAccount(username: string, password: string): Promise<void> {
  try {
    await ajax("POST", "/account/login", {
      body: {
        username,
        password
      },
      expectedErrors: [401]
    });
    
    $("#login-success-toast .username").text(username);
    $("#login-success-toast").toast("show");
    $("#login-register-modal").modal("hide");

    user.auth();
  }
  catch (e) {
    const err = e as AjaxError;
    if (err.status === 401) {
      $(".login-error-invalid-password").removeClass("d-none").addClass("d-flex");
      $(".login-button").prop("disabled", true);
    }
  }
}

export function resetLoginRegister(): void {
  $(".login-register-element").removeClass("d-none");
  $(".login-element").addClass("d-none");
  $(".register-element").addClass("d-none");

  $(".login-password").val("");
  $(".register-password").val("");
  $(".register-password-repeat").val("");
  $(".register-checkbox").prop("checked", false);

  $(".login-register-next-button").removeClass("d-none");
  $(".login-register-back-button").addClass("d-none");
  $(".login-button").addClass("d-none").prop("disabled", true);
  $(".register-button").addClass("d-none").prop("disabled", true);

  $(".login-register-error-invalid-username").addClass("d-none").removeClass("d-flex");

  $(".login-error-invalid-password").addClass("d-none").removeClass("d-flex");

  $(".register-error-insecure-password").addClass("d-none").removeClass("d-flex");
  $(".register-error-no-matching-passwords").addClass("d-none").removeClass("d-flex");
}

function checkUsername(username: string): boolean {
  return /^\w{4,20}$/.test(username);
}

function checkSecurePassword(password: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}[\]:;"<>,.?/-]).{8,}$/.test(password);
}

async function getRequestDescription(req: SerializedRequest): Promise<string> {
  const rawBody = req.body;
  const textBody = rawBody instanceof ArrayBuffer ? new TextDecoder().decode(rawBody) : rawBody;
  let jsonBody;
  try {
    jsonBody = JSON.parse(textBody);
  }
  catch {
    jsonBody = null;
  }
  switch ((new URL(req.url, globalThis.location.origin)).pathname) {
  case "/events/add_event": {
    return `Ereignis "${cutString(escapeHTML(jsonBody.name), 40)}" hinzufügen`;
  }
  case "/events/edit_event": {
    return `Ereignis "${cutString(escapeHTML(jsonBody.name), 40)}" bearbeiten`;
  }
  case "/events/delete_event": {
    const name = (await eventData()).find(e => e.eventId === jsonBody.eventId)?.name ?? "?";
    return `Ereignis "${cutString(escapeHTML(name), 40)}" löschen`;
  }
  case "/homework/add_homework": {
    return `Hausaufgabe "${cutString(escapeHTML(jsonBody.content), 40)}" hinzufügen`;
  }
  case "/homework/edit_homework": {
    return `Hausaufgabe "${cutString(escapeHTML(jsonBody.content), 40)}" bearbeiten`;
  }
  case "/homework/delete_homework": {
    const content = (await homeworkData()).find(h => h.homeworkId === jsonBody.homeworkId)?.content ?? "?";
    return `Hausaufgabe "${cutString(escapeHTML(content), 40)}" löschen`;
  }
  case "/homework/check_homework": {
    const content = (await homeworkData()).find(h => h.homeworkId === jsonBody.homeworkId)?.content ?? "?";
    return `Hausaufgabe "${cutString(escapeHTML(content), 40)}" ${jsonBody.checkStatus === "true" ? "erledigt" : "nicht erledigt"}`;
  }
  case "/uploads/upload": {
    const match = textBody.match(/name="uploadName"\r?\n\r?\n([\s\S]*?)\r?\n------/);
    const uploadName = match ? match[1].trim() : "?";
    return `Datei "${cutString(escapeHTML(uploadName), 40)}" hochladen`;
  }
  case "/uploads/edit": {
    return `Datei "${cutString(escapeHTML(jsonBody.uploadName), 40)}" bearbeiten`;
  }
  case "/uploads/delete": {
    const uploadName = (await uploadData()).uploads.find(u => u.uploadId === jsonBody.uploadId)?.uploadName ?? "?";
    return `Datei "${cutString(escapeHTML(uploadName), 40)}" löschen`;
  }

  case "/teams/set_joined_teams_data": {
    return "Beigetretene Teams auswählen";
  }
  case "/class/change_class_name": {
    return `Klassennamen zu ${escapeHTML(jsonBody.classDisplayName)} ändern`;
  }
  case "/class/change_class_code": {
    return "Neuen Klassencode anfordern";
  }
  case "/class/upgrade_test_class": {
    return "Testklasse zu normaler Klasse machen";
  }
  case "/class/change_default_permission": {
    return "Standardrolle der Klasse ändern";
  }
  case "/class/kick_class_members": {
    return "Einige Klassenmitglieder entfernen";
  }
  case "/class/set_class_members_permission": {
    return "Berechtigungen einiger Klassenmitglieder ändern";
  }
  case "/teams/set_teams_data": {
    return "Verfügbare Teams bearbeiten";
  }
  case "/events/set_event_type_data": {
    return "Verfügbare Ereignisarten bearbeiten";
  }
  case "/subjects/set_subject_data": {
    return "Verfügbare Fächer bearbeiten";
  }
  case "/lessons/set_lesson_data": {
    return "Stundenplan bearbeiten";
  }

  default:
    return "?";
  }
}

function getResponseFailReason(req: SerializedRequest, res: Response): string {
  const rawResBody = res.body;
  const textResBody = rawResBody instanceof ArrayBuffer ? new TextDecoder().decode(rawResBody) : rawResBody;
  const path = (new URL(req.url, globalThis.location.origin)).pathname;
  if (res.ok) return "";
  if (res.status === 401)
    return "Du hast nicht mehr die Berechtigung, diese Änderung auszuführen. "
      + "Entweder deine Rolle wurde aktualisiert oder du musst dich erneut anmelden";
  if (res.status === 500) return "Auf unserem Server ist ein Problem aufgetreten.";
  if (res.status === 404) {
    const type = "";
    if (path.startsWith("/homework")) return "Die Hausaufgabe";
    if (path.startsWith("/events")) return "Das Ereignis";
    if (path.startsWith("/uploads")) return "Die Datei";
    return type + " wurde in der Zwischenzeit gelöscht.";
  }
  if (res.status === 413) {
    if (path === "/uploads/upload") {
      return "Die Datei ist zu groß (maximal 15MB erlaubt).";
    }
  }
  if (res.status === 400) {
    if (path === "/uploads/upload") {
      if (textResBody === "MIME-Type not supported") return "Das Dateiformat ist nicht unterstützt.";
    }
  }
  return "Ein unbekannter Fehler ist aufgetreten.";
}

export async function updateRequestQueue(): Promise<void> {
  await eventData.init();
  await homeworkData.init();
  
  const db = await openRequestQueueDB();
  const tx = db.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");
  
  const allRequest = store.getAll();
  const requests = await new Promise<({id: number} & SerializedRequest)[]>(res => {
    allRequest.addEventListener("success", () => {
      res(allRequest.result);
    });
  });
  if ($("#offline-queue-circle").text() === "0" && requests.length > 0) highlightOffline();
  $("#offline-queue-title, #offline-queue-description, #offline-queue-circle").toggle(requests.length > 0);
  $(".offline-queue-length").text(requests.length);

  const newList = $("<div></div>");
  
  for (const req of requests) {
    newList.append(`
      <li>${await getRequestDescription(req)}</li>
    `);
  }

  $("#offline-queue-list").empty().append(newList.children());
}

export async function clearedRequestQueue(requestsAndResponses: {request: SerializedRequest, response: Response}[]): Promise<void> {
  updateRequestQueue();

  const newList = $("<div></div>");
  
  for (const reqAndRes of requestsAndResponses) {
    const req = reqAndRes.request;
    const res = reqAndRes.response;
    newList.append(`
      <li class="list-group-item d-flex align-items-center gap-2">
        <i class="fas ${res.ok ? "fa-circle-check text-success" : "fa-circle-xmark text-danger"} ms-n1"
          role="img" aria-label="${res.ok ? "Erfolgreich" : "Fehler"}"></i>
        <div>
          ${await getRequestDescription(req)}
          <div class="form-text text-danger mt-0">${getResponseFailReason(req, res)}</div>
        </div>
      </li>
    `);
  }

  $("#request-queue-cleared-modal-list").empty().append(newList.children());

  if (requestsAndResponses.length > 0) $("#request-queue-cleared-modal").modal("show");
}

$("#nav-logout-button, #offcanvas-account-logout-button").on("click", async () => {
  await ajax("POST", "/account/logout");

  $("#logout-success-toast").toast("show");
    
  user.auth();
});

$(document).on("click", "#navbar-offcanvas .offcanvas-body a", () => {
  $("#navbar-offcanvas").offcanvas("hide");
});

export async function init(): Promise<void> {
  $("#navbar-reload-button").toggle(isSite("uploads", "homework", "main", "events", "settings") && navigator.onLine);
  $("#login-register-button").toggleClass("d-none", isSite("join"));

  //
  //LOGIN -- REGISTER
  //
  $(".login-button").off("click").on("click", () => {
    const username = $(".login-register-username").val()?.toString() ?? "";
    const password = $(".login-password").val()?.toString() ?? "";
    loginAccount(username, password);
  });

  $(".register-button").off("click").on("click", () => {
    const username = $(".login-register-username").val()?.toString() ?? "";
    const password = $(".register-password").val()?.toString() ?? "";
    registerAccount(username, password);
  });

  $("#login-register-modal").off("show.bs.modal").on("show.bs.modal", () => {
    $(".login-register-username").val("");
    $(".login-register-next-button").prop("disabled", true);
    resetLoginRegister();
  });

  // Check username
  $(".login-register-username").off("input").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".login-register-username").val($(this).val() ?? "");

    if (checkUsername($(".login-register-username").val()?.toString() ?? "")) {
      $(".login-register-next-button").prop("disabled", false);
      $(".login-register-error-invalid-username").addClass("d-none").removeClass("d-flex");
    }
  });

  $(".login-register-username").off("change").on("change", function () {
    if (!checkUsername($(".login-register-username").val()?.toString() ?? "")) {
      $(".login-register-next-button").prop("disabled", true);
      $(".login-register-error-invalid-username").removeClass("d-none").addClass("d-flex");
    }
  });

  // Check login password
  $(".login-password").off("input").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".login-password").val($(this).val() ?? "");

    $(".login-error-invalid-password").addClass("d-none").removeClass("d-flex");
    $(".login-button").prop("disabled", false);
  });

  $(".login-password").off("change").on("change", function () {
    $(".login-button").prop("disabled", $(this).val() === "");
  });

  // Check register password

  $(".register-password").off("input").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".register-password").val($(this).val() ?? "");

    if (checkSecurePassword($(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").addClass("d-none");
      $(".register-error-insecure-password").removeClass("d-flex");
    }

    if ($(".register-password").val() === $(".register-password-repeat").val()) {
      $(".register-error-no-matching-passwords").addClass("d-none").removeClass("d-flex");
      $(".register-button").prop("disabled", ! ($(".register-checkbox").prop("checked") && $(".register-password").val() !== ""));
    }
  });

  $(".register-password").off("change").on("change", () => {
    if (!checkSecurePassword($(".register-password").val()?.toString() ?? "")) {
      $(".register-error-insecure-password").removeClass("d-none");
      $(".register-error-insecure-password").addClass("d-flex");
    }

    if ($(".register-password").val() !== $(".register-password-repeat").val() && $(".register-password-repeat").val() !== "") {
      $(".register-error-no-matching-passwords").removeClass("d-none").addClass("d-flex");
    }
  });

  // Check repeated password
  $(".register-password-repeat").off("input").on("input", function () {
    // Sync multiple instances of login possibilites
    $(".register-password-repeat").val($(this).val() ?? "");

    if ($(".register-password").val() === $(".register-password-repeat").val() && $(".register-password").val() !== "") {
      $(".register-button").prop("disabled", ! $(".register-checkbox").prop("checked"));
      $(".register-error-no-matching-passwords").addClass("d-none").removeClass("d-flex");
    }
  });

  $(".register-password-repeat").off("change").on("change", () => {
    if ($(".register-password").val() !== $(".register-password-repeat").val()) {
      $(".register-button").prop("disabled", true);
      $(".register-error-no-matching-passwords").removeClass("d-none").addClass("d-flex");
    }
    if ($(".register-password").val() === "") {
      $(".register-button").prop("disabled", true);
    }
  });

  $(".register-checkbox").off("change").on("change", function () {
    $(".register-checkbox").prop("checked", $(this).prop("checked"));
    $(".register-button").prop("disabled", !(
      $(this).prop("checked") && $(".register-password").val() === $(".register-password-repeat").val() && $(".register-password").val() !== ""
    ));
  });

  $(".login-register-next-button").off("click").on("click", async () => {
    $(".login-register-back-button").removeClass("d-none");

    $(".login-register-element, .login-register-next-button").addClass("d-none");

    const res = await ajax("POST", "/account/checkusername", {
      body: { username: $(".login-register-username").val()?.toString() ?? "" }
    });

    const isTaken = await res.json();
    if (isTaken) {
      $(".login-element").removeClass("d-none");
    }
    else {
      $(".register-element").removeClass("d-none");
    }
  });

  $(".login-register-back-button").off("click").on("click", resetLoginRegister);
}

$(() => {
  user.on("change", (function _() {
    $(".class-joined-content").toggle(user.classJoined ?? false);
    $(".navbar-home-link").attr("href", user.classJoined ? "/main" : "/join");
    if (!isSite("join")) {
      $("#login-register-button").toggle(!user.loggedIn);
    }
    $("#nav-logout-button").toggle(user.loggedIn ?? false);
    $("#offcanvas-account").toggle(user.loggedIn ?? false);
    $("#offcanvas-account-name").text(user.username ?? "");
    return _;
  })());
});

export function highlightOffline(): void {
  $("#offline-hint").addClass("fa-beat");
  setTimeout(() => $("#offline-hint").removeClass("fa-beat"), 1500);
  $("#offline-popup").show();
}

$("#offline-hint").on("click", () => $("#offline-popup").toggle());
$(document).on("click", ev => {
  if ($(ev.target).closest("#offline-wrapper").length === 0) $("#offline-popup").hide();
});

export const $navbarToasts = {
  serverError: $("#error-server-toast"),
  unknownError: $("#unknown-error-toast"),
  notLoggedIn: $("#not-logged-in-toast")
};

export const user = {
  isAuthed: false as boolean,
  loggedIn: null as boolean | null,
  username: null as string | null,
  classJoined: null as boolean | null,
  permissionLevel: 0 as number,
  changeEvents: 0,

  _eventListeners: {} as Record<UserEventName, UserEventCallback[]>,

  async auth(settings?: {silent?: boolean}) {
    await $.get("/account/auth", response => {
      user.isAuthed = true;

      if (response.loggedIn) {
        user.loggedIn = true;
        user.username = response.account.username;
      }
      else {
        user.loggedIn = false;
        user.username = null;
      }
    
      user.classJoined = response.classJoined;
      user.permissionLevel = response.permissionLevel ?? 0;
    
      if (response.loggedIn) {
        user.loggedIn = true;
      }
      else {
        user.loggedIn = false;
        user.username = null;
      }

      user.changeEvents++;
      user.trigger("change", settings);
    });
  },

  async awaitAuthed() {
    if (this.isAuthed) return;
    return new Promise<void>(res => {
      this.on("change", () => {
        if (this.isAuthed) res();
      });
    });
  },

  on(event: UserEventName, callback: UserEventCallback) {
    if (!this._eventListeners[event]) {
      this._eventListeners[event] = [];
    }
    this._eventListeners[event].push(callback);
    return this;
  },

  off(event: UserEventName) {
    this._eventListeners[event] = [];
    return this;
  },

  trigger(event: UserEventName, ...args: unknown[]) {
    for (const cb of this._eventListeners[event]) {
      cb(...args);
    }
    return this;
  }
};
