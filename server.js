//app.js

const express = require('express');

const app = express();
const PORT = 3000;

app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/public/main.html');
});

app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is successfully running on "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
);