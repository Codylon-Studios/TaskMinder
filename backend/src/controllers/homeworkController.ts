import homeworkService from "../services/homeworkService";
import asyncHandler from "express-async-handler";

export const addHomework = asyncHandler(async (req, res, next) => {
  try {
    await homeworkService.addHomework(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const checkHomework = asyncHandler(async (req, res, next) => {
  try {
    await homeworkService.checkHomework(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const deleteHomework = asyncHandler(async (req, res, next) => {
  try {
    await homeworkService.deleteHomework(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const editHomework = asyncHandler(async (req, res, next) => {
  try {
    await homeworkService.editHomework(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const getHomeworkData = asyncHandler(async (req, res, next) => {
  try {
    const homeworkData = await homeworkService.getHomeworkData(req.session);
    res.status(200).json(homeworkData);
  }
  catch (error) {
    next(error);
  }
});

export const getHomeworkCheckedData = asyncHandler(async (req, res, next) => {
  try {
    const homeworkCheckedData = await homeworkService.getHomeworkCheckedData(req.session);
    res.status(200).json(homeworkCheckedData);
  }
  catch (error) {
    next(error);
  }
});

export default {
  addHomework,
  checkHomework,
  deleteHomework,
  editHomework,
  getHomeworkData,
  getHomeworkCheckedData
};
