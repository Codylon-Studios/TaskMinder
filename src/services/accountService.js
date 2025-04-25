const bcrypt = require("bcrypt");
const validator = require("validator");
const Account = require("../models/account");
const JoinedClass = require("../models/joinedClass");
const logger = require("../../logger");
require("dotenv").config();

const SALTROUNDS= 10;

function checkUsername(username) {
  return /^\w{4,20}$/.test(username);
}

const userService = {
  async getAuth(session){
    let res = {}
    if (! session) {
      res.loggedIn = false
      res.classJoined = false
    }
    if (session.account) {
      res.loggedIn = true
      const username = session.account.username;
      res.account = { username }
    }
    else {
      res.loggedIn = false
    }
    if (session.classJoined) {
      res.classJoined = true
    }
    else {
      res.classJoined = false
    }
    return res
  },
  async registerUser(username, password, session ) {
    if (session.account) {
      let err = new Error("Bad Request");
      err.status = 400;
      err.additionalInformation = "The requesting session is already logged in!"
      err.expected = true;
      throw err;
    }
    if (!(username && password)) {
      let err = new Error("Please fill out all data");
      err.status = 400;
      err.expected = true;
      throw err;
    }
    if (! checkUsername(username)) {
      let err = new Error("Bad Request");
      err.status = 400;
      err.additionalInformation = "The requested username does not comply with the rules!"
      err.expected = true;
      throw err;
    }

    const accountExists = await Account.findOne({
      where: { username: username },
    });
    if (accountExists) {
      let err = new Error("Bad Request");
      err.status = 400;
      err.additionalInformation = "The requested username is already registered!"
      err.expected = true;
      throw err;
    }
    const hashedPassword = await bcrypt.hash(password, SALTROUNDS);
    const account = await Account.create({
      username: username,
      password: hashedPassword
    });
    const accountId = account.accountId;
    session.account = { username, accountId };

    if (session.classJoined) {
      let accountId = session.account.accountId
      JoinedClass.create({
        accountId: accountId
      });
    }
  },
  async logoutUser(session) {
      if (!session.account) {
          let err = new Error("User not logged in");
          err.status = 200;
          err.expected = true;
          throw err;
      }

      delete session.account;

      await new Promise((resolve, reject) => {
          session.save((err) => {
              if (err) return reject(err);
              resolve();
          });
      });

  },
  async loginUser(username, password, session){
    if (session.account) {
      let err = new Error("Bad Request");
      err.status = 400;
      err.additionalInformation = "The requesting session is already logged in!"
      err.expected = true;
      throw err;
    }
    if (!(username && password)) {
      let err = new Error("Please fill out all data");
      err.status = 400;
      err.expected = true;
      throw err;
    }
    const account = await Account.findOne({ where: { username: username } });
    if (!account) {
      let err = new Error("Invalid credentials");
      err.status = 401;
      err.additionalInformation = "The requested username does not comply with the rules!";
      err.expected = true;
      throw err;
    }
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      let err = new Error("Invalid credentials");
      err.status = 401;
      err.expected = true;
      throw err;
    }
    const accountId = account.accountId;
    session.account = { username, accountId };

    const joinedClassExists = await JoinedClass.findOne({ where: { accountId: accountId } });
    if (joinedClassExists == null && session.classJoined) {
      JoinedClass.create({
        accountId: accountId
      });
    }
    else if (joinedClassExists != null) {
        session.classJoined = true;
    }
  },
  async deleteUser(session, password){
    const username = session.account.username;
    const account = await Account.findOne({ where: { username: username } });
    if (! account) {
      let err = new Error("Bad Request");
      err.status = 400;
      err.additionalInformation = "The account requested to be deleted does not exist!"
      err.expected = true;
      throw err;
    }
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (! isPasswordValid) {
      let err = new Error("Invalid credentials");
      err.status = 401;
      err.expected = true;
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
  },
  async joinClass(session, classcode) {
    if (session.classJoined) {
      let err = new Error("Bad Request");
      err.status = 400;
      err.additionalInformation = "The requesting session has already joined a class!"
      err.expected = true;
      throw err;
    }
    if (classcode == process.env.CLASSCODE) {
      session.classJoined = true;
      if (session.account) {
        let accountId = session.account.accountId
        const joinedClassExists = await JoinedClass.findOne({ where: { accountId: accountId } });
        if (joinedClassExists == null) {
          JoinedClass.create({
            accountId: accountId
          });
        }
      }
      return
    }
    let err = new Error("Invalid classcode");
    err.status = 401;
    err.expected = true;
    throw err;
  }
}

module.exports = userService;
