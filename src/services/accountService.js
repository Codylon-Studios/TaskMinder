const bcrypt = require('bcrypt');
const validator = require('validator');
const User = require('../models/account');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
require('dotenv').config();

const SALTROUNDS= 10;

function checkUsername(username) {
  return /^\w{4,20}$/.test(username);
}

const userService = {
    async getAuth(session){
        if (session.account && session) {
            const username = session.account.username;
            return { authenticated: true, account: { username } };
          } else {
            return { authenticated: false };
        }
    },
    async registerUser(username, password, classcode, session ){
        const classname = "10d";
        if (!(username && password && classcode)) {
            throw new Error('Please fill out all data. - Register');
        }
        const sanitizedClasscode = validator.escape(classcode);
        if (sanitizedClasscode != "geheim"){
            throw new Error('Classcode is wrong. - Register');
        }
        if (! checkUsername(username)) {
            throw new Error('Invalid username. - Register');
        }
        const UserExists = await User.findOne({
            where: { username: username },
        });
        if (UserExists) {
            throw new Error('User already registered. - Register');
        }
        DOMPurify.sanitize(username);
        DOMPurify.sanitize(password);
        const sanitizedUsername = validator.escape(username);
        const sanitizedPassword = validator.escape(password);
        const hashedPassword = await bcrypt.hash(sanitizedPassword, SALTROUNDS);
        const user = await User.create({
            username: sanitizedUsername,
            password: hashedPassword,
            class: classname
        });
        const accountId = user.accountId;
        session.account = { username, accountId };
        return { message: 'User registered successfully.' };
    },
    async logoutUser(session) {
        if (!session.account) {
            throw new Error('Not logged in. - Logout');
        }
        await new Promise((resolve, reject) => {
            session.destroy((err) => {
                if (err) {
                    return reject(new Error('Internal server error. - Logout'));
                }
                resolve();
            });
        });
        return { message: 'Logout successful.' };
    },
    
    async loginUser(username, password, session){
        if (!(username && password)) {
            throw new Error('Please fill out all data. - Login');
        }
        if (! checkUsername(username)) {
            throw new Error('Invalid username - Login');
        }
        const sanitizedUsernamePurify = DOMPurify.sanitize(username);
        const validatedUsernamePurify = validator.escape(sanitizedUsernamePurify );
        const user = await User.findOne({ where: { username: validatedUsernamePurify } });
        if (!user) {
            throw new Error('User not available - Login');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials - Login');
        }
        const accountId = user.accountId;
        session.account = { username, accountId };
        return {message: 'Login succesful.'}
    },


    async deleteUser(session, password){
        const Sessionusername = session.account.username;
        if (! checkUsername(Sessionusername)) {
            throw new Error('Username not correct. - Delete')
          }
          const user = await User.findOne({ where: {Sessionusername} });
          if (!user) {
              throw new Error('User not available. - Delete');
          }
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
              throw new Error('Invaild credentials. - Delete');
          }
          await user.destroy();
          await new Promise((resolve, reject) => {
            session.destroy((err) => {
                if (err) {
                    return reject(new Error('Internal server error. - Delete'));
                }
                resolve();
            });
            return { message: 'Deletion successful.' };
        })
    },
    async checkUsername(username) { 
        const sanitizedUsernamePurify = DOMPurify.sanitize(username);
        const validatedUsernamePurify = validator.escape(sanitizedUsernamePurify );
        const userExists = await User.findOne({ where: { username: validatedUsernamePurify } });
        if (userExists) {
            throw new Error('Username already taken. - checkUsername');
        }
    
        return { message: 'Username is available' };
    }
    
}

module.exports = userService;

