const logger = require('../../logger');

const ErrorHandler = (req, res, next) => {
    const start = Date.now();
  
    const originalSend = res.send;

    res.send = function (body) {
        try {
            const duration = Date.now() - start;

            let statusCodeColor = "";
            if (/2\d{2}/.test(res.statusCode)) statusCodeColor = "green";
            if (/4\d{2}/.test(res.statusCode)) statusCodeColor = "yellow";
            if (/5\d{2}/.test(res.statusCode)) statusCodeColor = "red";

            let durationColor = "";
            if (duration < 50) durationColor = "green";
            else if (duration < 200) durationColor = "yellow";
            else durationColor = "red";
    
            logger.write(
                { prefix: { color: "magenta" } },
                logger.parse({color: "gray", bold: false}, `[${new Date().toISOString()}]`),
                logger.parse({padding: {totalWidth: 5, alignment: "right"}, color: durationColor}, `${duration}ms`),
                logger.parse({bold: true, padding: {totalWidth: 4}}, req.method),
                logger.parse({underline: true}, req.url),
                logger.parse({color: statusCodeColor, bold: true}, res.statusCode),
                ...((! /2\d{2}/.test(res.statusCode)) ? [`(${body})`] : []),
            )
        }
        catch (err) {
            logger.warn("An error occured in the logger middleware:\t", err)
        }
        return originalSend.apply(this, arguments);
    };

    next();
};

module.exports = ErrorHandler;
