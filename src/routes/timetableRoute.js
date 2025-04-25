const express = require("express");
const {timetableController} = require("../controllers/timetableController")
const upload = require("../middleware/fileUploadMiddleware");
const checkAccess = require("../middleware/accessMiddleware")

const router = express.Router();

router.get("/get_timetable_data", checkAccess.elseUnauthorized, timetableController.getTimetableData);
router.post("/set_timetable_data", checkAccess.elseUnauthorized, upload.single("timetable"), timetableController.setTimetableData);

module.exports = router
