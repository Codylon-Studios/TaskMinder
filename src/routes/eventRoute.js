const express = require("express");
const {eventController} = require('../controllers/eventController')
const checkAccess = require('../middleware/accessMiddleware')

const router = express.Router();

router.get('/get_event_data', checkAccess.elseUnauthorized, eventController.getEventData);
router.post('/add_event', checkAccess.elseUnauthorized, eventController.addEvent);
router.post('/edit_event', checkAccess.elseUnauthorized, eventController.editEvent);
router.post('/delete_event', checkAccess.elseUnauthorized, eventController.deleteEvent);
router.get('/get_event_type_data', checkAccess.elseUnauthorized, eventController.getEventTypeData);
router.get('/event_type_styles', checkAccess.elseUnauthorized, eventController.getEventTypeStyles);

module.exports = router
