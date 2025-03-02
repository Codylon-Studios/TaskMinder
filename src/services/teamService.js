const { redisClient, cacheExpiration } = require('../constant');

const JoinedTeams = require('../models/joinedTeam');
const Teams = require('../models/team');

const teamsService = {
    async getTeamsData() {
        const cachedTeamsData = await redisClient.get("teams_data");

        if (cachedTeamsData) {
            console.log('Serving data from Redis cache:', cachedTeamsData);
            try {
                return JSON.parse(cachedTeamsData);
            } catch (error) {
                console.error('Error parsing Redis data:', error);
            }
        }

        const data = await Teams.findAll({ raw: true });

        try {
            await redisClient.set("teams_data", JSON.stringify(data), { EX: cacheExpiration });
            console.log('Teams data cached successfully in Redis');
        } catch (err) {
            console.error('Error updating Redis cache:', err);
        }

        return data;
    },
    async getJoinedTeamsData(session) {
        let accountId
        if (!(session.account)) {
            throw new Error("No session available - getJoinedTeamsData");
        } else {
            accountId = session.account.accountId;
        }

        const data = await JoinedTeams.findAll({
            where: { accountId: accountId }
        });

        let teams = []

        for (let entry of data) {
            teams.push(entry.teamId);
        };

        return teams;
    },
    async setJoinedTeamsData(teams, session) {
        let accountId
        if (!(session.account)) {
            throw new Error("No session available - setJoinedTeamsData");
        } else {
            accountId = session.account.accountId;
        }

        if (! Array.isArray(teams)) {
            console.log("Invalid team data given");
            return
        }
    
        if (! teams.every(num => Number.isInteger(Number(num)))) {
            console.log("Invalid team data given");
            return
        }

        await JoinedTeams.destroy({
            where: { accountId: accountId }
        });

        for (let teamId of teams) {
            try {
                await JoinedTeams.create({
                    teamId: teamId,
                    accountId: accountId
                })
            }
            catch {
                console.log("Invalid team data given");
                return;
            }
        }
    },
}

module.exports = teamsService;
