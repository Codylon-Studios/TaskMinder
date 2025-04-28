# Add files (timetable.json and subjects.json)

As our subjects and timetable shouldn't be visible for anyone, the files have been hidden from git using .gitignore. You need to recreate those files manually.  
If you have problems understanding the following, you might want to read [this tutorial on JSON](https://www.hostinger.com/tutorials/what-is-json) or ask an AI assistant.
## Subjects
Start by adding a file `subjects.json` in the `public` folder. Then fill it like this:
```json
[
  { "name": { "long": "Biology", "short": "Bio" }, "teacher": {"gender": "w", "long": "Johnson", "short": "Joh" } },
  { "name": { "long": "Chemistry", "short": "Che" }, "teacher": {"gender": "m", "long": "Smith", "short": "Smi" } },
  ...
]
```
You will see the long name in the larger timetable view and for homework and the short name in the smaller timetable. You will only see the teacher's long name in the larger timetable (the short one is for checking substitutions, so don't worry about it) with a salutation matching the gender ("w" for women, "m" for men).

## Timetable
Start by adding a file `timetable.json` in the `public` folder. Start with this content:
```json
[
  [], [], [], [], []
]
```
Each list stands for one day. You will have to fill each day with the respective lessons. Each lesson looks like this:
```json
{
  "lessonType": "normal",
  "subjectId": 0,
  "room": "123",
  "start": "8:00",
  "end": "8:45"
}
```
We'll cover other lesson types in a moment. `sujectId` references an subject in your `subjects.json` file (their id is just the index in the subject list). `room`, `start` and `end` are just plaintexts displayed in the larger timetable.  
Another lesson type is `rotating`. This is used if the lesson is different each week. The code looks like this:
```json
{
  "lessonType": "rotating",
  "variants": [
    {
      "subjectId": 0,
      "room": "123"
    },
    {
      "subjectId": 1,
      "room": "321"
    }
  ],
  "start": "8:00",
  "end": "8:45"
}
```
Like before, `start` and `end` are plain texts. But now you'll see both options in the timetable, seperated with a "/".  
The last lesson type is `teamed`. It looks pretty similiar to `rotating`:
```json
{
  "lessonType": "teamed",
  "teams": [
    {
      "teamId": 0,
      "subjectId": 0,
      "room": "123"
    },
    {
      "teamId": 1,
      "subjectId": 1,
      "room": "321"
    }
  ],
  "start": "8:00",
  "end": "8:45"
}
```
Now only the users who joined the team with the respective teamId (automatically defined in your `team` table) will see the lesson. If there are multiple lessons matching the joined teams, they will be seperated by a "/". If there are no matching lessons found, all lessons will be shown. If you want to not show this lesson to a certain team, add the following in `"teams"`:
```json
{
  "teamId": 0,
  "subjectId": -1,
  "room": ""
}
```