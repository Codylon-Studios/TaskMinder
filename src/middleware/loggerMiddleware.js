const logger = require('../../logger');

const ErrorHandler = (req, res, next) => {
    const start = Date.now();
  
    const originalSend = res.send;

    res.send = function (body) {
        try {
            const d = new Date()
            let dateStr = `[${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${(d.getDate()).toString().padStart(2, "0")} ` +
                `${(d.getHours()).toString().padStart(2, "0")}:${(d.getMinutes()).toString().padStart(2, "0")}]`

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
                {color: "magenta", text: "[TaskMinder]"},
                {color: "gray", text: dateStr},
                {padding: {totalWidth: 5, alignment: "right"}, color: durationColor, text: `${duration}ms`},
                {bold: true, padding: {totalWidth: 4}, text: req.method},
                {underline: true, text: req.url},
                {color: statusCodeColor, bold: true, text: res.statusCode},
                (! /2\d{2}/.test(res.statusCode)) ? `(${body})` : ""
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
