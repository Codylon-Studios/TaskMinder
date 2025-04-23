const express = require("express");
const {scheduleController} = require('../controllers/scheduleController')
const checkAccess = require('../middleware/accessMiddleware')
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

router.get('/get_timetable_data', checkAccess.elseUnauthorized, scheduleController.getTimetableData);
router.get('/get_subject_data', checkAccess.elseUnauthorized, scheduleController.getSubjectData);
router.post('/set_timetable_data', checkAccess.elseUnauthorized, upload.single('file'), scheduleController.setTimetableData);
router.post('/set_subject_data', checkAccess.elseUnauthorized, upload.single('file'), scheduleController.setSubjectData);

module.exports = router