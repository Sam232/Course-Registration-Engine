const routes = require("express").Router();
const jwt = require("jsonwebtoken");

const {verifyToken} = require("../config/verifyToken");
const {verifyStudentToken} = require("../config/verifyToken");

const Login = require("../models/Login");
const StudentLogin = require("../models/StudentLogin");

routes.post("/", verifyToken, (req, res) => {
  var bearerHeader = req.headers["authorization"];

  if(bearerHeader !== "undefined"){
    var bearer = bearerHeader.split(" ");
    var token = bearer[1];

    return jwt.verify(token, "secretKey", (err, authData) => {
      if(err){
        if(err.name == "TokenExpiredError"){
          return res.status(404).json({
            errorMsg: "Your Session Has Already Expired"
          });
        }
        if(err.message == "invalid token"){
          return res.status(404).json({
            errorMsg: "Valid Token Required"
          });
        }
        if(err.message == "jwt malformed"){
          return res.status(404).json({
            errorMsg: "Valid Token Required"
          });
        }
      }

      Login.findByIdAndRemove(authData.userDetails.queryId).then((deletedLoginDetails) => {
        if(deletedLoginDetails){
          return res.status(200).json({
            message: "Logout Successful",
            logoutState: "successful"
          });
        }
        res.status(404).json({
          message: "Logout Unsuccessful",
          logoutState: "unsuccessful"
        });
      });
    });
  }
  res.status(404).json({
    errorMsg: "Token Is Required"
  });
});

routes.post("/student", verifyStudentToken, (req, res) => {
  var bearerHeader = req.headers["authorization"];

  if(bearerHeader !== "undefined"){
    var bearer = bearerHeader.split(" ");
    var token = bearer[1];

    return jwt.verify(token, "secretKey", (err, authData) => {
      if(err){
        if(err.name == "TokenExpiredError"){
          return res.status(404).json({
            errorMsg: "Login Session Expired, Login Again"
          });
        }
        if(err.message == "invalid token"){
          return res.status(404).json({
            errorMsg: "Valid Token Required"
          });
        }
        if(err.message == "jwt malformed"){
          return res.status(404).json({
            errorMsg: "Valid Token Required"
          });
        }
      }

      StudentLogin.findByIdAndUpdate(authData.user.loginId, {
        $set: {
          currentState: "loggedout"
        }
      }, {new: true}).then((updatedLoginDetails) => {
        if(updatedLoginDetails){
          return res.status(200).json({
            message: "Logout Successful",
            logoutState: "successful"
          });
        }
        res.status(404).json({
          message: "Logout Unsuccessful",
          logoutState: "unsuccessful"
        });
      });
    });
  }
  res.status(404).json({
    errorMsg: "Token Is Required"
  });
});

module.exports = routes;