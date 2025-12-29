import { io } from "../vendor/socket/socket.io.esm.min.js";
import { user } from "../snippets/navbar/navbar.js";
import {
  ClassMemberData,
  DataAccessor,
  DataAccessorEventCallback,
  DataAccessorEventName,
  EventData,
  EventTypeData,
  HomeworkCheckedData,
  HomeworkData,
  JoinedTeamsData,
  LessonData,
  LessonGroup,
  LessonWithEvent,
  LessonWithSubject,
  LessonWithSubstitution,
  TimetableData,
  SubjectData,
  SubstitutionsData,
  TeamsData,
  UploadData,
  SocketDataAccessor,
  RawDate
} from "./types";

export const lastCommaRegex = /,(?!.*,)/;

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

export function onlyThisSite<T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => T | null {
  const site = getSite();
  return function onlyThisSiteWrapper(...args: unknown[]) {
    if (isSite(site)) return fn(...args);
    return null;
  };
}

export function isValidSite(site: string): boolean {
  return [
    "404",
    "about",
    "events",
    "homework",
    "join",
    "main",
    "settings",
    "uploads"
  ].includes(site);
}

export function registerSocketListeners(listeners: Record<string, () => unknown>): void {
  setTimeout(() => { // Somehow necessary as otherwise socket isn't declared (only in uploads somehow)
    const site = getSite();
    for (const listener of Object.keys(listeners)) {
      socket.on(listener, () => {
        if (isSite(site)) {
          listeners[listener]();
        }
      });
    }
  }, 0);
}

export function toDate(raw: RawDate): Date {
  return new Date(raw instanceof Date ? raw : (typeof raw === "number" ? raw : Number.parseInt(raw)));
}

export function getSimpleDisplayDate(raw: RawDate): string {
  const date = toDate(raw);

  const day = String(date.getDate());
  const month = String(date.getMonth() + 1);
  return `${day}.${month}`;
}

export function getDisplayDate(raw: RawDate): string {
  const date = toDate(raw);

  const dateStr = getSimpleDisplayDate(raw);

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

export function msToInputDate(raw: RawDate): string {
  if (raw === "") return "";
  const date = toDate(raw);
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
  const time = timeStr.split(":").map(v => Number.parseInt(v));
  return (time[0] * 60 + time[1]) * 60 * 1000;
}

export function msToTime(ms: number | string): string {
  const num = typeof ms === "string" ? Number.parseInt(ms) : ms;
  return `${Math.trunc(num / 1000 / 60 / 60)
    .toString()
    .padStart(2, "0")}:${((num / 1000 / 60) % 60).toString().padStart(2, "0")}`;
}

export function dateDaysDifference(raw1: RawDate, raw2: RawDate): number {
  const date1 = toDate(raw1);
  const date2 = toDate(raw2);
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

  const diffMs = utc1 - utc2;
  return diffMs / (1000 * 60 * 60 * 24);
}

export function getTimeLeftString(timeLeft: number): string {
  if (timeLeft < 60 * 60 * 1000) {
    const mins = Math.ceil(timeLeft / 60 / 1000);
    return mins + " Minute" + (mins > 1 ? "n" : "");
  }
  else {
    const hours = Math.floor(timeLeft / 60 / 60 / 1000);
    const mins = Math.ceil((timeLeft % (60 * 60 * 1000)) / 60 / 1000);
    if (mins === 0) {
      return hours + " Stunde" + (hours > 1 ? "n" : "");
    }
    else {
      return hours + " Stunde" + (hours > 1 ? "n und " : " und ") + mins + " Minute" + (mins > 1 ? "n" : "");
    }
  }
}

export function isSameDay(raw1: RawDate, raw2: RawDate): boolean {
  const date1 = toDate(raw1);
  const date2 = toDate(raw2);
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

export function escapeHTML(str: string): string {
  return str.replace(/[&<>"']/g, char => {
    switch (char) {
    case "&": return "&amp;";
    case "<": return "&lt;";
    case ">": return "&gt;";
    case '"': return "&quot;";
    case "'": return "&#39;";
    default: return char;
    }
  });
}

export function getInputValue(element: JQuery<HTMLElement>, fallback?: string): string {
  return element.val()?.toString() ?? (fallback ?? "");
}

export function getCirclePath(cx: number, cy: number, r: number, a: number, full?: boolean): string {
  if (full) {
    return `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx} ${cy + r} A${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const x = cx + r * Math.sin(Math.PI / 180 * a);
  const y = cy - r * Math.cos(Math.PI / 180 * a);
  return `M${cx} ${cy} l0 ${-r} A${r} ${r} 0 ${a % 360 > 180 ? 1 : 0} 1 ${x} ${y} Z`;
}

export async function loadTimetableData(date: Date): Promise<TimetableData[]> {
  await joinedTeamsData.init(); await subjectData.init(); await lessonData.init(); await classSubstitutionsData.init(); await eventData.init();

  const currentJoinedTeamsData = await joinedTeamsData();
  const currentSubjectData = await subjectData();
  const currentLessonData = await lessonData();
  const currentSubstitutionsData = await classSubstitutionsData();
  const currentEventData = (await eventData());

  const lessonsWithSubject: LessonWithSubject[] = currentLessonData.filter(l => l.weekDay === date.getDay() - 1)
    .filter(l => (currentJoinedTeamsData.includes(l.teamId) || l.teamId === -1))
    .map(l => {
      const subject = currentSubjectData.find(s => s.subjectId === l.subjectId) ?? {
        subjectId: -1,
        subjectNameLong: "Pause",
        subjectNameShort: "Pause",
        subjectNameSubstitution: [],
        teacherGender: "d",
        teacherNameLong: "",
        teacherNameSubstitution: []
      };

      return {
        lessonNumber: l.lessonNumber,
        startTime: Number.parseInt(l.startTime),
        endTime: Number.parseInt(l.endTime),
        room: l.room,

        subjectId: l.subjectId,
        subjectNameLong: subject.subjectNameLong,
        subjectNameShort: subject.subjectNameShort,
        subjectNameSubstitution: subject.subjectNameSubstitution ?? [],
        teacherName:
          (subject.teacherGender === "w" ? "Frau " : "") +
          (subject.teacherGender === "m" ? "Herr " : "") +
          subject.teacherNameLong,
        teacherNameSubstitution: subject.teacherNameSubstitution ?? []
      };
    });

  let lessonsWithSubstitutions: LessonWithSubstitution[] = lessonsWithSubject;
  
  if (currentSubstitutionsData.data !== "No data") {
    let planId;
    if (isSameDay(date, dateToMs(currentSubstitutionsData.data.plan1.date) ?? 0)) {
      planId = 1;
    }
    else if (isSameDay(date, dateToMs(currentSubstitutionsData.data.plan2.date) ?? 0)) {
      planId = 2;
    }
    if (planId) {
      const substitutions = currentSubstitutionsData.data["plan" + planId as "plan1" | "plan2"].substitutions;
      for (const substitution of substitutions) {
        lessonsWithSubstitutions = lessonsWithSubstitutions.map(l => {
          if (
            matchesLessonNumber(l.lessonNumber, substitution.lesson)
            && (l.teacherNameSubstitution.includes(substitution.teacherOld) || l.subjectId === -1)
          ) {
            return {
              ...l,
              substitution
            };
          }
          return l;
        });
      }
    }
  }

  let lessonsWithEvents: LessonWithEvent[] = lessonsWithSubstitutions;
  
  currentEventData.filter(e =>
    (currentJoinedTeamsData.includes(e.teamId) || e.teamId === -1)
    && isSameDay(e.startDate, date)
  ).forEach(e => {
    lessonsWithEvents = lessonsWithEvents.map(l => {
      if (matchesLessonNumber(l.lessonNumber, e.lesson ?? "")) {
        l.events = [...l.events ?? [], e].sort((e1, e2) => e1.eventId - e2.eventId);
      }
      return l;
    });
  });

  const groupedLessonData = lessonsWithEvents
    .reduce((acc: LessonGroup[], curr) => {
      const group = acc.find(l => l.lessonNumber === curr.lessonNumber);
      if (group) {
        group.lessons = [...group.lessons, curr].sort((l1, l2) => l1.subjectId - l2.subjectId);
      }
      else {
        acc.push({
          lessonNumber: curr.lessonNumber,
          startTime: curr.startTime,
          endTime: curr.endTime,
          lessons: [curr]
        });
      }
      return acc;
    }, [])
    .sort((group1, group2) => group1.lessonNumber - group2.lessonNumber);

  function isDoubleLesson(lg1: LessonGroup | TimetableData, lg2?: LessonGroup | TimetableData): boolean {
    function checkForSubstitutions(l1: LessonWithSubstitution, l2: LessonWithSubstitution): boolean {
      if (!(l1.substitution === undefined && l2.substitution === undefined)) {
        if (l1.substitution === undefined || l2.substitution === undefined
          || !checkKeys(l1.substitution, l2.substitution, ["subject", "teacher", "room", "type"])) return false;
      }
      return true;
    }

    function checkForEvents(l1: LessonWithEvent, l2: LessonWithEvent): boolean {
      if (!(l1.events === undefined && l2.events === undefined)) {
        if (l1.events === undefined || l2.events === undefined) return false;
        else {
          for (const event in l1.events) {
            if (!checkKeys(l1.events[event], l2.events[event], ["eventId"])) return false;
          }
        };
      }
      return true;
    }
    
    const checkKeys = <T>(obj1: T, obj2: T, keys: (keyof T)[]): boolean => {
      return keys.every(key => obj1[key] === obj2[key]);
    };

    if (! (lg1 && lg2)) return false;
    if (lg1.lessons.length !== lg2?.lessons.length) return false;

    for (const lessonId in lg1.lessons) {
      const l1 = lg1.lessons[lessonId];
      const l2 = lg2.lessons[lessonId];

      if (!checkKeys(l1, l2, ["subjectId", "room"])) return false;

      if (!checkForSubstitutions(l1, l2)) return false;
      if (!checkForEvents(l1, l2)) return false;
    }
    return true;
  }

  const multiLessonGroups: TimetableData[] = groupedLessonData.reduce((acc: TimetableData[], curr) => {
    const last = acc.at(-1);
    const isFirst = last === undefined;

    if (isFirst || ! isDoubleLesson(curr, last)) {
      acc.push({
        startLessonNumber: curr.lessonNumber,
        endLessonNumber: curr.lessonNumber,
        lessonTimes: [{startTime: curr.startTime, endTime: curr.endTime}],
        ...curr
      });
    }
    else {
      last.endLessonNumber = curr.lessonNumber;
      last.endTime = curr.endTime;
      last.lessonTimes.push({startTime: curr.startTime, endTime: curr.endTime});
    }

    return acc;
  }, []);

  return multiLessonGroups;
}

async function loadJoinedTeamsData(settings?: {silent?: boolean}): Promise<void> {
  return new Promise<void>(res => {
    if (user.loggedIn) {
      $.get("/teams/get_joined_teams_data", data => {
        joinedTeamsData.set(data, settings);
        res();
      });
    }
    else {
      try {
        joinedTeamsData.set(JSON.parse(localStorage.getItem("joinedTeamsData") ?? "[]"), settings);
      }
      catch {
        joinedTeamsData.set([], settings);
      }
      res();
    }
  }); 
}

async function loadClassSubstitutionsData(): Promise<void> {
  await substitutionsData.init();

  const currentSubstitutionsData = await substitutionsData();
  if (currentSubstitutionsData.data === "No data") {
    classSubstitutionsData({data: "No data", classFilterRegex: currentSubstitutionsData.classFilterRegex});
    return;
  }

  const data = structuredClone(currentSubstitutionsData.data);
  for (let planId = 1 as 1 | 2; planId <= 2; planId++) {
    const key = ("plan" + planId) as "plan1" | "plan2";
    data[key].substitutions = data[key].substitutions.filter((entry: Record<string, string>) =>
      new RegExp(currentSubstitutionsData.classFilterRegex ?? "").test(entry.class)
    );
  }
  classSubstitutionsData({data: data, classFilterRegex: currentSubstitutionsData.classFilterRegex});
}

async function loadHomeworkCheckedData(settings?: {silent?: boolean}): Promise<void> {
  return new Promise<void>(res => {
    if (user.loggedIn) {
      // If the user is logged in, get the data from the server
      $.get("/homework/get_homework_checked_data", data => {
        homeworkCheckedData.set(data, settings);
        res();
      });
    }
    else {
      try {
        // If the user is not logged in, get the data from the local storage
        homeworkCheckedData.set(JSON.parse(localStorage.getItem("homeworkCheckedData") ?? "[]"), settings);
      }
      catch {
        homeworkCheckedData.set([], settings);
      }
      res();
    }
  });
}

async function loadUploadData(): Promise<void> {
  const _showAllUploads = await showAllUploads();
  return new Promise<void>(res => {
    $.get("/uploads/metadata?all=" + _showAllUploads, data => {
      uploadData(data);
      res();
    });
  });
}

export async function getHomeworkCheckStatus(homeworkId: number): Promise<boolean> {
  return ((await homeworkCheckedData()) ?? []).includes(homeworkId);
}

export async function tryForceReloadEventTypeStyles(): Promise<void> {
  if (! user.classJoined) return;
  const currentEventTypeData = (await eventTypeData());
  currentEventTypeData.sort((a, b) => a.eventTypeId - b.eventTypeId);
  const cache = JSON.parse(localStorage.getItem("eventTypeDataCache") ?? "{}");
  const eventTypeString = JSON.stringify(Object.fromEntries(currentEventTypeData.map(e => [e.eventTypeId, e.color])));
  if (eventTypeString !== cache.data) {
    cache.data = eventTypeString;
    cache.date = Date.now();
  }
  $("#event-type-styles").attr("href", "/events/event_type_styles?v=" + cache.date);
  localStorage.setItem("eventTypeDataCache", JSON.stringify(cache));
}

export function matchesLessonNumber(lessonNumber: number, testForLessonNumbers: string): boolean {
  if (testForLessonNumbers.includes("-")) {
    const [start, end] = testForLessonNumbers.replace(" ", "").split("-").map(Number);
    if (start > lessonNumber || lessonNumber > end) {
      return false;
    }
  }
  else if (Number.parseInt(testForLessonNumbers) !== lessonNumber) {
    return false;
  }
  return true;
}

export async function renderAll(): Promise<void> {
  if (!setRenderOnUserChangeListener) {
    user.on("change", async () => {
      for (const d of socketDataAccessors) d.reload({ silent: true });
      renderAll();
    });
    setRenderOnUserChangeListener = true;
  }
  const s = getSite();
  const mod = await import(`../../pages/${s}/${s}.js`);
  if (mod.renderAllFn) {
    await mod.renderAllFn();
  }
  $("body").css({ display: "flex" });
}
let setRenderOnUserChangeListener = false;

// Global socket variable that can be accessed from any script
export const socket = io();

export enum ColorTheme {
  DARK = "dark",
  LIGHT = "light"
};
export const colorTheme = createDataAccessor<ColorTheme>("colorTheme");

const themeColor = document.createElement("meta");
themeColor.name = "theme-color";
if (localStorage.getItem("colorTheme") === ColorTheme.DARK) {
  colorTheme(ColorTheme.DARK);
}
else if (localStorage.getItem("colorTheme") === ColorTheme.LIGHT) {
  colorTheme(ColorTheme.LIGHT);
}
else if (globalThis.matchMedia("(prefers-color-scheme: dark)").matches) {
  colorTheme(ColorTheme.DARK);
}
else {
  colorTheme(ColorTheme.LIGHT);
}
if ((await colorTheme()) === ColorTheme.LIGHT) {
  themeColor.content = "#f8f9fa";
}
else {
  document.getElementsByTagName("html")[0].style.background = "#212529";
  themeColor.content = "#2b3035";
}

document.head.appendChild(themeColor);

// Data accessors
export function createDataAccessor<DataType>(name: string, config?: {
  reload?: string | ((settings?: {silent?: boolean}) => Promise<void>)
}): DataAccessor<DataType> {
  let data: DataType | null = null;
  const _eventListeners = {} as Record<DataAccessorEventName, DataAccessorEventCallback[]>;
  let _initialized = false;
  
  const reload = config?.reload;

  const reloadFunction = typeof reload === "string" ? async (settings?: {silent?: boolean}) => {
    return new Promise<void>(res => {
      $.get(reload, data => {
        accessor.set(data, settings);
        res();
      });
    });
  } : reload ?? null;

  const accessor = async (value?: DataType | null): Promise<DataType> => {
    if (value !== undefined) {
      accessor.set(value);
    }
    return accessor.get();
  };

  accessor.get = () => {
    if (data !== null) {
      return Promise.resolve(data);
    }

    return new Promise<DataType>(resolve => {
      const handler = (): void => {
        if (data !== null) {
          accessor.off("change", handler);
          resolve(data);
        }
      };

      accessor.on("change", handler);
    });
  };

  accessor.getCurrent = () => {
    return data;
  };

  accessor.set = (value: DataType | null, settings?: {silent?: boolean}) => {
    data = value;
    if (!settings?.silent) {
      accessor.trigger("update");
    }
    accessor.trigger("change");
    _initialized = true;
    return accessor;
  };

  accessor.on = (event: DataAccessorEventName, callback: DataAccessorEventCallback) => {
    _eventListeners[event] ??= [];
    _eventListeners[event].push(callback);
    return accessor;
  };

  accessor.off = (event: DataAccessorEventName, callback?: DataAccessorEventCallback) => {
    if (!_eventListeners[event]) return accessor;

    _eventListeners[event] = callback ? _eventListeners[event].filter(cb => cb !== callback) : [];

    return accessor;
  };

  accessor.trigger = (event: DataAccessorEventName, ...args: unknown[]) => {
    const callbacks = _eventListeners[event];
    if (callbacks) {
      for (const cb of callbacks) cb(...args);
    }
    return accessor;
  };

  accessor.reload = async (settings?: {silent?: boolean}) => {
    if (typeof reloadFunction === "function") {
      data = null;
      await reloadFunction(settings);
      _initialized = true;
    }
    else {
      console.warn(
        `No reload function for the data accessor %c${name}%c defined! Either define one or do not call .reload().`,
        "font-weight: bold",
        "font-weight: normal"
      );
    };
    return accessor;
  };

  accessor.init = async () => {
    if (!_initialized) {
      if (typeof reloadFunction === "function") {
        data = null;
        await reloadFunction();
        _initialized = true;
      }
      else {
        console.warn(
          `No reload function for the data accessor %c${name}%c defined! Either define one or do not call .init().`,
          "font-weight: bold",
          "font-weight: normal"
        );
      };
    }
    return accessor;
  };

  accessor.isInitialized = () => {
    return _initialized;
  };

  return accessor;
}

const socketDataAccessors: DataAccessor<unknown>[] = [];
export function createSocketDataAccessor<DataType>(name: string, socketEv: string, config?: {
  reload?: string | ((settings?: {silent?: boolean}) => Promise<void>)
}): SocketDataAccessor<DataType> {
  const accessor = createDataAccessor<DataType>(name, config);

  socketDataAccessors.push(accessor as DataAccessor<unknown>);

  socket.on(socketEv, () => {
    accessor.reload();
  });

  return accessor;
}

// Resources
export const classMemberData = createSocketDataAccessor<ClassMemberData>("classMemberData", "updateMembers", {
  reload: "/class/get_class_members"
});
export const classSubstitutionsData = createDataAccessor<SubstitutionsData>("classSubstitutionsData", {
  reload: loadClassSubstitutionsData
});
export const eventData = createSocketDataAccessor<EventData>("eventData", "updateEvents", {
  reload: "/events/get_event_data"
});
export const eventTypeData = createSocketDataAccessor<EventTypeData>("eventTypeData", "updateEventTypes", {
  reload: "/events/get_event_type_data"
});
export const homeworkData = createSocketDataAccessor<HomeworkData>("homeworkData", "updateHomework", {
  reload: "/homework/get_homework_data"
});
export const homeworkCheckedData = createSocketDataAccessor<HomeworkCheckedData>("homeworkCheckedData", "updateHomework", {
  reload: loadHomeworkCheckedData
});
export const joinedTeamsData = createSocketDataAccessor<JoinedTeamsData>("joinedTeamsData", "updateJoinedTeams", {
  reload: loadJoinedTeamsData
});
export const lessonData = createSocketDataAccessor<LessonData>("lessonData", "updateTimetables", {
  reload: "/lessons/get_lesson_data"
});
export const subjectData = createSocketDataAccessor<SubjectData>("subjectData", "updateSubjects", {
  reload: "/subjects/get_subject_data"
});
export const substitutionsData = createDataAccessor<SubstitutionsData>("substitutionsData", {
  reload: "/substitutions/get_substitutions_data"
});
export const teamsData = createSocketDataAccessor<TeamsData>("teamsData", "updateTeams", {
  reload: "/teams/get_teams_data"
});
export const uploadData = createSocketDataAccessor<UploadData>("uploadData", "updateUploads", {
  reload: loadUploadData
});

eventTypeData.on("change", tryForceReloadEventTypeStyles);

$(document).on("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    for (const d of socketDataAccessors) d.reload({ silent: true });
    renderAll();
  }
});

// CSRF token
export const csrfToken = createDataAccessor<string>("csrfToken");

// Show all uploads
export const showAllUploads = createDataAccessor<boolean>("showAllUploads");
showAllUploads(false);

// Show all uploads
export const unsavedChanges = createDataAccessor<boolean>("unsavedChanges");
unsavedChanges(false);

$('[data-bs-toggle="tooltip"]').tooltip();
new MutationObserver(mutationsList => {
  for (const mutation of mutationsList) {
    $(mutation.addedNodes).each(function () {
      $(this).find('[data-bs-toggle="tooltip"]').tooltip();
      $(this).filter('[data-bs-toggle="tooltip"]').tooltip();
    });
  };
}).observe(document.body, {
  childList: true,
  subtree: true
});

$(document).on("shown.bs.toast", ev => {
  const $toast = $(ev.target);
  if ($toast.attr("data-bs-autohide") === "false") {
    return;
  }

  const $bar = $toast.find(".toast-progress-bar");
  if (!$bar.length) return;

  $bar.addClass("playing");

  $toast.on("mouseenter.toastProgress", () => {
    $bar.removeClass("playing");
  });

  $toast.on("mouseleave.toastProgress", () => {
    setTimeout(() => {
      $bar.addClass("playing");
    }, 1000);
  });

  $toast.one("hidden.bs.toast", () => $toast.off(".toastProgress"));
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

setTimeout(() => {
  const fillRow = (): void => {
    styles.push(...Array.from({ length: 16 }, (_, i) => `margin: 0 0.25rem; color: ${colors[i % 2]};`));
  };
  const fillBorder = (type: number, emphasize?: boolean): void => {
    styles.push(
      `margin: 0 0.25rem; color: ${colors[type]};`,
      emphasize ? "font-weight: bold; color: #dc3545;" : "",
      `margin: 0 0.25rem; color: ${colors[(type + 1) % 2]};`
    );
  };
  const colors = ["#3bb9ca", "#70d8e6"];
  const styles: string[] = [];

  const fullRow = "⬤".repeat(16);
  const line1 = "⬤%c       Hello curious person!       ⬤";
  const line2 = "⬤%c      Please don't hack us ;)      ⬤";
  const line3 = "⬤%c  You can leave feedback / bugs !  ⬤";
  const line4 = "⬤%c  https://taskminder.de/feedback#  ⬤";
  const line5 = "⬤%c Please be precise, fellow dev! :D ⬤";
  const line6 = "⬤%c Don't know what this is? Bye Bye! ⬤";
  const line7 = "⬤%c (Evil people can steal your data) ⬤";

  fillRow();
  fillBorder(1);
  fillBorder(0);
  fillBorder(1);
  fillBorder(0);
  fillBorder(1);
  fillBorder(0, true);
  fillBorder(1, true);
  fillRow();

  const text = [fullRow, line1, line2, line3, line4, line5, line6, line7, fullRow].join("\n").replaceAll("⬤", "%c⬤");

  console.info(text, ...styles);
}, 1);

// Update everything on clicking the reload button
$(document).on("click", "#navbar-reload-button", () => {
  for (const d of socketDataAccessors) d.reload({ silent: true });
  renderAll();
});

// Change btn group selections to vertical / horizontal
const smallScreenQuery = globalThis.matchMedia("(max-width: 575px)");

function handleSmallScreenQueryChange(): void {
  if (smallScreenQuery.matches) {
    $(".btn-group-dynamic").removeClass("btn-group").addClass("btn-group-vertical");
  }
  else {
    $(".btn-group-dynamic").addClass("btn-group").removeClass("btn-group-vertical");
  }
}

smallScreenQuery.addEventListener("change", handleSmallScreenQueryChange);
$(globalThis).on("pushstate", handleSmallScreenQueryChange);

handleSmallScreenQueryChange();

(async () => {
  if ((await colorTheme()) === ColorTheme.LIGHT) {
    $("body").attr("data-bs-theme", ColorTheme.LIGHT);
  }
  else {
    $("body").attr("data-bs-theme", ColorTheme.DARK);
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
      if (globalThis.matchMedia("(prefers-color-scheme: dark)").matches) {
        colorTheme(ColorTheme.DARK);
      }
      else {
        colorTheme(ColorTheme.LIGHT);
      }

      if ((await colorTheme()) === ColorTheme.LIGHT) {
        document.getElementsByTagName("html")[0].style.background = "#ffffff";
        document.body.dataset.bsTheme = ColorTheme.LIGHT;
        $('meta[name="theme-color"]').attr("content", "#f8f9fa");
      }
      else {
        document.getElementsByTagName("html")[0].style.background = "#212529";
        document.body.dataset.bsTheme = ColorTheme.DARK;
        $('meta[name="theme-color"]').attr("content", "#2b3035");
      }
    }

    globalThis.matchMedia("(prefers-color-scheme: light)").addEventListener("change", updateColorTheme);
    globalThis.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", updateColorTheme);
  }
}

$(document).on("input", ".autocomplete", function () {
  $(this).removeClass("autocomplete");
});
