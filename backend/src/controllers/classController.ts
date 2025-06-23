import z from "zod";
import classService from "../services/classService";
import asyncHandler from "express-async-handler";

export const getClassInfo = asyncHandler(async (req, res, next) => {
  try {
    const classCode = await classService.getClassInfo(req.session);
    res.status(200).json(classCode);
  }
  catch (error) {
    next(error);
  }
});

export const createTestClass = asyncHandler(async (req, res, next) => {
  const createTestClassSchema = z.object({
    className: z.string(),
    classCode: z.string()
  });
  const parseResult = createTestClassSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          className: { type: "string" },
          classCode: { type: "string" }
        },
        required: ["className", "classCode"]
      }
    });
    return;
  }
  try {
    await classService.createTestClass(parseResult.data, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const createClass = asyncHandler(async (req, res, next) => {
  const createClassSchema = z.object({
    className: z.string(),
    classCode: z.string()
  });
  const parseResult = createClassSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          className: { type: "string" },
          classCode: { type: "string" }
        },
        required: ["className", "classCode"]
      }
    });
    return;
  }
  try {
    await classService.createClass(parseResult.data, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const generateNewClassCode = asyncHandler(async (req, res, next) => {
  try {
    const classCode = await classService.generateNewClassCode(req.session);
    res.sendStatus(200).json(classCode);
  }
  catch (error) {
    next(error);
  }
});

export const leaveClass = asyncHandler(async (req, res, next) => {
  try {
    await classService.leaveClass(req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export default {
  getClassInfo,
  createTestClass,
  createClass,
  generateNewClassCode,
  leaveClass
};
