const { connectRedis, redisClient, cacheKeyHomeworkData, cacheKeyHomeworkCheckedData, cacheExpiration } = require('../constant');
var validator = require('validator');
const Homework10d = require('../models/homework');
const Homework10dCheck = require('../models/homeworkcheck');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
require('dotenv').config();

connectRedis();

function changeKeys(data) {
    let changedData = [];
    for (let row in data) {
        changedData.push({});
        for (let key in data[row]) {
            let newKey;
            switch (key) {
                case "homeworkid":
                    newKey = "homeworkId";
                    break;
                case "subjectid":
                    newKey = "subjectId";
                    break;
                case "assignmentdate":
                    newKey = "assignmentDate";
                    break;
                case "submissiondate":
                    newKey = "submissionDate";
                    break;
                case "checkid":
                    newKey = "checkId";
                    break;
                default:
                    newKey = key;
            }
            changedData[row][newKey] = data[row][key];
        }
    }
    return changedData;
}

async function updateCacheHomeworkData(data) {
    try {
        await redisClient.set(cacheKeyHomeworkData, JSON.stringify(data), { EX: cacheExpiration });
        console.log('Homework data cached successfully in Redis');
    } catch (err) {
        console.error('Error updating Redis cache:', err);
    }
};

async function updateCacheHomeworkCheckedData(data) {
    try {
        await redisClient.set(cacheKeyHomeworkCheckedData, JSON.stringify(data), { EX: cacheExpiration });
        console.log('Homework checked data cached successfully in Redis');
    } catch (err) {
        console.error('Error updating Redis cache:', err);
    }
};

const homeworkService = {
    async addHomework(subjectId, content, assignmentDate, submissionDate, session) {
        if (!(subjectId && content && assignmentDate && submissionDate)) {
            throw new Error('Please fill out all data. - addHomework');
        }
        if (!(session.user)) {
            throw new Error('No session available - addHomework');
        }
        if ([subjectId, content, assignmentDate, submissionDate].includes("")) {
            throw new Error('Empty information while adding homework - addHomework');
        }
        if (!validator.isInt(subjectId.toString())) {
            throw new Error('Invalid subject ID - addHomework');
        }
        if (validator.isEmpty(content)) {
            throw new Error('Content cannot be empty - addHomework');
        }
        if (!Number.isInteger(Number(assignmentDate)) || Number(assignmentDate) < 0) {
            throw new Error('Invalid assignment date - addHomework');
        }
        if (!Number.isInteger(Number(submissionDate)) || Number(submissionDate) < 0) {
            throw new Error('Invalid submission date - addHomework');
        }
        DOMPurify.sanitize(content);
        DOMPurify.sanitize(subjectId);
        DOMPurify.sanitize(assignmentDate);
        DOMPurify.sanitize(submissionDate);
        const sanitizedContent = validator.escape(content);
        const sanitizedsubjectId = validator.escape(subjectId);
        const sanitizedassignmentDate = validator.escape(assignmentDate);
        const sanitizedsubmissionDate = validator.escape(submissionDate);
        await Homework10d.create({
            content: sanitizedContent,
            subjectId: sanitizedsubjectId,
            assignmentDate: sanitizedassignmentDate,
            submissionDate: sanitizedsubmissionDate
        });
        const data = await Homework10d.findAll({ raw: true });
        await updateCacheHomeworkData(changeKeys(data));
        return { data };
    },

    async checkHomework(homeworkId, checkStatus, session) {
        let username;
        if (!(session.user)) {
            throw new Error('No session available - checkHomeowrk');
        } else {
            username = session.user.username;
        }
        await Homework10dCheck.destroy({
            where: {
                homeworkId: homeworkId,
                username: username
            }
        });
        await Homework10dCheck.create({
            homeworkId: homeworkId,
            username: username,
            checked: checkStatus
        });
        const data = await Homework10dCheck.findAll({
            where: { username: username },
            raw: true
        });
        await updateCacheHomeworkCheckedData(changeKeys(data));
        return { message: 'Homework successfully checked.' }
    },

    async deleteHomework(id, session) {
        if (!(session.user)) {
            throw new Error('No session available - deleteHomework');
        }
        if (!validator.isInt(id.toString())) {
            throw new Error('Invalid homework ID - deleteHomework');
        }
        await Homework10d.destroy({
            where: {
                homeworkId: id
            }
        });
        const data = await Homework10d.findAll({ raw: true });
        await updateCacheHomeworkData(changeKeys(data));
        return { message: 'Homework successfully deleted.' }
    },

    async editHomework(id, subjectId, content, assignmentDate, submissionDate, session) {
        if (!(session.user)) {
            throw new Error('No session available - editHomework');
        }
        if ([subjectId, content, assignmentDate, submissionDate].includes("")) {
            throw new Error('Empty information while editing homework - editHomework');
        }
        if (!validator.isInt(id.toString())) {
            throw new Error('Invalid homework ID - editHomework');
        }
        if (!validator.isInt(subjectId.toString())) {
            throw new Error('Invalid subject ID - editHomework');
        }
        if (validator.isEmpty(content)) {
            throw new Error('Content cannot be empty - editHomework');
        }
        if (!Number.isInteger(Number(assignmentDate)) || Number(assignmentDate) < 0) {
            throw new Error('Invalid assignment date - editHomework');
        }
        if (!Number.isInteger(Number(submissionDate)) || Number(submissionDate) < 0) {
            throw new Error('Invalid submission date - editHomework');
        }
        DOMPurify.sanitize(content);
        DOMPurify.sanitize(subjectId);
        DOMPurify.sanitize(assignmentDate);
        DOMPurify.sanitize(submissionDate);
        const sanitizedContent = validator.escape(content);
        const sanitizedsubjectId = validator.escape(subjectId);
        const sanitizedassignmentDate = validator.escape(assignmentDate);
        const sanitizedsubmissionDate = validator.escape(submissionDate);
        await Homework10d.update(
            {
                content: sanitizedContent,
                subjectId: sanitizedsubjectId,
                assignmentDate: sanitizedassignmentDate,
                submissionDate: sanitizedsubmissionDate
            },
            {
                where: { homeworkId: id }
            }
        );
        const data = await Homework10d.findAll({ raw: true });
        await updateCacheHomeworkData(changeKeys(data));
        return { message: 'Homework successfully edited.' }
    },

    async getHomeworkData() {
        const cachedHomeworkData = await redisClient.get(cacheKeyHomeworkData);

        if (cachedHomeworkData) {
            console.log('Serving data from Redis cache:', cachedHomeworkData);
            try {
                return JSON.parse(cachedHomeworkData);
            } catch (error) {
                console.error('Error parsing Redis data:', error);
            }
        }

        const data = await Homework10d.findAll({ raw: true });

        await updateCacheHomeworkData(changeKeys(data));

        return changeKeys(data);
    },



    async getHomeworkCheckedData(session) {
        let username;
        if (!(session.user)) {
            throw new Error('No session available - getHomeworkCheckedData');
        } else {
            username = session.user.username;
        }
        const cachedHomeworkCheckedData = await redisClient.get(cacheKeyHomeworkCheckedData);

        if (cachedHomeworkCheckedData) {
            console.log('Serving data from Redis cache');
            return JSON.parse(cachedHomeworkCheckedData);
        }
        const data = await Homework10dCheck.findAll({
            where: { username: username },
            raw: true
        });
        await updateCacheHomeworkCheckedData(changeKeys(data));

        return changeKeys(data);
    }
}

module.exports = homeworkService;