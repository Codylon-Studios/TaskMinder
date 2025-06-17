import { io, Socket } from "../vendor/socket/socket.io.esm.min.js";
import { user } from "../snippets/navbar/navbar.js";

export function runOnce<F extends (...args: unknown[]) => unknown>(
  fn: F
): (...args: Parameters<F>) => Promise<unknown> {
  async function wrapper(...args: Parameters<F>) {
    if (wrapper.running) return;
    wrapper.running = true;
    const res = await fn(...args);
    wrapper.running = false;
    return res;
  }
  wrapper.running = false;
  return wrapper;
}

export function msToDisplayDate(ms: number | string): string {
  const num = typeof ms === "string" ? parseInt(ms) : ms;
  const date = new Date(num);
  const day = String(date.getDate());
  const month = String(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function msToInputDate(ms: number | string): string {
  if (ms == "") return "";
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

export function msToTime(ms: number): string {
  return `${Math.trunc(ms / 1000 / 60 / 60)
    .toString()
    .padStart(2, "0")}:${((ms / 1000 / 60) % 60).toString().padStart(2, "0")}`;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export async function getHomeworkCheckStatus(homeworkId: number): Promise<boolean> {
  return ((await homeworkCheckedData()) ?? []).includes(homeworkId);
}

export function loadSubjectData() {
  $.get("/subjects/get_subject_data", data => {
    subjectData(data);
  });
}

export function loadLessonData() {
  $.get("/lessons/get_lesson_data", data => {
    lessonData(data);
  });
}

export function loadHomeworkData() {
  $.get("/homework/get_homework_data", data => {
    homeworkData(data);
  });
}

export async function loadHomeworkCheckedData() {
  await userDataLoaded();

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

function loadSubstitutionsData() {
  $.get("/substitutions/get_substitutions_data", data => {
    substitutionsData(data);
  });
}

async function loadClassSubstitutionsData() {
  const currentSubstitutionsData = await substitutionsData();
  if (currentSubstitutionsData === "No data") {
    classSubstitutionsData("No data");
    return;
  }

  const data = structuredClone(currentSubstitutionsData);
  for (let planId = 1 as 1 | 2; planId <= 2; planId++) {
    const key = ("plan" + planId) as "plan1" | "plan2";
    data[key].substitutions = data[key].substitutions.filter((entry: Record<string, string>) =>
      /^10[a-zA-Z]*d[a-zA-Z]*/.test(entry.class)
    );
  }
  classSubstitutionsData(data);
}

export async function loadJoinedTeamsData() {
  await userDataLoaded();

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

export function loadTeamsData() {
  $.get("/teams/get_teams_data", data => {
    teamsData(data);
  });
}

export function loadEventData() {
  $.get("/events/get_event_data", data => {
    eventData(data);
  });
}

export function loadEventTypeData() {
  $.get("/events/get_event_type_data", data => {
    eventTypeData(data);
  });
}

export function userDataLoaded(): Promise<void> {
  return new Promise(resolve => {
    try {
      if (user.loggedIn != undefined && user.loggedIn != null) {
        resolve();
        return;
      }
      $(window).on("userDataLoaded", () => {
        $(window).off("userDataLoaded");
        resolve();
      });
    }
    catch {
      $(window).on("userDataLoaded", () => {
        $(window).off("userDataLoaded");
        resolve();
      });
    }
  });
}

export const reloadAll = (): Promise<void> => {
  return new Promise(resolve => {
    (async resolve => {
      if (updateAllFunctions.length != 0) {
        if (requiredData.includes("subjectData")) {
          subjectData(null);
          loadSubjectData();
        }
        if (requiredData.includes("lessonData")) {
          lessonData(null);
          loadLessonData();
        }
        if (requiredData.includes("homeworkData")) {
          homeworkData(null);
          loadHomeworkData();
        }
        if (requiredData.includes("homeworkCheckedData")) {
          homeworkCheckedData(null);
          loadHomeworkCheckedData();
        }
        if (requiredData.includes("substitutionsData")) {
          substitutionsData(null);
          loadSubstitutionsData();
        }
        if (requiredData.includes("classSubstitutionsData")) {
          classSubstitutionsData(null);
          loadClassSubstitutionsData();
        }
        if (requiredData.includes("joinedTeamsData")) {
          joinedTeamsData(null);
          loadJoinedTeamsData();
        }
        if (requiredData.includes("teamsData")) {
          teamsData(null);
          loadTeamsData();
        }
        if (requiredData.includes("eventData")) {
          eventData(null);
          loadEventData();
        }
        if (requiredData.includes("eventTypeData")) {
          eventTypeData(null);
          loadEventTypeData();
        }

        await updateAll();

        const promises = [];

        promises.push(userDataLoaded());
        await Promise.all(promises);

        $("body").css({ display: "block" });
      }
      resolve();
    })(resolve);
  });
};

export async function updateAll() {
  for (const fn of updateAllFunctions) {
    await fn();
  }
}

export function addUpdateAllFunction(...fn: ((...args: unknown[]) => unknown)[]) {
  updateAllFunctions.push(...fn);
}

let requiredData: string[] = [];
const updateAllFunctions: ((...args: unknown[]) => unknown)[] = [];

type ColorTheme = "dark" | "light";
export const colorTheme = createDataAccessor<ColorTheme>("colorTheme");

const themeColor = document.createElement("meta");
themeColor.name = "theme-color";
if (localStorage.getItem("colorTheme") == "dark") {
  colorTheme("dark");
}
else if (localStorage.getItem("colorTheme") == "light") {
  colorTheme("light");
}
else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  colorTheme("dark");
}
else {
  colorTheme("light");
}
if ((await colorTheme()) == "light") {
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
export function createDataAccessor<T>(name: string) {
  const eventName = `dataLoaded:${name}`;
  let data: T | null = null;
  const _eventListeners = {} as Record<DataAccessorEventName, DataAccessorEventCallback[]>;

  const accessor = async (value?: T | null): Promise<T> => {
    if (value !== undefined) {
      accessor.set(value);
    }
    return accessor.get();
  };

  accessor.get = () => {
    async function getNotNullValue(): Promise<T> {
      if (data == null) {
        await new Promise(resolve => {
          $(window).on(eventName, resolve);
        });
        return await getNotNullValue();
      }
      return data;
    }
    return getNotNullValue();
  };

  accessor.set = (value: T | null) => {
    data = value;
    if (value !== null) {
      $(window).trigger(eventName);
    }
    accessor.trigger("update");
  };

  accessor.on = (event: DataAccessorEventName, callback: DataAccessorEventCallback) => {
    _eventListeners[event] ??= [];
    _eventListeners[event].push(callback);
  };

  accessor.trigger = (event: DataAccessorEventName, ...args: unknown[]) => {
    const callbacks = _eventListeners[event];
    if (callbacks) {
      callbacks.forEach(cb => cb(...args));
    }
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
export const subjectData = createDataAccessor<SubjectData>("subjectData");

// Timetable data
export type LessonData = {
  lessonId: number;
  lessonNumber: number;
  weekDay: 0 | 1 | 2 | 3 | 4;
  teamId: number;
  subjectId: number;
  room: string;
  startTime: number;
  endTime: number;
}[];
export const lessonData = createDataAccessor<LessonData>("lessonData");

// Homework data
type HomeworkData = {
  homeworkId: number;
  content: string;
  subjectId: number;
  assignmentDate: string;
  submissionDate: string;
  teamId: number;
}[];
export const homeworkData = createDataAccessor<HomeworkData>("homeworkData");

// Homework checked data
type HomeworkCheckedData = number[];
export const homeworkCheckedData = createDataAccessor<HomeworkCheckedData>("homeworkCheckedData");

// Substitutions data
type SubstitutionPlan = {
  date: string;
  substitutions: Record<string, string>[];
};
export type SubstitutionsData =
  | {
      plan1: SubstitutionPlan;
      plan2: SubstitutionPlan;
      updated: string;
    }
  | "No data";
export const substitutionsData = createDataAccessor<SubstitutionsData>("substitutionsData");
export const classSubstitutionsData = createDataAccessor<SubstitutionsData>("classSubstitutionsData");

// Joined teams data
export type JoinedTeamsData = number[];
export const joinedTeamsData = createDataAccessor<JoinedTeamsData>("joinedTeamsData");

// Teams data
export type TeamsData = {
  teamId: number;
  name: string;
}[];
export const teamsData = createDataAccessor<TeamsData>("teamsData");

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
type EventData = SingleEventData[];
export const eventData = createDataAccessor<EventData>("eventData");

// Event type data
export type EventTypeData = {
  eventTypeId: number;
  name: string;
  color: string;
}[];
export const eventTypeData = createDataAccessor<EventTypeData>("eventTypeData");

// CSRF token
export const csrfToken = createDataAccessor<string>("csrfToken");

$(async () => {
  switch (location.pathname) {
  case "/homework":
  case "/homework/":
    requiredData = ["subjectData", "homeworkData", "homeworkCheckedData", "teamsData", "joinedTeamsData"];
    break;
  case "/events":
  case "/events/":
    requiredData = ["eventData", "eventTypeData", "teamsData", "joinedTeamsData"];
    break;
  case "/main":
  case "/main/":
    requiredData = [
      "subjectData",
      "lessonData",
      "homeworkData",
      "homeworkCheckedData",
      "substitutionsData",
      "classSubstitutionsData",
      "eventData",
      "eventTypeData",
      "joinedTeamsData"
    ];
    break;
  }

  await reloadAll();

  const hash = window.location.hash;
  if (hash) {
    const $target = $(hash);
    if ($target?.offset() != undefined) {
      $("html").animate({
        scrollTop: ($target.offset()?.top ?? 0) - 70
      });
    }
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
  if (requiredData && updateAllFunctions.length != 0) reloadAll();
});

$(window).on("userDataLoaded", () => {
  if (user.classJoined && ["/settings", "/settings/"].includes(location.pathname)) {
    requiredData = ["teamsData", "joinedTeamsData", "eventTypeData", "subjectData", "lessonData", "substitutionsData"];
    reloadAll();
  }

  let afterFirstEvent = false;
  user.on("login", () => {
    if (afterFirstEvent) reloadAll();
    afterFirstEvent = true;
  });

  user.on("logout", () => {
    if (afterFirstEvent) reloadAll();
    afterFirstEvent = true;
  });
});

// Change btn group selections to vertical / horizontal
const smallScreenQuery = window.matchMedia("(max-width: 575px)");

function handleSmallScreenQueryChange() {
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
  if ((await colorTheme()) == "light") {
    document.body.setAttribute("data-bs-theme", "light");
  }
  else {
    document.body.setAttribute("data-bs-theme", "dark");
  }
})();

if (!["/settings/", "/settings"].includes(location.pathname)) {
  const colorThemeSetting = localStorage.getItem("colorTheme") ?? "auto";

  if (colorThemeSetting == "auto") {
    async function updateColorTheme() {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        colorTheme("dark");
      }
      else {
        colorTheme("light");
      }

      if ((await colorTheme()) == "light") {
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
