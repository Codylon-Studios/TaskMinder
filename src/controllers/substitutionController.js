const substitutionService = require('../services/substitutionService');
const asyncHandler = require('express-async-handler');

exports.substitutionController = {
    getSubstitutionData: asyncHandler(async(req, res, next) => {
        try {
            const substitutionData = await substitutionService.getSubstitutionData();
            res.status(200).json(substitutionData);
        } catch (error) {
            next(error);
        }
    })
}