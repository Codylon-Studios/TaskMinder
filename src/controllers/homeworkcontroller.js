const homeworkService = require('../services/homeworkservice');
const asyncHandler = require('express-async-handler');

exports.homeworkController = {
    addHomework: asyncHandler(async(req, res, next) =>{
        const { subjectId, content, assignmentDate, submissionDate} = req.body;
        try {
            await homeworkService.addHomework(subjectId, content, assignmentDate, submissionDate, req.session);
            res.status(200).send('0');
        } catch (error) {
            next(error);
        }
    }),
    checkHomework: asyncHandler(async(req, res, next) => {
        const { homeworkId, checkStatus} = req.body;
        try {
            await homeworkService.checkHomework(homeworkId, checkStatus, req.session);
            res.status(200).send('0');
        } catch (error) {
            next(error);
        }
    }),
    deleteHomework: asyncHandler(async (req, res, next) => {
        const { id } = req.body;
        try {
            await homeworkService.deleteHomework(id, req.session);
            res.status(200).send('0');
        } catch (error) {
            next(error);
        }
    }),    
    editHomework: asyncHandler(async(req, res, next) => {
        const { id, subjectId, content, assignmentDate, submissionDate} = req.body;
        try {
            await homeworkService.editHomework(id, subjectId, content, assignmentDate, submissionDate, req.session);
            res.status(200).send('0');
        } catch (error) {
            next(error);
        }
    }),
    getHomeworkData: asyncHandler(async(req, res, next) => {
        try {
            const cachedHomeworkData = await homeworkService.getHomeworkData();
            res.status(200).json(cachedHomeworkData);
        } catch (error) {
            next(error);
        }
    }),
    getHomeworkCheckedData: asyncHandler(async(req, res, next) => {
        try {
            const cachedHomeworkCheckedData = await homeworkService.getHomeworkCheckedData(req.session);
            res.status(200).json(cachedHomeworkCheckedData);
        } catch (error) {
            next(error);
        }
    }),
};