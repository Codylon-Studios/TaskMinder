const express = require("express");
const {subjectController} = require('../controllers/subjectController')
const checkAccess = require('../middleware/accessMiddleware')

const router = express.Router();

router.get('/get_subject_data', checkAccess.elseUnauthorized, subjectController.getSubjectData);
router.post('/set_subject_data', checkAccess.elseUnauthorized, subjectController.setSubjectData);

module.exports = router
