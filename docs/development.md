# Development

## Installation

This Guide installs all tools needed for development: NodeJS and npm packages, python3 and pip for mkdocs and the installation of redis and PostgreSQL.

### On Linux (Ubuntu/Debian)

#### Installation of Redis and PostgreSQL

You can find the installation guide for Redis CE (< v8) here: [Install Redis on Linux]  
Once installed, come back to continue.

[Install Redis on Linux]: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/

Download postgreSQL here: [Download page of PostgreSQL]  
Once installed, come back to continue.

[Download page of PostgreSQL]: https://www.postgresql.org/download/

Don't forget to start the services.

#### Installation of NodeJS and npm

First, check if node and npm are already installed.
Open the terminal and type 

``` 
node --version
```
and 

``` 
npm --version
```

For node, it should at least return v20.19.0 or higher, for npm v20.8.2 or higher. You can see the compatible versions here: [NodeJS versions]

[NodeJS Versions]: https://nodejs.org/en/about/previous-releases

#### Clone Repository and install packages
Go to github and fork the repository. 

Find a suitable folder to develop in.
Clone the forked repository:
``` 
git clone https://github.com/your-username/forked-repo.git
cd forked-repo
```
Install all dependencies through
``` 
npm install
```
#### Initialisation of Database 

Before using the Database, you should initialise it, that means to log into the terminal based frontend of PostgreSQL, psql. Then, create a Database where you store the data. it is recommended to change the password for the postgres user.
``` 
sudo -u postgres psql
\password
CREATE DATABASE your_db_name;
```
#### Create the .env file
As it would be dangerous to store your sensitive data plain text in the source code, you need a file called `.env` located directly in your project folder holding all of your enviroment variables. Replace the values beginning with `your_* ` with your actual credentials.
``` 
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=your_db_name
DB_HOST=localhost
NODE_ENV=DEVELOPMENT
REDIS_HOST=redis
REDIS_PORT=6379
SESSION_SECRET=your_session_secret
DSB_USER=your_dsb_user
DSB_PASSWORD=your_dsb_password
CLASSCODE=your_classcode
```
`your_session_secret` and `your_classcode` can be any (ideally secure) passwords as long as they don't change over time. `your_dsb_user` and `your_dsb_password` are the credentials for [DSBmobile](https://www.dsbmobile.de) (used to get substitutions data). If you don't have any credentials, don't worry, you can write anything in the enviroment variables.

#### Start the server
Start the server using
```
nodemon server.js
```
or visually using menu.js
```
node menu.js
```
This will create all tables.
#### Initialize tables:
After starting the server, the tables `eventType` and `team` have been created but are empty. You might want to fill them with suitable data. To do that, execute:
```
sudo -u postgres psql
\c your_db_name
INSERT INTO team (name) VALUES ('Name of a team');
INSERT INTO team (name) VALUES ('Name of another team');
...
INSERT INTO "eventType" (name, color) VALUES ('Name of an event type', 'Hex Color of an event type');
INSERT INTO "eventType" (name, color) VALUES ('Name of another event type', 'Hex Color of another event type');
...
```
#### Add files
As our subjects and timetable shouldn't be visible for anyone, the files have been hidden from git using .gitignore. You need to recreate those files manually.  
If you have problems understanding the following, you might want to read [this tutorial on JSON](https://www.hostinger.com/tutorials/what-is-json) or ask an AI assistant.
##### Subjects
Start by adding a file `subjects.json` in the `public` folder. Then fill it like this:
```
[
  { "name": { "long": "Biology", "short": "Bio" }, "teacher": {"gender": "w", "long": "Johnson", "short": "Joh" } },
  { "name": { "long": "Chemistry", "short": "Che" }, "teacher": {"gender": "m", "long": "Smith", "short": "Smi" } },
  ...
]
```
You will see the long name in the larger timetable view and for homework and the short name in the smaller timetable. You will only see the teacher's long name in the larger timetable (the short one is for checking substitutions, so don't worry about it) with a salutation matching the gender ("w" for women, "m" for men).
##### Timetable
Start by adding a file `timetable.json` in the `public` folder. Start with this content:
```
[
  [], [], [], [], []
]
```
Each list stands for one day. You will have to fill each day with the respective lessons. Each lesson looks like this:
```
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
```
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
```
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
```
{
  "teamId": 0,
  "subjectId": -1,
  "room": ""
}
```

### on Mac
### on Github Codespaces
### on Windows
### Docs development
If you want to install the tools for mkdocs to work on the documentation, follow this youtube guide:
__[How to set up Material for MkDocs]__. You only need the part where he explains the installation. (3:49-5:53)

  [How to set up Material for MkDocs]: https://www.youtube.com/watch?v=xlABhbnNrfI