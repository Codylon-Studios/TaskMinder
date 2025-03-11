const { exec } = require("child_process");
const logger = require('../../logger');
const EventType = require('../models/eventType');
const sequelize = require('../sequelize');
const redisCmd = process.env.NODE_ENV === 'DEVELOPMENT' 
    ? `redis-cli flushall`
    : `redis-cli -h redis FLUSHALL`;

const defaultEventTypes = [
    { type: 0, name: "Prüfung", color: "#5599ff" },
    { type: 1, name: "Ausflug", color: "#ff9955" },
    { type: 2, name: "Geburtstag", color: "#ff55aa" },
    { type: 3, name: "Schulfrei", color: "#44dd33" },
    { type: 4, name: "Sonstiges", color: "#888888" },
];



(async () => {
    logger.setStandardPrefix("[TableInitialisor]")

    try {
        await sequelize.sync();
        await EventType.destroy({ truncate: true, cascade: true });
        await EventType.bulkCreate(defaultEventTypes);
        logger.success("Successfully initialised eventType table.")
    }
    catch (err) {
        logger.writeError("Error initialising eventType table:", err)
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
