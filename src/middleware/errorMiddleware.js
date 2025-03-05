const logger = require('../../logger');

const ErrorHandler = (err, req, res, next) => {
    try {
        if (err.additionalInformation) {
            logger.write({}, "")
            logger.write({padding: { totalWidth: logger.consoleWidth, alignment: "center", fillCharacter: "="}, color: "red"}, " Critical Exception ")
            logger.write({color: "gray"}, "This might be an attack attempt as normal use of the UI should not have caused this error!")
            logger.write(
                {},
                logger.parse({bold: true}, req.method),
                logger.parse({underline: true}, req.url),
                logger.parse({color: "red", bold: true}, err.status),
                `(${err.message})`,
                logger.parse({color: "red", bold: true}, err.additionalInformation))
            logger.write({}, "")
        }

        if (err.expected) {
            res.status(err.status || 500).send(err.message)
        }
        else {
            console.log(err)
            res.status(500).send("Internal Server Error")
        }
    }
    catch (err) {
        logger.warn("An error occured in the error handler middleware:\t", err)
        res.status(500).send("Internal Server Error")
    }
};

module.exports = ErrorHandler;
