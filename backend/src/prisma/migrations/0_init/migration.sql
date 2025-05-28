-- CreateTable
CREATE TABLE "account" (
    "accountId" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN,

    CONSTRAINT "account_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "account_sessions" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "event" (
    "eventId" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" BIGINT NOT NULL,
    "endDate" BIGINT,
    "lesson" TEXT,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "eventType" (
    "eventTypeId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "eventType_pkey" PRIMARY KEY ("eventTypeId")
);

-- CreateTable
CREATE TABLE "homework10d" (
    "homeworkId" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "assignmentDate" BIGINT NOT NULL,
    "submissionDate" BIGINT NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "homework10d_pkey" PRIMARY KEY ("homeworkId")
);

-- CreateTable
CREATE TABLE "homework10dCheck" (
    "checkId" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "homeworkId" INTEGER NOT NULL,

    CONSTRAINT "homework10dCheck_pkey" PRIMARY KEY ("checkId")
);

-- CreateTable
CREATE TABLE "joinedClass" (
    "joinedClassId" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "joinedClass_pkey" PRIMARY KEY ("joinedClassId")
);

-- CreateTable
CREATE TABLE "joinedTeams" (
    "joinedTeamId" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "joinedTeams_pkey" PRIMARY KEY ("joinedTeamId")
);

-- CreateTable
CREATE TABLE "lesson" (
    "lessonId" SERIAL NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "weekDay" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "room" TEXT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "endTime" BIGINT NOT NULL,

    CONSTRAINT "lesson_pkey" PRIMARY KEY ("lessonId")
);

-- CreateTable
CREATE TABLE "subjects" (
    "subjectId" SERIAL NOT NULL,
    "subjectNameLong" TEXT NOT NULL,
    "subjectNameShort" TEXT NOT NULL,
    "subjectNameSubstitution" TEXT[],
    "teacherGender" TEXT NOT NULL,
    "teacherNameLong" TEXT NOT NULL,
    "teacherNameShort" TEXT NOT NULL,
    "teacherNameSubstitution" TEXT[],

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("subjectId")
);

-- CreateTable
CREATE TABLE "team" (
    "teamId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("teamId")
);

-- CreateTable
CREATE TABLE "timetable" (
    "timetableId" SERIAL NOT NULL,
    "class" INTEGER NOT NULL,
    "content" JSON NOT NULL,
    "lastUpdated" BIGINT NOT NULL,

    CONSTRAINT "timetable_pkey" PRIMARY KEY ("timetableId")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_account_id" ON "account"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "account_username_key" ON "account"("username");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "account_sessions"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "homework10dCheck_accountId_key" ON "homework10dCheck"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "homework10d_check_account_id_homework_id" ON "homework10dCheck"("accountId", "homeworkId");

-- CreateIndex
CREATE UNIQUE INDEX "joinedClass_accountId_key" ON "joinedClass"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "joinedTeams_accountId_key" ON "joinedTeams"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "joined_teams_team_id_account_id" ON "joinedTeams"("teamId", "accountId");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "eventType"("eventTypeId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "homework10d" ADD CONSTRAINT "homework10d_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("subjectId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "homework10dCheck" ADD CONSTRAINT "homework10dCheck_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "homework10dCheck" ADD CONSTRAINT "homework10dCheck_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "homework10d"("homeworkId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "joinedClass" ADD CONSTRAINT "joinedClass_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "joinedTeams" ADD CONSTRAINT "joinedTeams_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("accountId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "joinedTeams" ADD CONSTRAINT "joinedTeams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("teamId") ON DELETE CASCADE ON UPDATE NO ACTION;

