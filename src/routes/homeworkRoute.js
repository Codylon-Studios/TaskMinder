const express = require("express");
const {homeworkController} = require("../controllers/homeworkController")
const checkAccess = require("../middleware/accessMiddleware")

const router = express.Router();

router.post("/add", checkAccess.elseUnauthorized, homeworkController.addHomework);
router.post("/check", checkAccess.elseUnauthorized, homeworkController.checkHomework);
router.post("/delete", checkAccess.elseUnauthorized, homeworkController.deleteHomework);
router.post("/edit", checkAccess.elseUnauthorized, homeworkController.editHomework);
router.get("/get_homework_data", checkAccess.elseUnauthorized, homeworkController.getHomeworkData);
router.get("/get_homework_checked_data", checkAccess.elseUnauthorized, homeworkController.getHomeworkCheckedData);

module.exports = router
