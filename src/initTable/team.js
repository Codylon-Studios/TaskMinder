const { exec } = require("child_process");
const logger = require('../../logger');
const Team = require('../models/team');
const sequelize = require('../sequelize');
const redisCmd = process.env.NODE_ENV === 'DEVELOPMENT' 
    ? `redis-cli flushall`
    : `redis-cli -h redis FLUSHALL`;

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
    logger.setStandardPrefix("[TableInitialisor]")

    try {
        await sequelize.sync();
        await Team.destroy({ truncate: true, cascade: true });
        await Team.bulkCreate(defaultTeams);
        logger.success("Successfully initialised team table.")
    }
    catch (err) {
        logger.writeError("Error initialising team table:", err)
        process.exit(1)
    }

    try {
        exec(redisCmd, (error, stdout, stderr) => {
            if (error) {
                logger.writeError("Error flushing redis cache:", error.message)
                process.exit(1)
            }
            else {
                logger.success("Successfully flushed redis cache.")
                process.exit(0)
            }
          });
    }
    catch (err) {
        logger.writeError("Error flushing redis cache:", err)
        process.exit(1)
    }
})();
