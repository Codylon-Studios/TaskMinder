const bcrypt = require('bcrypt');
const validator = require('validator');
const Account = require('../models/account');
const logger = require('../../logger');
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
            let err = new Error("Please fill out all data");
            err.status = 400;
            throw err;
        }
        if (classcode != "geheim"){
            let err = new Error("Invalid classcode");
            err.status = 401;
            throw err;
        }
        if (! checkUsername(username)) {
            let err = new Error("Bad Request");
            err.status = 400;
            err.additionalInformation = "The requested username does not comply with the rules!"
            throw err;
        }

        const accountExists = await Account.findOne({
            where: { username: username },
        });
        if (accountExists) {
            let err = new Error("Bad Request");
            err.status = 400;
            err.additionalInformation = "The requested username is already registered!"
            throw err;
        }
        const hashedPassword = await bcrypt.hash(password, SALTROUNDS);
        const account = await Account.create({
            username: username,
            password: hashedPassword,
            class: classname
        });
        const accountId = account.accountId;
        session.account = { username, accountId };
    },
    async logoutUser(session) {
        if (!session.account) {
            let err = new Error("User not logged in");
            err.status = 200;
            throw err;
        }
        await session.destroy((err) => {
            if (err) {
                throw new Error();
            }
        });
    },
    async loginUser(username, password, session){
        if (!(username && password)) {
            let err = new Error("Please fill out all data");
            err.status = 400;
            throw err;
        }
        const account = await Account.findOne({ where: { username: username } });
        if (!account) {
            let err = new Error("Invalid credentials");
            err.status = 401;
            err.additionalInformation = "The requested username does not comply with the rules!";
            throw err;
        }
        const isPasswordValid = await bcrypt.compare(password, account.password);
        if (!isPasswordValid) {
            let err = new Error("Invalid credentials");
            err.status = 401;
            throw err;
        }
        const accountId = account.accountId;
        session.account = { username, accountId };
    },
    async deleteUser(session, password){
        const username = session.account.username;
        const account = await Account.findOne({ where: { username: username } });
        if (! account) {
            let err = new Error("Bad Request");
            err.status = 400;
            err.additionalInformation = "The account requested to be deleted does not exist!"
            throw err;
        }
        const isPasswordValid = await bcrypt.compare(password, account.password);
        if (! isPasswordValid) {
            let err = new Error("Invalid credentials");
            err.status = 401;
            throw err;
        }
        await user.destroy();
        await session.destroy((err) => {
            if (err) {
                throw new Error();
            }
        })
    },
    async checkUsername(username) {
        const accountExists = await Account.findOne({ where: { username: username } });
        return accountExists != null;
    }
}

module.exports = userService;
