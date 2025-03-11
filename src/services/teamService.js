const logger = require('../../logger');
const { redisClient, cacheExpiration } = require('../constant');

const JoinedTeam = require('../models/joinedTeam');
const Team = require('../models/team');

const teamService = {
    async getTeamsData() {
        const cachedTeamsData = await redisClient.get("teams_data");

        if (cachedTeamsData) {
            try {
                return JSON.parse(cachedTeamsData);
            } catch (error) {
                logger.error('Error parsing Redis data:', error);
                throw new Error();
            }
        }

        const data = await Team.findAll({ raw: true });

        try {
            await redisClient.set("teams_data", JSON.stringify(data), { EX: cacheExpiration });
        } catch (err) {
            logger.error('Error updating Redis cache:', err);
            throw new Error();
        }

        return data;
    },
    async getJoinedTeamsData(session) {
        let accountId
        if (!(session.account)) {
            let err = new Error("User not logged in");
            err.status = 401;
            err.expected = true;
            throw err;
        } else {
            accountId = session.account.accountId;
        }

        const data = await JoinedTeam.findAll({
            where: { accountId: accountId }
        });

        let teams = []

        for (let entry of data) {
            teams.push(entry.teamId);
        };

        return teams;
    },
    async setJoinedTeamsData(teams, session) {
        teams = teams || []

        let accountId
        if (!(session.account)) {
            let err = new Error("User not logged in");
            err.status = 401;
            err.expected = true;
            throw err;
        } else {
            accountId = session.account.accountId;
        }

        if (! Array.isArray(teams)) {
            let err = new Error("Bad Request");
            err.status = 400;
            err.expected = true;
            throw err;
        }

        await JoinedTeam.destroy({
            where: { accountId: accountId }
        });

        for (let teamId of teams) {
            try {
                await JoinedTeam.create({
                    teamId: teamId,
                    accountId: accountId
                })
            }
            catch {
                let err = new Error("Bad Request");
                err.status = 400;
                err.expected = true;
                throw err;
            }
        }
    },
}

module.exports = teamService;
