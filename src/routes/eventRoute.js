const express = require("express");
const {eventController} = require('../controllers/eventController')

const router = express.Router();

router.get('/get_event_data', eventController.getEventData);
router.post('/add_event', eventController.addEvent);
router.post('/edit_event', eventController.editEvent);
router.post('/delete_event', eventController.deleteEvent);
router.get('/get_event_type_data', eventController.getEventTypeData);
router.get('/event_type_styles', eventController.getEventTypeStyles);

module.exports = router
