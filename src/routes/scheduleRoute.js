const express = require("express");
const {scheduleController} = require("../controllers/scheduleController")
const checkAccess = require("../middleware/accessMiddleware")

const router = express.Router();

router.get("/get_timetable_data", checkAccess.elseUnauthorized, scheduleController.getTimetableData);
router.get("/get_subject_data", checkAccess.elseUnauthorized, scheduleController.getSubjectData);

module.exports = router
