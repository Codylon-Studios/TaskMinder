--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Debian 14.18-1.pgdg120+1)
-- Dumped by pg_dump version 14.18 (Debian 14.18-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account (
    "accountId" integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "isAdmin" boolean
);


ALTER TABLE public.account OWNER TO postgres;

--
-- Name: account_accountId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."account_accountId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."account_accountId_seq" OWNER TO postgres;

--
-- Name: account_accountId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."account_accountId_seq" OWNED BY public.account."accountId";


--
-- Name: account_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.account_sessions OWNER TO postgres;

--
-- Name: event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event (
    "eventId" integer NOT NULL,
    "eventTypeId" integer NOT NULL,
    name text NOT NULL,
    description text,
    "startDate" bigint NOT NULL,
    "endDate" bigint,
    lesson text,
    "teamId" integer NOT NULL
);


ALTER TABLE public.event OWNER TO postgres;

--
-- Name: eventType; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."eventType" (
    "eventTypeId" integer NOT NULL,
    name text NOT NULL,
    color text
);


ALTER TABLE public."eventType" OWNER TO postgres;

--
-- Name: eventType_eventTypeId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."eventType_eventTypeId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."eventType_eventTypeId_seq" OWNER TO postgres;

--
-- Name: eventType_eventTypeId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."eventType_eventTypeId_seq" OWNED BY public."eventType"."eventTypeId";


--
-- Name: event_eventId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."event_eventId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."event_eventId_seq" OWNER TO postgres;

--
-- Name: event_eventId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."event_eventId_seq" OWNED BY public.event."eventId";


--
-- Name: homework10d; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.homework10d (
    "homeworkId" integer NOT NULL,
    content text NOT NULL,
    "subjectId" integer NOT NULL,
    "assignmentDate" bigint NOT NULL,
    "submissionDate" bigint NOT NULL,
    "teamId" integer NOT NULL
);


ALTER TABLE public.homework10d OWNER TO postgres;

--
-- Name: homework10dCheck; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."homework10dCheck" (
    "checkId" integer NOT NULL,
    "accountId" integer NOT NULL,
    "homeworkId" integer NOT NULL
);


ALTER TABLE public."homework10dCheck" OWNER TO postgres;

--
-- Name: homework10dCheck_checkId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."homework10dCheck_checkId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."homework10dCheck_checkId_seq" OWNER TO postgres;

--
-- Name: homework10dCheck_checkId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."homework10dCheck_checkId_seq" OWNED BY public."homework10dCheck"."checkId";


--
-- Name: homework10d_homeworkId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."homework10d_homeworkId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."homework10d_homeworkId_seq" OWNER TO postgres;

--
-- Name: homework10d_homeworkId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."homework10d_homeworkId_seq" OWNED BY public.homework10d."homeworkId";


--
-- Name: joinedClass; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."joinedClass" (
    "joinedClassId" integer NOT NULL,
    "accountId" integer NOT NULL
);


ALTER TABLE public."joinedClass" OWNER TO postgres;

--
-- Name: joinedClass_joinedClassId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."joinedClass_joinedClassId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."joinedClass_joinedClassId_seq" OWNER TO postgres;

--
-- Name: joinedClass_joinedClassId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."joinedClass_joinedClassId_seq" OWNED BY public."joinedClass"."joinedClassId";


--
-- Name: joinedTeams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."joinedTeams" (
    "joinedTeamId" integer NOT NULL,
    "teamId" integer NOT NULL,
    "accountId" integer NOT NULL
);


ALTER TABLE public."joinedTeams" OWNER TO postgres;

--
-- Name: joinedTeams_joinedTeamId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."joinedTeams_joinedTeamId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."joinedTeams_joinedTeamId_seq" OWNER TO postgres;

--
-- Name: joinedTeams_joinedTeamId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."joinedTeams_joinedTeamId_seq" OWNED BY public."joinedTeams"."joinedTeamId";


--
-- Name: lesson; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lesson (
    "lessonId" integer NOT NULL,
    "lessonNumber" integer NOT NULL,
    "weekDay" integer NOT NULL,
    "teamId" integer NOT NULL,
    "subjectId" integer NOT NULL,
    room text NOT NULL,
    "startTime" bigint NOT NULL,
    "endTime" bigint NOT NULL
);


ALTER TABLE public.lesson OWNER TO postgres;

--
-- Name: lesson_lessonId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."lesson_lessonId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."lesson_lessonId_seq" OWNER TO postgres;

--
-- Name: lesson_lessonId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."lesson_lessonId_seq" OWNED BY public.lesson."lessonId";


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    "subjectId" integer NOT NULL,
    "subjectNameLong" text NOT NULL,
    "subjectNameShort" text NOT NULL,
    "subjectNameSubstitution" text[],
    "teacherGender" text NOT NULL,
    "teacherNameLong" text NOT NULL,
    "teacherNameShort" text NOT NULL,
    "teacherNameSubstitution" text[]
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: subjects_subjectId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."subjects_subjectId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."subjects_subjectId_seq" OWNER TO postgres;

--
-- Name: subjects_subjectId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."subjects_subjectId_seq" OWNED BY public.subjects."subjectId";


--
-- Name: team; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team (
    "teamId" integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.team OWNER TO postgres;

--
-- Name: team_teamId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."team_teamId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public."team_teamId_seq" OWNER TO postgres;

--
-- Name: team_teamId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."team_teamId_seq" OWNED BY public.team."teamId";


--
-- Name: account accountId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account ALTER COLUMN "accountId" SET DEFAULT nextval('public."account_accountId_seq"'::regclass);


--
-- Name: event eventId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event ALTER COLUMN "eventId" SET DEFAULT nextval('public."event_eventId_seq"'::regclass);


--
-- Name: eventType eventTypeId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."eventType" ALTER COLUMN "eventTypeId" SET DEFAULT nextval('public."eventType_eventTypeId_seq"'::regclass);


--
-- Name: homework10d homeworkId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework10d ALTER COLUMN "homeworkId" SET DEFAULT nextval('public."homework10d_homeworkId_seq"'::regclass);


--
-- Name: homework10dCheck checkId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."homework10dCheck" ALTER COLUMN "checkId" SET DEFAULT nextval('public."homework10dCheck_checkId_seq"'::regclass);


--
-- Name: joinedClass joinedClassId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."joinedClass" ALTER COLUMN "joinedClassId" SET DEFAULT nextval('public."joinedClass_joinedClassId_seq"'::regclass);


--
-- Name: joinedTeams joinedTeamId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."joinedTeams" ALTER COLUMN "joinedTeamId" SET DEFAULT nextval('public."joinedTeams_joinedTeamId_seq"'::regclass);


--
-- Name: lesson lessonId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson ALTER COLUMN "lessonId" SET DEFAULT nextval('public."lesson_lessonId_seq"'::regclass);


--
-- Name: subjects subjectId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects ALTER COLUMN "subjectId" SET DEFAULT nextval('public."subjects_subjectId_seq"'::regclass);


--
-- Name: team teamId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team ALTER COLUMN "teamId" SET DEFAULT nextval('public."team_teamId_seq"'::regclass);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- Data for Name: account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account ("accountId", username, password, "isAdmin") FROM stdin;
1	USERNAME	$2b$10$xKsiiXw0DAV4amvw6h4pOO74fUI6ixb99oB1G.MJISy3dPC3VsyTa	\N
\.


--
-- Data for Name: account_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_sessions (sid, sess, expire) FROM stdin;
\.


--
-- Data for Name: event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event ("eventId", "eventTypeId", name, description, "startDate", "endDate", lesson, "teamId") FROM stdin;
\.


--
-- Data for Name: eventType; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."eventType" ("eventTypeId", name, color) FROM stdin;
\.


--
-- Data for Name: homework10d; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.homework10d ("homeworkId", content, "subjectId", "assignmentDate", "submissionDate", "teamId") FROM stdin;
\.


--
-- Data for Name: homework10dCheck; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."homework10dCheck" ("checkId", "accountId", "homeworkId") FROM stdin;
\.


--
-- Data for Name: joinedClass; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."joinedClass" ("joinedClassId", "accountId") FROM stdin;
\.


--
-- Data for Name: joinedTeams; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."joinedTeams" ("joinedTeamId", "teamId", "accountId") FROM stdin;
\.


--
-- Data for Name: lesson; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lesson ("lessonId", "lessonNumber", "weekDay", "teamId", "subjectId", room, "startTime", "endTime") FROM stdin;
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects ("subjectId", "subjectNameLong", "subjectNameShort", "subjectNameSubstitution", "teacherGender", "teacherNameLong", "teacherNameShort", "teacherNameSubstitution") FROM stdin;
\.


--
-- Data for Name: team; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team ("teamId", name) FROM stdin;
\.


--
-- Name: account_accountId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."account_accountId_seq"', 32, true);


--
-- Name: eventType_eventTypeId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."eventType_eventTypeId_seq"', 5, true);


--
-- Name: event_eventId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."event_eventId_seq"', 49, true);


--
-- Name: homework10dCheck_checkId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."homework10dCheck_checkId_seq"', 430, true);


--
-- Name: homework10d_homeworkId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."homework10d_homeworkId_seq"', 118, true);


--
-- Name: joinedClass_joinedClassId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."joinedClass_joinedClassId_seq"', 25, true);


--
-- Name: joinedTeams_joinedTeamId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."joinedTeams_joinedTeamId_seq"', 416, true);


--
-- Name: lesson_lessonId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."lesson_lessonId_seq"', 352, true);


--
-- Name: subjects_subjectId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."subjects_subjectId_seq"', 22, true);


--
-- Name: team_teamId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."team_teamId_seq"', 10, true);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY ("accountId");


--
-- Name: account account_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_username_key UNIQUE (username);

--
-- Name: eventType eventType_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."eventType"
    ADD CONSTRAINT "eventType_pkey" PRIMARY KEY ("eventTypeId");


--
-- Name: event event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY ("eventId");


--
-- Name: homework10dCheck homework10dCheck_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."homework10dCheck"
    ADD CONSTRAINT "homework10dCheck_pkey" PRIMARY KEY ("checkId");


--
-- Name: homework10d homework10d_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework10d
    ADD CONSTRAINT homework10d_pkey PRIMARY KEY ("homeworkId");


--
-- Name: joinedClass joinedClass_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."joinedClass"
    ADD CONSTRAINT "joinedClass_pkey" PRIMARY KEY ("joinedClassId");


--
-- Name: joinedTeams joinedTeams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."joinedTeams"
    ADD CONSTRAINT "joinedTeams_pkey" PRIMARY KEY ("joinedTeamId");


--
-- Name: lesson lesson_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lesson
    ADD CONSTRAINT lesson_pkey PRIMARY KEY ("lessonId");


--
-- Name: account_sessions session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_sessions
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY ("subjectId");


--
-- Name: team team_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team
    ADD CONSTRAINT team_pkey PRIMARY KEY ("teamId");


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.account_sessions USING btree (expire);


--
-- Name: account_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX account_account_id ON public.account USING btree ("accountId");


--
-- Name: homework10d_check_account_id_homework_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX homework10d_check_account_id_homework_id ON public."homework10dCheck" USING btree ("accountId", "homeworkId");


--
-- Name: joined_teams_team_id_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX joined_teams_team_id_account_id ON public."joinedTeams" USING btree ("teamId", "accountId");


--
-- Name: event event_eventTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT "event_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES public."eventType"("eventTypeId") ON DELETE CASCADE;


--
-- Name: homework10dCheck homework10dCheck_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."homework10dCheck"
    ADD CONSTRAINT "homework10dCheck_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account("accountId") ON DELETE CASCADE;


--
-- Name: homework10dCheck homework10dCheck_homeworkId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."homework10dCheck"
    ADD CONSTRAINT "homework10dCheck_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES public.homework10d("homeworkId") ON DELETE CASCADE;


--
-- Name: homework10d homework10d_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.homework10d
    ADD CONSTRAINT "homework10d_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public.subjects("subjectId") ON DELETE CASCADE;


--
-- Name: joinedClass joinedClass_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."joinedClass"
    ADD CONSTRAINT "joinedClass_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account("accountId") ON DELETE CASCADE;


--
-- Name: joinedTeams joinedTeams_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."joinedTeams"
    ADD CONSTRAINT "joinedTeams_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public.account("accountId") ON DELETE CASCADE;


--
-- Name: joinedTeams joinedTeams_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."joinedTeams"
    ADD CONSTRAINT "joinedTeams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.team("teamId") ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

