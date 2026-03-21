import { io } from "../vendor/socket/socket.io.esm.min.js";
import { clearedRequestQueue, highlightOffline, updateRequestQueue, user } from "../snippets/navbar/navbar.js";
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
  LessonWithSubject,
  LessonWithSubstitution,
  TimetableData,
  SubjectData,
  SubstitutionsData,
  TeamsData,
  UploadData,
  SocketDataAccessor,
  RawDate,
  AjaxOptions,
  AjaxError,
  SerializedRequest,
  LessonGroupWithEvent,
  UploadRequestsData,
  ClassInfo
} from "./types";
import { updateClassInfo } from "../pages/settings/settings.js";

export const VERSION = "v1";
const REQUEST_QUEUE = "request-queue-" + VERSION;

export const lastCommaRegex = /,(?!.*,)/;
export const weekDaysSo = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const weekDaysMo = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

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

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const request = indexedDB.open("app");

    request.onsuccess = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      res(db);
    };

    request.onerror = event => {
      const error = (event.target as IDBOpenDBRequest).error;
      rej(error!);
    };
  });
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

export enum RelativeDirection {
  PAST,
  FUTURE
}
export function getDisplayDate(raw: RawDate, settings?: { relativeDirection?: RelativeDirection, alwaysDate?: boolean, withTime?: boolean }): string {
  const {
    relativeDirection: weekDaysDirection = RelativeDirection.PAST,
    alwaysDate = true,
    withTime = false
  } = settings ?? {};

  const date = toDate(raw);

  const simpleDateStr = getSimpleDisplayDate(raw);

  const msDate = (new Date(date)).setHours(0, 0, 0, 0);
  const msToday = new Date().setHours(0, 0, 0, 0);
  const daysDiff = (msDate - msToday) / (1000 * 60 * 60 * 24);

  const dateInRange = weekDaysDirection === RelativeDirection.FUTURE ? (daysDiff >= -1 && daysDiff <= 6) : (daysDiff >= -6 && daysDiff <= 2);
  const withDayStr = dateInRange ?
    `<b>${
      {"-1": "gestern", "0": "heute", "1": "morgen", "2": "übermorgen"}[daysDiff] ?? weekDaysSo[date.getDay()]
    }</b>${alwaysDate ? ", " + simpleDateStr : ""}` :

    `<b>${simpleDateStr}</b>`;
  
  const pad = (x: number): string => String(x).padStart(2, "0");
  const withTimeStr = withDayStr + (withTime ? `, um <b>${pad(date.getHours())}:${pad(date.getMinutes())}</b> Uhr` : "");
  
  return withTimeStr;
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

export function $cloneTemplate(selector: string, settings?: {id?: string, dataId?: string, disabled?: boolean}): JQuery<HTMLElement> {
  const { id = crypto.randomUUID(), dataId, disabled } = settings ?? {};

  const t = $(selector);
  if (t.length == null) {
    console.warn(`No <template> with selector "${selector}"!`);
    return $();
  }
  const template = $(selector)[0] as HTMLTemplateElement;
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const children = $(fragment).children();

  children.find('[id*="{{ID}}"]').addBack('[id*="{{ID}}"]').each(function () {
    $(this).attr("id", $(this).attr("id")?.replaceAll("{{ID}}", id) ?? "");
  });
  children.find('[for*="{{ID}}"]').addBack('[for*="{{ID}}"]').each(function () {
    $(this).attr("for", $(this).attr("for")?.replaceAll("{{ID}}", id ) ?? "");
  });

  if (dataId) {
    children.find("[data-id]").addBack("[data-id]").attr("data-id", dataId);
  }

  if (disabled !== undefined) {
    children.find("[disabled]").addBack("[disabled]").attr("disabled", disabled ? "" : null);
  }
  return children;
}

export function cutString(str: string, maxLength: number): string {
  if (str.length < maxLength) return str;
  return str.substring(0, maxLength - 1) + "…";
}

export function toCommaAndAnd(strings: string[]): string {
  return strings.join(", ").replace(/,(?!.*,)/, " und");
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
        teacherNameLong: "-",
        teacherNameSubstitution: []
      };

      return {
        lessonNumber: l.lessonNumber,
        startTime: Number.parseInt(l.startTime),
        endTime: Number.parseInt(l.endTime),
        room: l.subjectId === -1 ? "-" : l.room,

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

  const groupedLessonData = lessonsWithSubstitutions
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

  let lessonGroupsWithEvent: LessonGroupWithEvent[] = groupedLessonData;
    
  currentEventData.filter(e =>
    (currentJoinedTeamsData.includes(e.teamId) || e.teamId === -1) && isSameDay(e.startDate, date)
  ).forEach(e => {
    lessonGroupsWithEvent = lessonGroupsWithEvent.map(l => {
      if (matchesLessonNumber(l.lessonNumber, e.lesson ?? "")) {
        l.events = [...l.events ?? [], e].sort((e1, e2) => e1.eventId - e2.eventId);
      }
      return l;
    });
  });

  function isDoubleLesson(lg1: LessonGroup | TimetableData, lg2?: LessonGroup | TimetableData): boolean {
    function checkForSubstitutions(l1: LessonWithSubstitution, l2: LessonWithSubstitution): boolean {
      if (!(l1.substitution === undefined && l2.substitution === undefined)) {
        if (l1.substitution === undefined || l2.substitution === undefined
          || !checkKeys(l1.substitution, l2.substitution, ["subject", "teacher", "room", "type"])) return false;
      }
      return true;
    }

    function checkForEvents(l1: LessonGroupWithEvent, l2: LessonGroupWithEvent): boolean {
      if (!(l1.events === undefined && l2.events === undefined)) {
        if (l1.events === undefined || l2.events === undefined) return false;
        else {
          if (l1.events.length !== l2.events.length) return false;
          for (const i in l1.events) {
            if (l1.events[i].eventId !== l2.events[i].eventId) return false;
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
    if (!checkForEvents(lg1, lg2)) return false;

    for (const lessonId in lg1.lessons) {
      const l1 = lg1.lessons[lessonId];
      const l2 = lg2.lessons[lessonId];

      if (!checkKeys(l1, l2, ["subjectId", "room"])) return false;
      if (!checkForSubstitutions(l1, l2)) return false;
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
  if (!user.isAuthed) await new Promise(res => {
    user.on("change", res);
  });

  if (!user.classJoined) return;

  if (user.loggedIn) {
    const res = await fetch("/teams/get_joined_teams_data");
    if (!res.ok) throw new Error("HTTP error during fetch of joinedTeams: " + res.status + " " + await res.text());
    joinedTeamsData.set(await res.json(), settings);
  }
  else {
    return new Promise<void>(res => {
      try {
        joinedTeamsData.set(JSON.parse(localStorage.getItem("joinedTeamsData") ?? "[]"), settings);
      }
      catch {
        joinedTeamsData.set([], settings);
      }
      res();
    });
  }
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
  if (!user.isAuthed) await new Promise(res => {
    user.on("change", res);
  });

  if (!user.classJoined) return;

  if (user.loggedIn) {
    // If the user is logged in, get the data from the server
    const res = await fetch("/homework/get_homework_checked_data");
    if (!res.ok) throw new Error("HTTP error during fetch of homeworkCheckedData: " + res.status + " " + await res.text());
    homeworkCheckedData.set(await res.json(), settings);
  }
  else {
    return new Promise<void>(res => {
      try {
        // If the user is not logged in, get the data from the local storage
        homeworkCheckedData.set(JSON.parse(localStorage.getItem("homeworkCheckedData") ?? "[]"), settings);
      }
      catch {
        homeworkCheckedData.set([], settings);
      }
      res();
    });
  }
}

async function loadUploadData(): Promise<void> {
  if (!user.classJoined) return;

  const currentShowAllUploads = await showAllUploads();

  const res = await fetch("/uploads/metadata?all=" + currentShowAllUploads);
  if (!res.ok) throw new Error("HTTP error during fetch of uploadMetadata: " + res.status + " " + await res.text());
  uploadData(await res.json());
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

export function handleStatusCodes(xhr: JQueryXHR, actions?: Record<number, () => unknown>): void {
  if (xhr.status === 500) {
    $("#error-server-toast").toast("show");
  }
  else if (xhr.status === 503) {
    highlightOffline();
  }
  else if (actions?.[xhr.status] === undefined) {
    $("#unknown-error-toast").toast("show");
  }

  const fn = actions?.[xhr.status];
  if (fn !== undefined) fn();
}

export function handleBasicStatusCodes(xhr: JQueryXHR): void {
  handleStatusCodes(xhr);
}

export function openRequestQueueDB(): Promise<IDBDatabase> {
  return new Promise(res => {
    const db = indexedDB.open(REQUEST_QUEUE, 1);

    db.addEventListener("upgradeneeded", () => {
      db.result.createObjectStore("queue", {
        keyPath: "id",
        autoIncrement: true
      });
    });

    db.addEventListener("success", () => {
      res(db.result);
    });
  });
}

async function queueRequest(request: Request): Promise<void> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const serializedReq = {
    url: request.url,
    method: request.method,
    headers,
    body: await request.clone().arrayBuffer()
  };

  const db = await openRequestQueueDB();
  const tx = db.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");
  store.add(serializedReq);
  
  updateRequestQueue();
}

function getDirtyDataAccessor(req: SerializedRequest): DataAccessor<unknown> | null {
  switch ((new URL(req.url, globalThis.location.origin)).pathname) {
  case "/events/add_event":
  case "/events/edit_event":
  case "/events/delete_event":
  case "/events/pin_event": {
    return eventData as DataAccessor<unknown>
  }
  case "/homework/add_homework":
  case "/homework/edit_homework":
  case "/homework/delete_homework":
  case "/homework/pin_homework": {
    return homeworkData as DataAccessor<unknown>
  }
  case "/homework/check_homework": {
    return homeworkCheckedData as DataAccessor<unknown>
  }
  case "/uploads/upload":
  case "/uploads/edit":
  case "/uploads/delete":
  case "/uploads/pin": {
    return uploadData as DataAccessor<unknown>
  }

  case "/teams/set_joined_teams_data": {
    return joinedTeamsData as DataAccessor<unknown>
  }
  case "/class/change_class_name":
  case "/class/change_class_code":
  case "/class/upgrade_test_class":
  case "/class/change_default_permission": {
    return classInfo as DataAccessor<unknown>
  }
  case "/class/kick_class_members":
  case "/class/set_class_members_permission": {
    return classMemberData as DataAccessor<unknown>
  }
  case "/teams/set_teams_data": {
    return teamsData as DataAccessor<unknown>
  }
  case "/events/set_event_type_data": {
    return eventTypeData as DataAccessor<unknown>
  }
  case "/subjects/set_subject_data": {
    return subjectData as DataAccessor<unknown>
  }
  case "/lessons/set_lesson_data": {
    return lessonData as DataAccessor<unknown>
  }

  default:
    return null;
  }
}

async function clearRequestQueue(): Promise<void> {
  const db = await openRequestQueueDB();
  const tx = db.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");

  const allRequest = store.getAll();
  const all = await new Promise<({id: number} & SerializedRequest)[]>(res => {
    allRequest.addEventListener("success", () => {
      res(allRequest.result);
    });
  });

  const reqAndRes: {request: SerializedRequest, response: Response}[] = [];
  const dirtyData: Set<DataAccessor<unknown>> = new Set()

  for (const item of all) {
    const res = await fetch(item.url, { method: item.method, headers: item.headers, body: new Uint8Array(item.body) });
    reqAndRes.push({
      request: item,
      response: res
    });
    const dirtyDataAccessor = getDirtyDataAccessor(item)
    if (dirtyDataAccessor !== null) dirtyData.add(dirtyDataAccessor)
    await new Promise<void>(res => setTimeout(res, 75));
  }

  const clearDb = await openRequestQueueDB();
  clearDb.transaction("queue", "readwrite").objectStore("queue").clear();

  await clearedRequestQueue(reqAndRes);

  if (user.classJoined) {
    for (const d of dirtyData) d.reload()
    socket.connect();
  }
}

export async function ajax(method: string, url: string, options?: AjaxOptions): Promise<Response> {
  const {
    body,
    headers = {},
    queueable = false,
    expectedErrors = []
  } = options ?? {};

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Accept": "application/json",
      "X-CSRF-Token": await csrfToken(),
      ...headers
    }
  };

  if (body) {
    if (body instanceof FormData) {
      fetchOptions.body = body;
    }
    else {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        "Content-Type": "application/json"
      };
      fetchOptions.body = JSON.stringify(body);
    }
  }

  const req = new Request(url, fetchOptions);

  if (navigator.onLine) {
    const timeout = setTimeout(() => {
      $("#error-server-toast").toast("show");
    }, 5000);

    const res = await fetch(req);
    
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();

      const error: AjaxError = {
        status: res.status,
        responseText: text
      };

      if (res.status === 500) {
        $("#error-server-toast").toast("show");
        throw error;
      }
      else if (res.status === 503) {
        highlightOffline();
      }
      else if (expectedErrors.includes(res.status)) {
        throw error;
      }
      else {
        $("#unknown-error-toast").toast("show");
        throw error;
      }
    }

    return res;
  }
  else if (queueable === true) {
    await queueRequest(req);
    return new Response("Request queued, waiting for the network to become available", { status: 202 });
  }
  else {
    highlightOffline();
    return new Response("Request cannot be queued and no network available", { status: 503 });
  }
}

export async function renderAll(): Promise<void> {
  if (!setRenderOnUserChangeListener) {
    user.on("change", reloadAll);
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

export async function reloadAll(): Promise<void> {
  for (const d of socketDataAccessors) await d.reload({ silent: true });
  await renderAll();
}

// Global socket variable that can be accessed from any script
export const socket = io({
  autoConnect: false
});

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
    const res = await fetch(reload);
    if (res.redirected) {
      accessor.set(null, settings);
      return;
    }
    try {
      accessor.set(await res.clone().json(), settings); 
    }
    catch {
      console.warn(
        `Getting the value for the data accessor %c${name}%c produced invalid JSON: `,
        "font-weight: bold",
        "font-weight: normal",
        res.clone()
      );
    }
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
export const classInfo = createSocketDataAccessor<ClassInfo>("classInfo", "updateClassInfo", {
  reload: "/class/get_class_info"
});
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
export const homeworkCheckedData = createSocketDataAccessor<HomeworkCheckedData>("homeworkCheckedData", "updateCheckedHomework", {
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
export const uploadRequestsData = createSocketDataAccessor<UploadRequestsData>("uploadRequestsData", "updateUploadRequests", {
  reload: "/uploads/get_request_data"
});

eventTypeData.on("change", tryForceReloadEventTypeStyles);

$(document).on("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (navigator.onLine) reloadAll();
  }
});

async function onOffline(): Promise<void> {
  $("#offline-hint").show();
  $("#offline-popup").show();
  $("#navbar-reload-button").hide();
  socket.disconnect();

  const db = await openIndexedDB();
  const lastUpdatedReq = db.transaction("meta", "readwrite").objectStore("meta").get("lastUpdated");
  const lastUpdated: number = await new Promise(res => {
    lastUpdatedReq.onsuccess = () => res(lastUpdatedReq.result);
  });
  $("#offline-popup-last-updated").html("<b>Stand: </b>" + getDisplayDate(lastUpdated, {
    relativeDirection: RelativeDirection.PAST, alwaysDate: false, withTime: true
  }));
}

async function onOnline(): Promise<void> {
  $("#offline-hint").hide();
  $("#offline-popup").hide();
  $("#navbar-reload-button").show();
  await user.auth();
  if (! user.classJoined && isSite("main", "events", "homework", "uploads")) {
    document.location.href = document.location.origin + "/join";
  }
  clearRequestQueue();
}

$(globalThis).on("offline", onOffline);
$(globalThis).on("online", () => {
  onOnline();
});
if (navigator.onLine) {
  onOnline();
}
else {
  onOffline();
  updateRequestQueue();
  $("body").css({ display: "flex" });
}

// CSRF token
export const csrfToken = createDataAccessor<string>("csrfToken");

// Show all uploads
export const showAllUploads = createDataAccessor<boolean>("showAllUploads");
showAllUploads(false);

// Show all uploads
export const unsavedChanges = createDataAccessor<boolean>("unsavedChanges");
unsavedChanges(false);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    navigator.serviceWorker.register("/sw.js");
  });
  navigator.serviceWorker.addEventListener("message", ev => {
    console.log("Received msg", ev.data);
  });
}

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
$(document).on("click", "#navbar-reload-button", async function () {
  $(this).find("i").addClass("fa-spin");
  await reloadAll();
  await renderAll();
  $(this).find("i").removeClass("fa-spin fa-rotate").addClass("fa-check text-success");
  $(this).prop("disabled", true);
  setTimeout(() => {
    $(this).find("i").addClass("fa-rotate").removeClass("fa-check text-success");
    $(this).prop("disabled", false);
  }, 1000);
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

$(document).on("focus", 'input[type="text"].autocomplete', function () {
  $(this).val("").removeClass("autocomplete");
});
