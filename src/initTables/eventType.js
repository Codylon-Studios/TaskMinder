const logger = require('../../logger');
const EventType = require('../models/eventType');
const sequelize = require('../sequelize');

const defaultEventTypes = [
    { type: 0, name: "Prüfung", color: "#5599ff" },
    { type: 1, name: "Ausflug", color: "#ff9955" },
    { type: 2, name: "Geburtstag", color: "#ff55aa" },
    { type: 3, name: "Schulfrei", color: "#44dd33" },
    { type: 4, name: "Sonstiges", color: "#888888" },
];

(async () => {
    await sequelize.sync();
    await EventType.destroy({ truncate: true, cascade: true });
    await EventType.bulkCreate(defaultEventTypes);
    logger.write({prefix: {text: "[TableInitialisor]", color: "green"}}, "Successfully initialised eventType table.")
    logger.write({prefix: {text: "[TableInitialisor]", color: "cyan"}}, "Remember to execute 'redis-cli flushall' to clear the redis cache. If deploying using Docker Compose, this will be done automatically.")
    process.exit()
})();
