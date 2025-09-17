import { io, Socket } from "../vendor/socket/socket.io.esm.min.js";
import { user } from "../snippets/navbar/navbar.js";

crypto.randomUUID ??= (): `${string}-${string}-${string}-${string}-${string}` => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  }) as `${string}-${string}-${string}-${string}-${string}`;
};

export function getSite(): string {
  return location.pathname.replace(/(^\/)|(\/$)/g, "") || "/";
}

export function isSite(...sites: (string | RegExp)[]): boolean {
  const site = getSite();
  return sites.some(s => {
    return s === site || (s instanceof RegExp && s.test(site));
  });
}

export function msToDisplayDate(ms: number | string): string {
  const num = typeof ms === "string" ? parseInt(ms) : ms;
  const date = new Date(num);

  const day = String(date.getDate());
  const month = String(date.getMonth() + 1);
  const dateStr = `${day}.${month}`;

  const msDate = date.setHours(0, 0, 0, 0);
  const msToday = new Date().setHours(0, 0, 0, 0);
  const diff = (msDate - msToday) / (1000 * 60 * 60 * 24);

  const weekDays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  switch (diff) {
  case -1: return `<b>gestern</b>, ${dateStr}`;
  case 0:  return `<b>heute</b>, ${dateStr}`;
  case 1:  return `<b>morgen</b>, ${dateStr}`;
  case 2:  return `<b>übermorgen</b>, ${dateStr}`;
  default: 
    if (diff < -1 || diff > 6) {
      return `<b>${dateStr}</b>`;
    }
    else {
      return `<b>${weekDays[date.getDay()]}</b>, ${dateStr}`;
    }
  }
}

export function msToInputDate(ms: number | string): string {
  if (ms === "") return "";
  const num = typeof ms === "string" ? parseInt(ms) : ms;
  const date = new Date(num);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

export function dateToMs(dateStr: string): number | null {
  if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getTime();
  }
  else if (dateStr.includes(".")) {
    const [day, month, year] = dateStr.split(".").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getTime();
  }
  return null;
}

export function timeToMs(timeStr: string): number {
  const time = timeStr.split(":").map(v => parseInt(v));
  return (time[0] * 60 + time[1]) * 60 * 1000;
}

export function msToTime(ms: number | string): string {
  const num = typeof ms === "string" ? parseInt(ms) : ms;
  return `${Math.trunc(num / 1000 / 60 / 60)
    .toString()
    .padStart(2, "0")}:${((num / 1000 / 60) % 60).toString().padStart(2, "0")}`;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function deepCompare(a: unknown, b: unknown): boolean {
  function deepCompareArray(a: unknown[], b: unknown[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (! deepCompare(a[i], b[i])) return false;
    }
    return true;
  }
  function deepCompareObject(a: object, b: object): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (! keysB.includes(key)) return false;
      if (! deepCompare((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }
    return true;
  }

  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    return deepCompareArray(a, b);
  }

  if (typeof a === "object" && typeof b === "object") {
    return deepCompareObject(a, b);
  }

  return false;
}

export async function getHomeworkCheckStatus(homeworkId: number): Promise<boolean> {
  return ((await homeworkCheckedData()) ?? []).includes(homeworkId);
}

export async function reloadAll(): Promise<void> {
  const currentReloadAllFn = await reloadAllFn.get();
  await currentReloadAllFn();
  $("body").css({ display: "flex" });
}

let setReloadAllFn = false;
export const reloadAllFn = createDataAccessor<() => Promise<void>>("reloadAllFn");
reloadAllFn.on("update", () => {
  setReloadAllFn = true;
  if (user.changeEvents >= 1) reloadAll();
});

type ColorTheme = "dark" | "light";
export const colorTheme = createDataAccessor<ColorTheme>("colorTheme");

const themeColor = document.createElement("meta");
themeColor.name = "theme-color";
if (localStorage.getItem("colorTheme") === "dark") {
  colorTheme("dark");
}
else if (localStorage.getItem("colorTheme") === "light") {
  colorTheme("light");
}
else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  colorTheme("dark");
}
else {
  colorTheme("light");
}
if ((await colorTheme()) === "light") {
  themeColor.content = "#f8f9fa";
}
else {
  document.getElementsByTagName("html")[0].style.background = "#212529";
  themeColor.content = "#2b3035";
}

// Global socket variable that can be accessed from any script
export const socket: Socket = io();

document.head.appendChild(themeColor);

// DATA
type DataAccessorEventName = "update";
type DataAccessorEventCallback = (...args: unknown[]) => void;
export type DataAccessor<DataType> = {
  (value?: DataType | null): Promise<DataType>;
  get(): Promise<DataType>;
  getCurrent(): DataType | null;
  set(value: DataType | null): DataAccessor<DataType>;
  on(event: DataAccessorEventName, callback: DataAccessorEventCallback): DataAccessor<DataType>;
  trigger(event: DataAccessorEventName, ...args: unknown[]): DataAccessor<DataType>;
  reload(): DataAccessor<DataType>;
}

export function createDataAccessor<DataType>(name: string, reload?: string | (() => void)): DataAccessor<DataType> {
  const eventName = `dataLoaded:${name}`;
  let data: DataType | null = null;
  const _eventListeners = {} as Record<DataAccessorEventName, DataAccessorEventCallback[]>;
  
  const reloadFunction = typeof reload === "string" ? () => {
    $.get(reload, data => {
      accessor.set(data);
    });
  } : reload ?? null;

  const accessor = async (value?: DataType | null): Promise<DataType> => {
    if (value !== undefined) {
      accessor.set(value);
    }
    return accessor.get();
  };

  accessor.get = () => {
    async function getNotNullValue(): Promise<DataType> {
      if (data === null) {
        await new Promise(resolve => {
          $(window).on(eventName, resolve);
        });
        return await getNotNullValue();
      }
      return data;
    }
    return getNotNullValue();
  };

  accessor.getCurrent = () => {
    return data;
  };

  accessor.set = (value: DataType | null) => {
    data = value;
    if (value !== null) {
      $(window).trigger(eventName);
    }
    accessor.trigger("update");
    return accessor;
  };

  accessor.on = (event: DataAccessorEventName, callback: DataAccessorEventCallback) => {
    _eventListeners[event] ??= [];
    _eventListeners[event].push(callback);
    return accessor;
  };

  accessor.trigger = (event: DataAccessorEventName, ...args: unknown[]) => {
    const callbacks = _eventListeners[event];
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
    return accessor;
  };

  accessor.reload = () => {
    if (reloadFunction instanceof Function) {
      accessor.set(null);
      reloadFunction();
    }
    else (() => {
      console.warn(
        `No reload function for the data accessor %c${name}%c defined! Either define one or do not call .reload().`,
        "font-weight: bold",
        "font-weight: normal"
      );
    })();
    return accessor;
  };

  return accessor;
}

// Subject Data
export type SubjectData = {
  subjectId: number;
  subjectNameLong: string;
  subjectNameShort: string;
  subjectNameSubstitution: string[] | null;
  teacherGender: "d" | "w" | "m";
  teacherNameLong: string;
  teacherNameShort: string;
  teacherNameSubstitution: string[] | null;
}[];
export const subjectData = createDataAccessor<SubjectData>("subjectData", "/subjects/get_subject_data");

// Timetable data
export type LessonData = {
  lessonId: number;
  lessonNumber: number;
  weekDay: 0 | 1 | 2 | 3 | 4;
  teamId: number;
  subjectId: number;
  room: string;
  startTime: string;
  endTime: string;
}[];
export const lessonData = createDataAccessor<LessonData>("lessonData", "/lessons/get_lesson_data");

// Homework data
export type HomeworkData = {
  homeworkId: number;
  content: string;
  subjectId: number;
  assignmentDate: string;
  submissionDate: string;
  teamId: number;
}[];
export const homeworkData = createDataAccessor<HomeworkData>("homeworkData", "/homework/get_homework_data");

// Homework checked data
type HomeworkCheckedData = number[];
async function loadHomeworkCheckedData(): Promise<void> {
  if (user.loggedIn) {
    // If the user is logged in, get the data from the server
    $.get("/homework/get_homework_checked_data", data => {
      homeworkCheckedData(data);
    });
  }
  else {
    try {
      // If the user is not logged in, get the data from the local storage
      homeworkCheckedData(JSON.parse(localStorage.getItem("homeworkCheckedData") ?? "[]"));
    }
    catch {
      homeworkCheckedData([]);
    }
  }
}
export const homeworkCheckedData = createDataAccessor<HomeworkCheckedData>("homeworkCheckedData", loadHomeworkCheckedData);

// Substitutions data
type SubstitutionPlan = {
  date: string;
  substitutions: Record<string, string>[];
};
export type CoreSubstitutionsData =
  | {
    plan1: SubstitutionPlan;
    plan2: SubstitutionPlan;
    updated: string;
    }
  | "No data";
export type SubstitutionsData = {
  data: CoreSubstitutionsData;
  realClassName: string | null;
};

export const substitutionsData = createDataAccessor<SubstitutionsData>("substitutionsData", "/substitutions/get_substitutions_data");
async function loadClassSubstitutionsData(): Promise<void> {
  const currentSubstitutionsData = await substitutionsData();
  if (currentSubstitutionsData.data === "No data") {
    classSubstitutionsData({data: "No data", realClassName: currentSubstitutionsData.realClassName});
    return;
  }

  const data = structuredClone(currentSubstitutionsData.data);
  for (let planId = 1 as 1 | 2; planId <= 2; planId++) {
    const key = ("plan" + planId) as "plan1" | "plan2";
    data[key].substitutions = data[key].substitutions.filter((entry: Record<string, string>) =>
      /^10[a-zA-Z]*d[a-zA-Z]*/.test(entry.class) // TODO @Fabian: filter by class
    );
  }
  classSubstitutionsData({data: data, realClassName: currentSubstitutionsData.realClassName});
}
export const classSubstitutionsData = createDataAccessor<SubstitutionsData>("classSubstitutionsData", loadClassSubstitutionsData);

// Joined teams data
export type JoinedTeamsData = number[];
async function loadJoinedTeamsData(): Promise<void> {
  if (user.loggedIn) {
    $.get("/teams/get_joined_teams_data", data => {
      joinedTeamsData(data);
    });
  }
  else {
    try {
      joinedTeamsData(JSON.parse(localStorage.getItem("joinedTeamsData") ?? "[]"));
    }
    catch {
      joinedTeamsData([]);
    }
  }
}
export const joinedTeamsData = createDataAccessor<JoinedTeamsData>("joinedTeamsData", loadJoinedTeamsData);

// Teams data
export type TeamsData = {
  teamId: number;
  name: string;
}[];
export const teamsData = createDataAccessor<TeamsData>("teamsData", "/teams/get_teams_data");

// Event data
export type SingleEventData = {
  eventId: number;
  eventTypeId: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  lesson: string | null;
  teamId: number;
};
export type EventData = SingleEventData[];
export const eventData = createDataAccessor<EventData>("eventData", "/events/get_event_data");

// Event type data
export type EventTypeData = {
  eventTypeId: number;
  name: string;
  color: string;
}[];
export const eventTypeData = createDataAccessor<EventTypeData>("eventTypeData", "/events/get_event_type_data");

// Class member Data
export type ClassMemberData = {
  accountId: number;
  username: string;
  permissionLevel: 0 | 1 | 2 | 3 | null;
}[];
export const classMemberData = createDataAccessor<ClassMemberData>("classMemberData", "/class/get_class_members");

// CSRF token
export const csrfToken = createDataAccessor<string>("csrfToken");

$(async () => {
  const hash = window.location.hash;
  if (hash) {
    setTimeout(() => {
      document.location.href = hash;
    }, 250);
  }

  if (window.location.host === "codylon.de") {
    $(".toast-container").eq(0).append($(`
      <div id="from-codylon-toast" class="toast">
        <div class="toast-header bg-warning text-body-bg">
          <b class="me-auto">Domain wurde geändert</b>
          <button type="button" class="btn-close btn-close-invert" data-bs-dismiss="toast" aria-label="Schließen"></button>
        </div>
        <div class="toast-body">
          Unsere Domain hat von <b>codylon.de</b> zu <b>taskminder.de</b> gewechselt.
          Bitte ändere deine Lesezeichen, Links oder so. Danke!
        </div>
      </div>
    `).toast("show"));
  }

  $('[data-bs-toggle="tooltip"]').tooltip();
  new MutationObserver(mutationsList => {
    mutationsList.forEach(mutation => {
      $(mutation.addedNodes).each(function () {
        $(this).find('[data-bs-toggle="tooltip"]').tooltip();
        $(this).filter('[data-bs-toggle="tooltip"]').tooltip();
      });
    });
  }).observe(document.body, {
    childList: true,
    subtree: true
  });

  try {
    const res = await fetch("/csrf-token");
    if (!res.ok) {
      console.error(`initCSRF: Failed to fetch token - status: ${res.status}`);
    }
    const data = await res.json();
    csrfToken(data.csrfToken);
  }
  catch (error) {
    console.error("initCSRF: Error fetching token:", error);
  }
});

// Update everything on clicking the reload button
$(document).on("click", "#navbar-reload-button", () => {
  reloadAll();
});

user.on("change", async () => {
  if (user.changeEvents > 1 || setReloadAllFn) reloadAll();
});

// Change btn group selections to vertical / horizontal
const smallScreenQuery = window.matchMedia("(max-width: 575px)");

function handleSmallScreenQueryChange(): void {
  if (smallScreenQuery.matches) {
    $(".btn-group-dynamic").removeClass("btn-group").addClass("btn-group-vertical");
  }
  else {
    $(".btn-group-dynamic").addClass("btn-group").removeClass("btn-group-vertical");
  }
}

smallScreenQuery.addEventListener("change", handleSmallScreenQueryChange);

handleSmallScreenQueryChange();

(async () => {
  if ((await colorTheme()) === "light") {
    $("body").attr("data-bs-theme", "light");
  }
  else {
    $("body").attr("data-bs-theme", "dark");
  }

  if (localStorage.getItem("fontSize") === "1") {
    $("html").css("font-size", "19px");
  }
  else if (localStorage.getItem("fontSize") === "2") {
    $("html").css("font-size", "22px");
  }

  $("body").attr("data-high-contrast", localStorage.getItem("highContrast"));
})();

if (!isSite("settings")) {
  const colorThemeSetting = localStorage.getItem("colorTheme") ?? "auto";

  if (colorThemeSetting === "auto") {
    async function updateColorTheme(): Promise<void> {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        colorTheme("dark");
      }
      else {
        colorTheme("light");
      }

      if ((await colorTheme()) === "light") {
        document.getElementsByTagName("html")[0].style.background = "#ffffff";
        document.body.setAttribute("data-bs-theme", "light");
        $('meta[name="theme-color"]').attr("content", "#f8f9fa");
      }
      else {
        document.getElementsByTagName("html")[0].style.background = "#212529";
        document.body.setAttribute("data-bs-theme", "dark");
        $('meta[name="theme-color"]').attr("content", "#2b3035");
      }
    }

    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", updateColorTheme);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateColorTheme);
  }
}

$(document).on("input", ".autocomplete", function () {
  $(this).removeClass("autocomplete");
});

declare global {
  interface JQueryStatic {
    escapeHtml(html: string): string;
    formatHtml(
      html: string,
      options?: {
        multiNewlineStartNewline?: boolean;
      },
    ): string;
  }
}

$.escapeHtml = html => {
  return $("<div>").text(html).html();
};

$.formatHtml = (html, options?) => {
  let escaped = $.escapeHtml(html);
  if (options?.multiNewlineStartNewline) {
    if (/\n/.test(escaped)) escaped = "\n" + escaped;
  }
  const newlines = escaped.replace(/\n/g, "<br>");
  return newlines;
};
