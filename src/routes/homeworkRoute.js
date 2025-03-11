const express = require("express");
const {homeworkController} = require('../controllers/homeworkController')

const router = express.Router();

router.post('/add', homeworkController.addHomework);
router.post('/check', homeworkController.checkHomework);
router.post('/delete', homeworkController.deleteHomework);
router.post('/edit', homeworkController.editHomework);
router.get('/get_homework_data', homeworkController.getHomeworkData);
router.get('/get_homework_checked_data', homeworkController.getHomeworkCheckedData);


module.exports = router
