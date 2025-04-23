const { connectRedis, redisClient, cacheKeyHomeworkData, cacheKeyHomeworkCheckedData, cacheExpiration } = require('../config/constant');
const validator = require('validator');
const Homework10d = require('../models/homework');
const Homework10dCheck = require('../models/homeworkCheck');
const socketIO = require('../socket');
const logger = require('../../logger');
require('dotenv').config();

connectRedis();

async function updateCacheHomeworkData(data) {
    try {
        await redisClient.set(cacheKeyHomeworkData, JSON.stringify(data), { EX: cacheExpiration });
    } catch (err) {
        logger.error('Error updating Redis cache:', err);
    }
};

const homeworkService = {
    async addHomework(subjectId, content, assignmentDate, submissionDate, teamId, session) {
        if (!(session.account)) {
            let err = new Error("User not logged in");
            err.status = 401;
            err.expected = true;
            throw err;
        }
        try {
            await Homework10d.create({
                content: content,
                subjectId: subjectId,
                assignmentDate: assignmentDate,
                submissionDate: submissionDate,
                teamId: teamId
            });
        }
        catch {
            let err = new Error("Bad Request");
            err.status = 400;
            err.expected = true;
            throw err;
        }
        const data = await Homework10d.findAll({ raw: true, order: [["submissionDate", "ASC"]] });
        await updateCacheHomeworkData(data);
        const io = socketIO.getIO();
        io.emit('updateHomeworkData');
    },

    async checkHomework(homeworkId, checkStatus, session) {
        let accountId;
        if (!(session.account)) {
            let err = new Error("User not logged in");
            err.status = 401;
            err.expected = true;
            throw err;
        } else {
            accountId = session.account.accountId;
        }
        if (checkStatus == "true") {
            await Homework10dCheck.findOrCreate({
                where: { accountId, homeworkId },
                defaults: { accountId, homeworkId },
            });
        }
        else {
            await Homework10dCheck.destroy({
                where: {
                    accountId: accountId,
                    homeworkId: homeworkId,
                }
            });
        }
        const io = socketIO.getIO();
        io.emit('updateHomeworkData');
    },

    async deleteHomework(homeworkId, session) {
        if (!(session.account)) {
            let err = new Error("User not logged in");
            err.status = 401;
            err.expected = true;
            throw err;
        }
        if (!homeworkId) {
            let err = new Error("Bad Request");
            err.status = 400;
            err.expected = true;
            throw err;
        }
        await Homework10d.destroy({
            where: {
                homeworkId: homeworkId
            }
        });
        const data = await Homework10d.findAll({ raw: true, order: [["submissionDate", "ASC"]] });
        await updateCacheHomeworkData(data);
        const io = socketIO.getIO();
        io.emit('updateHomeworkData');
    },

    async editHomework(homeworkId, subjectId, content, assignmentDate, submissionDate, teamId, session) {
        if (!(session.account)) {
            let err = new Error("User not logged in");
            err.status = 401;
            err.expected = true;
            throw err;
        }
        try {
            await Homework10d.update(
                {
                    content: content,
                    subjectId: subjectId,
                    assignmentDate: assignmentDate,
                    submissionDate: submissionDate,
                    teamId: teamId
                },
                {
                    where: { homeworkId: homeworkId }
                }
            );
        }
        catch {
            let err = new Error("Bad Request");
            err.status = 400;
            err.expected = true;
            throw err;
        }
        
        const data = await Homework10d.findAll({ raw: true, order: [["submissionDate", "ASC"]] });
        await updateCacheHomeworkData(data);
        const io = socketIO.getIO();
        io.emit('updateHomeworkData');
    },

    async getHomeworkData() {
        const cachedHomeworkData = await redisClient.get(cacheKeyHomeworkData);

        if (cachedHomeworkData) {
            try {
                return JSON.parse(cachedHomeworkData);
            } catch (error) {
                logger.error('Error parsing Redis data:', error);
                throw new Error()
            }
        }

        const data = await Homework10d.findAll({ raw: true, order: [["submissionDate", "ASC"]] });

        await updateCacheHomeworkData(data);

        return data;
    },

    async getHomeworkCheckedData(session) {
        let accountId;
        if (!(session.account)) {
            let err = new Error("User not logged in");
            err.status = 401;
            err.expected = true;
            throw err;
        } else {
            accountId = session.account.accountId;
        }
        let data = await Homework10dCheck.findAll({
            where: { accountId: accountId },
            attributes: [ "homeworkId" ],
            raw: true
        });

        data = data.map((homework) => {return homework.homeworkId})

        return data;
    }
}

module.exports = homeworkService;
