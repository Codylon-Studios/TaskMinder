const express = require("express");
const {scheduleController} = require('../controllers/scheduleController')

const router = express.Router();

router.get('/get_timetable_data', scheduleController.getTimetableData);
router.get('/get_subject_data', scheduleController.getSubjectData);

module.exports = router