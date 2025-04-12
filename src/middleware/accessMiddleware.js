// Middleware to enforce session-based access control
const checkAccess = (req, res, next) => {
    if (req.session.account || req.classJoined) {
      return next();
    }
    return res.redirect(302, '/join');
  }


module.exports = checkAccess;