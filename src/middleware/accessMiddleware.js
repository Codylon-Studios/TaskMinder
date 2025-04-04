// Middleware to enforce session-based access control
const checkAccess = (req, res, next) => {
    if (req.session.account || req.session.classcode === process.env.CLASSCODE) {
      return next();
    }
    return res.redirect(308, '/join');
  }


module.exports = checkAccess;