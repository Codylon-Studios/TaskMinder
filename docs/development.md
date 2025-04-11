# Development

## Installation

This Guide installs all tools needed for development: NodeJS and npm packages, python3 and pip for mkdocs and the installation of redis and PostgreSQL.

### on Linux (ubuntu/debian)

#### Installation of redis and PostgreSQL

You can find the installation guide for Redis CE (< v8) here: [Redis Installation for Linux apt]
Once installed, come back to continue.

[Redis Installation for Linux apt]: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/

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
#### Add files
As there is sensitive data contained in the code, it has been hidden from git using .gitignore. You need to recreate those files manually.
#### Create the .env file
As it would be dangerous to store your sensitive data plain text in the source code, you need a file (.env) holding all of your enviroment variables. Replace the values beginning with ```your_* ``` with your actual credentials.
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
DSB_PASSWORD=your_passcode
CLASSCODE=your_classcode
```
#### Initialize necessary tables:
Before starting the server, you still need to create two essential tables:
```
node ./src/initTables/eventType.js
node ./src/initTables/team.js
```
Execute these cmds in your project folder.

#### Start the server
Start the server using
```
nodemon server.js
```
or using the menu.js
```
node menu.js
```


### on Mac
### on Github Codespaces
### on Windows
### Docs development
If you want to install the tools for mkdocs to work on the documentation, follow this youtube guide:
__[How to set up Material for MkDocs]__. You only need the part where he explains the installation. (3:49-5:53)

  [How to set up Material for MkDocs]: https://www.youtube.com/watch?v=xlABhbnNrfI