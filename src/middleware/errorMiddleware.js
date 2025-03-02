require('dotenv').config();

const errorMap = {
    "Please fill out all data. - Register": "1",
    "Classcode is wrong. - Register": "2",
    "Invalid username. - Register": "1",
    "User already registered. - Register": "1",
    "Not logged in. - Logout": "1",
    "Internal server error. - Logout": "1",
    "Please fill out all data. - Login": "0",
    "Invalid username - Login": "0",
    "User not available - Login": "2",
    "Invalid credentials - Login": "2",
    "Username not correct. - Delete": "2",
    "User not available. - Delete": "0",
    "Invaild credentials. - Delete": "2",
    "Internal server error. - Delete": "1",
    "Username already taken. - checkUsername": "1",
    "Please fill out all data. - addHomework": "1",
    "No session available - addHomework": "2",
    "Empty information while adding homework - addHomework": "1",
    "Invalid subject ID - addHomework": "1",
    "Content cannot be empty - addHomework": "1",
    "Invalid assignment date - addHomework": "1",
    "Invalid submission date - addHomework": "1",
    "No session available - checkHomeowrk": "2",
    "No session available - deleteHomework": "2",
    "Invalid homework ID - deleteHomework": "1",
    "No session available - editHomework": "2",
    "Empty information while editing homework - editHomework": "1",
    "Invalid homework ID - editHomework": "1",
    "Invalid subject ID - editHomework": "1",
    "Content cannot be empty - editHomework": "1",
    "Invalid assignment date - editHomework": "1",
    "Invalid submission date - editHomework": "1",
    "No session available - getHomeworkCheckedData": "2",
    "No session available - getJoinedTeamsData": "2",
    "No session available - setJoinedTeamsData": "2",
};

const ErrorHandler = (err, req, res, next) => {
    console.error("Error:", err.message);

    if (errorMap[err.message]) {
        return res.status(200).send(errorMap[err.message]);
    }

    res.status(err.statusCode || 500).json({
        success: false,
        status: err.statusCode || 500,
        message: err.message || 'Something went wrong',
        stack: process.env.NODE_ENV === 'DEVELOPMENT' ? err.stack : {},
    });
};

module.exports = ErrorHandler;

