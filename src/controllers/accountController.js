const logger = require('../../logger');
const accountService = require('../services/accountService');
const asyncHandler = require('express-async-handler');

exports.userController = {
    registerUser: asyncHandler(async(req, res, next) => {
        const { username, password} = req.body;
        const session = req.session;
        try {
            await accountService.registerUser(username, password, session);
            res.sendStatus(200);
        } catch (error) {
            next(error);
        }
    }),
    joinClass: asyncHandler(async(req, res, next) => {
        const { classcode } = req.body;
        try {
            const response = await accountService.joinClass(classcode);
            if(response.redirectmain == true){
                req.session.classcode = classcode;
                res.redirect(308, '/main');
            } else {
                res.redirect(308, '/join');
            }
        } catch (error) {
            next(error);
        }
    }),
    loginUser: asyncHandler(async(req, res, next) => {
        const { username, password } = req.body;
        try {
            await accountService.loginUser(username, password, req.session);
            res.sendStatus(200);
        } catch (error) {
            next(error);
        }
    }),
    logoutUser: asyncHandler(async (req, res, next) => {
        try {
            await accountService.logoutUser(req.session);
            res.clearCookie('UserLogin');
            res.sendStatus(200);
        } catch (error) {
            next(error);
        }
    }),    
    deleteUser: asyncHandler(async(req, res, next) => {
        const {password} = req.body;
        const session = req.session;
        try {
            await accountService.deleteUser(session, password);
            res.clearCookie('UserLogin');
            res.status(200).send('0');
        } catch (error) {
            next(error);
        }
    }),
    getAuth: asyncHandler(async(req, res, next) => {
        try {
            const response = await accountService.getAuth(req.session);
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }),
    checkUsername: asyncHandler(async(req, res, next) => {
        const {username} = req.body;
        try {
            const response = await accountService.checkUsername(username);
            res.status(200).json(response);
        } catch (error) {
            next(error)
        }
    }),
};
