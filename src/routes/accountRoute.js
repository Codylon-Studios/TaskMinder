const express = require("express");
const {userController} = require('../controllers/accountController')

const router = express.Router();

router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);
router.post('/delete', userController.deleteUser);
router.get('/auth', userController.getAuth);
router.post('/logout', userController.logoutUser);
router.post('/checkusername', userController.checkUsername);


module.exports = router