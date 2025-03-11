const express = require("express");
const {substitutionController} = require('../controllers/substitutionController')

const router = express.Router();

router.get('/get_substitutions_data', substitutionController.getSubstitutionData);

module.exports = router