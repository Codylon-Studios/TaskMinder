import { prisma } from "../config/prisma.js";

export type Statistics = {
  registeredClasses: number;
  registeredUsers: number;
  createdHomework: number;
  createdEvents: number;
  createdHomeworkAndEvents: number;
};

async function getStatistics(): Promise<Statistics> {
  const [classStats, accountStats, homeworkStats, eventStats] = await prisma.$transaction([
    prisma.class.aggregate({
      _max: { classId: true }
    }),
    prisma.account.aggregate({
      _max: { accountId: true }
    }),
    prisma.homework.aggregate({
      _max: { homeworkId: true }
    }),
    prisma.event.aggregate({
      _max: { eventId: true }
    })
  ]);

  const registeredClasses = classStats._max.classId ?? 0;
  const registeredUsers = accountStats._max.accountId ?? 0;
  const createdHomework = homeworkStats._max.homeworkId ?? 0;
  const createdEvents = eventStats._max.eventId ?? 0;

  return {
    registeredClasses,
    registeredUsers,
    createdHomework,
    createdEvents,
    createdHomeworkAndEvents: createdHomework + createdEvents
  };
}

export default {
  getStatistics
};
