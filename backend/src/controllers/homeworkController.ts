import homeworkService from "../services/homeworkService";
import asyncHandler from "express-async-handler";
import { sendPushNotification } from "../utils/sendNotification";
import { z } from "zod";

export const addHomework = asyncHandler(async(req, res, next) => {
  const addHomeworkSchema = z.object({
    subjectId: z.coerce.number(),
    content: z.string(),
    assignmentDate: z.coerce.number(),
    submissionDate: z.coerce.number(),
    teamId: z.coerce.number()
  })
  const parseResult = addHomeworkSchema.safeParse(req.body);
  if (! parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          subjectId: { type: "number" },
          content: { type: "string" },
          assignmentDate: { type: "number" },
          submissionDate: { type: "number" },
          teamId: { type: "number" },
        },
        required: ["subjectId", "content", "assignmentDate", "submissionDate", "teamId"]
      }
    });
    return
  }
  try {
    await homeworkService.addHomework(parseResult.data, req.session);
    res.sendStatus(200);
        // Send notification
        await sendPushNotification({
          title: 'Hausaufgabe hinzugefügt',
          body: `${parseResult.data.content}`
        });
  } catch (error) {
    next(error);
  }
})

export const checkHomework = asyncHandler(async(req, res, next) => {
  const checkHomeworkSchema = z.object({
    homeworkId: z.coerce.number(),
    checkStatus: z.string()
  })
  const parseResult = checkHomeworkSchema.safeParse(req.body);
  if (! parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          homeworkId: { type: "number" },
          checkStatus: { type: "string" }
        },
        required: ["homeworkId", "checkStatus"]
      }
    });
    return
  }
  try {
    await homeworkService.checkHomework(parseResult.data, req.session);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
})

export const deleteHomework = asyncHandler(async (req, res, next) => {
  const deleteHomeworkSchema = z.object({
    homeworkId: z.coerce.number()
  })
  const parseResult = deleteHomeworkSchema.safeParse(req.body);
  if (! parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          homeworkId: { type: "number" }
        },
        required: ["homeworkId"]
      }
    });
    return
  }
  try {
    await homeworkService.deleteHomework(parseResult.data.homeworkId, req.session);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
})

export const editHomework = asyncHandler(async(req, res, next) => {
  const editHomeworkSchema = z.object({
    homeworkId: z.coerce.number(),
    subjectId: z.coerce.number(),
    content: z.string(),
    assignmentDate: z.coerce.number(),
    submissionDate: z.coerce.number(),
    teamId: z.coerce.number()
  })
  const parseResult = editHomeworkSchema.safeParse(req.body);
  if (! parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          homeworkId: { type: "number" },
          subjectId: { type: "number" },
          content: { type: "string" },
          assignmentDate: { type: "number" },
          submissionDate: { type: "number" },
          teamId: { type: "number" },
        },
        required: ["homeworkId", "subjectId", "content", "assignmentDate", "submissionDate", "teamId"]
      }
    });
    return
  }
  try {
    await homeworkService.editHomework(parseResult.data, req.session);
    res.sendStatus(200);
    await sendPushNotification({
      title: 'Hausaufgabe geändert',
      body: `${parseResult.data.content}`
    });
  } catch (error) {
    next(error);
  }
})

export const getHomeworkData = asyncHandler(async(req, res, next) => {
  try {
    const homeworkData = await homeworkService.getHomeworkData();
    res.status(200).json(homeworkData);
  } catch (error) {
    next(error);
  }
})

export const getHomeworkCheckedData = asyncHandler(async(req, res, next) => {
  try {
    const homeworkCheckedData = await homeworkService.getHomeworkCheckedData(req.session);
    res.status(200).json(homeworkCheckedData);
  } catch (error) {
    next(error);
  }
})

export default {
  addHomework,
  checkHomework,
  deleteHomework,
  editHomework,
  getHomeworkData,
  getHomeworkCheckedData
}
