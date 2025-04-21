// Middleware to enforce session-based access control
const accessMiddleware = {
  elseRedirect(req, res, next) {
    if (req.session.classJoined) {
      return next();
    }
    return res.redirect(302, '/join');
  },
  elseUnauthorized(req, res, next) {
    if (req.session.classJoined) {
      return next();
    }
    let err = new Error("User hasn't joined class");
    err.status = 401;
    err.expected = true;
    throw err;
  }
}


module.exports = accessMiddleware;
