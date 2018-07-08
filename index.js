const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

//App Routes
const admin = require("./routes/admin");
const finance = require("./routes/finance");
const lecturer = require("./routes/lecturer");
const student = require("./routes/student");
const login = require("./routes/login");
const logout = require("./routes/logout");

//Connect To MongoDB Database Server
require("./config/database").dbConnect(mongoose);

var app = express();

//BodyParser Middleware
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

//Handling App Routes
app.use("/admin", admin);
app.use("/finance", finance);
app.use("/lecturer", lecturer);
app.use("/student", student);
app.use("/login", login);
app.use("/logout", logout);

app.use((req, res, next) => {
  res.status(200).json({
    message: "Welcome To GTUC CR RestAPI"
  });
});

var PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Started On Port ${PORT}`);
});
