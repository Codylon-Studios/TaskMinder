const logger = require('../../logger');
const Team = require('../models/team');
const sequelize = require('../sequelize');

const defaultTeams = [
    { teamId: 0, name: "Französisch" },
    { teamId: 1, name: "Profilfach" },
    { teamId: 2, name: "Ethik" },
    { teamId: 3, name: "Evangelisch" },
    { teamId: 4, name: "Katholisch" },
    { teamId: 5, name: "Sport (m)" },
    { teamId: 6, name: "Sport (w)" }
];

(async () => {
    await sequelize.sync();
    await Team.destroy({ truncate: true, cascade: true });
    await Team.bulkCreate(defaultTeams);
    logger.write({prefix: {text: "[TableInitialisor]", color: "green"}}, "Successfully initialised team table.")
    logger.write({prefix: {text: "[TableInitialisor]", color: "cyan"}}, "Remember to execute 'redis-cli flushall' to clear the redis cache.")
    process.exit()
})();
