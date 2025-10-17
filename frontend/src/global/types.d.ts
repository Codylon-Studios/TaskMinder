export const __placeholder;

// Color Theme
type ColorTheme = "dark" | "light";

// Month Dates
type MonthDates = Date[][];

// Data Accessors
type DataAccessorEventName = "update";
type DataAccessorEventCallback = (...args: unknown[]) => void;
type DataAccessor<DataType> = {
  (value?: DataType | null): Promise<DataType>;
  get(): Promise<DataType>;
  getCurrent(): DataType | null;
  set(value: DataType | null): DataAccessor<DataType>;
  on(event: DataAccessorEventName, callback: DataAccessorEventCallback): DataAccessor<DataType>;
  trigger(event: DataAccessorEventName, ...args: unknown[]): DataAccessor<DataType>;
  reload(): DataAccessor<DataType>;
}

//  ╭───────────╮
//  │ RESOURCES │
//  ╰───────────╯

// Class Members
type ClassMemberPermissionLevel = 0 | 1 | 2 | 3
type ClassMemberData = {
  accountId: number;
  username: string;
  permissionLevel: ClassMemberPermissionLevel | null;
}[];

// Events
type SingleEventData = {
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

// Event Types
type EventTypeData = {
  eventTypeId: number;
  name: string;
  color: string;
}[];

// Homework
type HomeworkData = {
  homeworkId: number;
  content: string;
  subjectId: number;
  assignmentDate: string;
  submissionDate: string;
  teamId: number;
}[];

// Homework Checked
type HomeworkCheckedData = number[];

// Joined Teams
type JoinedTeamsData = number[];

// Lessons
type LessonData = {
  lessonId: number;
  lessonNumber: number;
  weekDay: 0 | 1 | 2 | 3 | 4;
  teamId: number;
  subjectId: number;
  room: string;
  startTime: string;
  endTime: string;
}[];

// Subjects
type SubjectData = {
  subjectId: number;
  subjectNameLong: string;
  subjectNameShort: string;
  subjectNameSubstitution: string[] | null;
  teacherGender: "d" | "w" | "m";
  teacherNameLong: string;
  teacherNameShort: string;
  teacherNameSubstitution: string[] | null;
}[];

// Substitutions
type SubstitutionEntry = {
  class: string;
  lesson: string;
  room: string;
  subject: string;
  teacher: string;
  teacherOld: string;
  text: string;
  time: string;
  type: string;
}
type SubstitutionPlan = {
  date: string;
  substitutions: SubstitutionEntry[]
};
type SubstitutionsData = {
  data: "No data" | {
    plan1: SubstitutionPlan;
    plan2: SubstitutionPlan;
    updated: string;
  };
  substitutionClassName: string | null;
};

// Teams
type TeamsData = {
  teamId: number;
  name: string;
}[];

// Timetable
type LessonWithSubject = {
  lessonNumber: number;
  subjectId: number,
  subjectNameLong: string;
  subjectNameShort: string;
  subjectNameSubstitution: string[];
  teacherName: string;
  teacherNameSubstitution: string[];
  room: string;
  startTime: number;
  endTime: number;
};
type LessonWithSubstitution = LessonWithSubject & {
  substitution?: SubstitutionEntry
};
type LessonWithEvent = LessonWithSubstitution & {
  events?: SingleEventData[]
};
type LessonGroup = {
  lessonNumber: number;
  startTime: number;
  endTime: number;
  lessons: LessonWithEvent[];
};
type TimetableData = LessonGroup & {
  startLessonNumber: number;
  endLessonNumber: number;
};
