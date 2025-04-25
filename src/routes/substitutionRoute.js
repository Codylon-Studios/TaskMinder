const express = require("express");
const {substitutionController} = require("../controllers/substitutionController")
const checkAccess = require("../middleware/accessMiddleware")

const router = express.Router();

router.get("/get_substitutions_data", checkAccess.elseUnauthorized, substitutionController.getSubstitutionData);

module.exports = router
