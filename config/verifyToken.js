const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const Login = require("../models/Login");
const StudentLogin = require("../models/StudentLogin");

module.exports = {
  verifyToken: (req, res, next) => {
    var bearerHeader = req.headers["authorization"];
    if(typeof bearerHeader !== "undefined"){
      var bearer = bearerHeader.split(" ");
      var token = bearer[1];

      if(token){
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
          Login.findById(authData.userDetails.queryId).then((loginDetails) => {
            if(loginDetails){
              return bcrypt.compare(authData.userDetails.password, loginDetails.password).then((result) => {
                if(result){
                  req.user = authData;
                  return next();
                }
                res.status(404).json({
                  errorMsg: "An Error Occured, Try Again"
                });
              })
              .catch((err) => {
                if(err){
                  return res.status(404).json({
                    err,
                    errorMsg: "An Error Occured, Try Again"
                  });
                }
              });
            }
            res.status(404).json({
              errorMsg: "You Have Logged Out, Login Again"
            });
          })
          .catch((err) => {
            if(err){
              return res.status(404).json({
                err,
                errorMsg: "An Error Occured, Try Again"
              });
            }
          });
        });
      }
      else{
        return res.status(404).json({
          errorMsg: "Incorrect Login Credentials Provided"
        });
      }
    }
    res.status(404).json({
      errorMsg: "Token Is Required"
    });
  },
  verifyStudentToken: (req, res, next) => {
    var bearerHeader = req.headers["authorization"];
    
    if(bearerHeader !== "undefined"){
      var bearer = bearerHeader.split(" ");
      var token = bearer[1];

      if(token){
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
          StudentLogin.findById(authData.user.loginId).then((loginDetails) => {
            if(loginDetails){
              if(loginDetails.currentState == "loggedin"){
                return next();
              }
              else{
                return res.status(404).json({
                  errorMsg: "You Have Logged Out, Login Again"
                });
              }
            }
          })
          .catch((err) => {
            if(err){
              res.status(404).json({
                err,
                errorMsg: "An Error Occured, Try Again"
              });
            }
          });
        });
      }
    }
    res.status(404).json({
      errorMsg: "Token Is Required"
    });
  },
  verifyUpdateToken: (req, res, next) => {
    var bearerHeader = req.headers["authorization"];
    
    if(bearerHeader !== "undefined"){
      var bearer = bearerHeader.split(" ");
      var token = bearer[1];

      if(token){
        return jwt.verify(token, "secretKey", (err, authData) => {
          if(err){
            if(err.name == "TokenExpiredError"){
              return res.status(404).json({
                errorMsg: "The Password Update Link Has Expired"
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
          StudentLogin.findOne({
            indexNumber: authData.indexNumber
          }).then((loginDetails) => {
            if(loginDetails){
              if(loginDetails){
                req.indexNumber = authData.indexNumber;
                return next();
              }
            }
          })
          .catch((err) => {
            if(err){
              res.status(404).json({
                err,
                errorMsg: "An Error Occured, Try Again"
              });
            }
          });
        });
      }
    }
    res.status(404).json({
      errorMsg: "Token Is Required"
    });
  },
  verifyPageToken: (req, res, next) => {
    var bearerHeader = req.headers["authorization"];

    if(bearerHeader !== undefined){
      var bearer = bearerHeader.split(" ");
      var token = bearer[1];

      if(token){
        return jwt.verify(token, "secretKey", (err, authData) => {
          if(err){
            if(err.name == "TokenExpiredError"){
              return res.status(404).json({
                errorMsg: "The Password Update Link Has Expired"
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
          next();
        });
      }
    }
    res.status(404).json({
      errorMsg: "Token Is Required"
    });
  }
};