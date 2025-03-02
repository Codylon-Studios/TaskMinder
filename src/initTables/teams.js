const Teams = require('../models/team');
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
    await Teams.destroy({ truncate: true, cascade: true });
    await Teams.bulkCreate(defaultTeams);
    process.exit()
})();
