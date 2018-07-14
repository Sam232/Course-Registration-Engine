const router = require("express").Router();
const jwt = require("jsonwebtoken");
const Mailgun = require("mailgun-js");
const validator = require("email-validator");
const generatePassword = require("generate-password");
const bcrypt = require("bcrypt");

const AdminPD = require("../models/AdminPD");
const LecturerPD = require("../models/LecturerPD");
const FinancePD = require("../models/FinancePD");
const StudentPD = require("../models/StudentPD");
const StudentLogin = require("../models/StudentLogin");
const Login = require("../models/Login");

const {EmailAPI} = require("../config/EmailAPI");

const {verifyUpdateToken} = require("../config/verifyToken");

//Verify LinkID
router.get("/verify/:linkId", (req, res) => {
  var linkId = req.params.linkId;

  LecturerPD.findOne({
    linkId
  }).then((result) => {
    if(result){
      return res.status(200).json({
        verifyState: "Correct LinkId"
      });
    }
    FinancePD.findOne({
      linkId
    }).then((result) => {
      if(result){
        return res.status(200).json({
          verifyState: "Correct LinkId"
        });
      }
      AdminPD.findOne({
        linkId
      }).then((result) => {
        if(result){
          return res.status(200).json({
            verifyState: "Correct LinkId"
          });
        }        
        res.status(404).json({
          verifyState: "Incorrect LinkId"
        });      
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "An Error Occured, Try Again"
          });
        }
      });      
    })
    .catch((err) => {
      if(err){
        res.status(404).json({
          err,
          errorMsg: "An Error Occured, Try Again"
        });
      }
    });
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

//Login Auth For Lecturers, Financial Accountant And Admin
router.post("/:linkId", (req, res) => {
  var email = req.body.email;
  var linkId = req.params.linkId;

  if(!validator.validate(email)){
    return res.status(404).json({
      errorMsg: "A Valid Email Address Is Required"
    });
  }

  LecturerPD.findOne({
    email,
    linkId
  }).then((lecturerDetails) => {
    if(lecturerDetails){
      lecturerDetails.password = generatePassword.generate({
        length: 10,
        numbers: true,
        symbols: true
      });

      return bcrypt.hash(lecturerDetails.password, 10).then((hash) => {
        if(hash){
          return new Login({
            role: lecturerDetails.role,
            password: hash
          }).save().then((newLoginDetails) => {
            if(newLoginDetails){
              var userDetails = {
                user: lecturerDetails,
                password: lecturerDetails.password,
                queryId: newLoginDetails._id
              };
              return jwt.sign({userDetails}, "secretKey", {expiresIn: "24h"}, (err, token) => {
                if(err){
                  return res.status(404).json({
                    errorMsg: "An Error Occured, Try Again"
                  });
                }
    
                var message = `Dear ${lecturerDetails.firstName}, you can login to GTUC COURSE-REG using this <a href=http://localhost:3000/lecturer/welcome/${token}>LOGIN LINK</a>. Please note that, this link is valid for only 24 hours and also becomes inactive after you logout from the application.`;
                
                EmailAPI(Mailgun, lecturerDetails, message).then((sent) => {
                  if(sent){
                    return res.status(200).json({
                      user: {
                        details: userDetails.user,
                        token
                      },
                      authMsg: "Your Login Link Has Been Sent To Your E-Mail",
                      authState: "successful"
                    });
                  }
                })
                .catch((err) => {
                  if(err){
                    res.status(404).json({
                      err,
                      authState: "unsuccessful",
                      errorMsg: "An Error Occured, Try Again"
                    });
                  }
                });
              });
            }
            res.status(404).json({
              errorMsg: "An Error Occured, Try Again"
            });
          })
          .catch((err) => {
            if(err){
              res.status(404).json({
                errorMsg: "An Error Occured, Try Again"
              });
            }
          });
        }
        res.status(404).json({
          errorMsg: "An Error Occured, Try Again"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "An Error Occured, Try Again"
          });
        }
      });
    }

    FinancePD.findOne({
      email,
      linkId
    }).then((financeDetails) => {
      if(financeDetails){
        financeDetails.password = generatePassword.generate({
          length: 10,
          numbers: true,
          symbols: true
        });
  
        return bcrypt.hash(financeDetails.password, 10).then((hash) => {
          if(hash){
            return new Login({
              role: financeDetails.role,
              password: hash
            }).save().then((newLoginDetails) => {
              if(newLoginDetails){
                var userDetails = {
                  user: financeDetails,
                  queryId: newLoginDetails._id,
                  password: financeDetails.password
                };
                return jwt.sign({userDetails}, "secretKey", {expiresIn: "24h"}, (err, token) => {
                  if(err){
                    return res.status(404).json({
                      errorMsg: "An Error Occured, Try Again"
                    });
                  }
                  
                  var message = `Dear ${financeDetails.firstName}, you can login to GTUC COURSE-REG using this <a href=http://localhost:3000/finance/welcome/${token}>LOGIN LINK</a>. Please note that, this link is valid for only 24 hours and also becomes inactive after you logout from the application.`;
    
                  EmailAPI(Mailgun, financeDetails, message).then((sent) => {
                    if(sent){
                      return res.status(200).json({
                        user: {
                          details: userDetails.user,
                          token
                        },
                        authMsg: "Your Login Link Has Been Sent To Your E-Mail",
                        authState: "successful"
                      });
                    }
                  })
                  .catch((err) => {
                    if(err){
                      res.status(404).json({
                        err,
                        authState: "unsuccessful",
                        errorMsg: "An Error Occured, Try Again"
                      });
                    }
                  });
                });
              }
              res.status(404).json({
                errorMsg: "An Error Occured, Try Again"
              });
            })
            .catch((err) => {
              if(err){
                res.status(404).json({
                  err,
                  errorMsg: "An Error Occured, Try Again"
                });
              }
            });
          }
          res.status(404).json({
            errorMsg: "An Error Occured, Try Again"
          });
        })
        .catch((err) => {
          if(err){
            res.status(404).json({
              err,
              errorMsg: "An Error Occured, Try Again"
            });
          }
        });
      }

      AdminPD.findOne({
        email,
        linkId
      }).then((adminDetails) => {
        if(adminDetails){
          adminDetails.password = generatePassword.generate({
            length: 10,
            numbers: true,
            symbols: true
          });
    
          return bcrypt.hash(adminDetails.password, 10).then((hash) => {
            if(hash){
              return new Login({
                role: adminDetails.role,
                password: hash
              }).save().then((newLoginDetails) => {
                if(newLoginDetails){
                  var userDetails = {
                    user: adminDetails,
                    queryId: newLoginDetails._id,
                    password: adminDetails.password
                  };
                  return jwt.sign({userDetails}, "secretKey", {expiresIn: "24h"}, (err, token) => {
                    if(err){
                      return res.status(404).json({
                        errorMsg: "An Error Occured, Try Again"
                      });
                    }
                    
                    var message = `Dear ${adminDetails.firstName}, you can login to GTUC COURSE-REG using this <a href=http://localhost:3000/admin/welcome/${token}>LOGIN LINK</a>. Please note that, this link is valid for only 24 hours and also becomes inactive after you logout from the application.`;
      
                    EmailAPI(Mailgun, adminDetails, message).then((sent) => {
                      if(sent){
                        return res.status(200).json({
                          user: {
                            details: userDetails.user,
                            token
                          },
                          authMsg: "Your Login Link Has Been Sent To Your E-Mail",
                          authState: "successful"
                        });
                      }
                    })
                    .catch((err) => {
                      if(err){
                        res.status(404).json({
                          err,
                          authState: "unsuccessful",
                          errorMsg: "An Error Occured, Try Again"
                        });
                      }
                    });
                  });
                }
                res.status(404).json({
                  errorMsg: "An Error Occured, Try Again"
                });
              })
              .catch((err) => {
                if(err){
                  res.status(404).json({
                    err,
                    errorMsg: "An Error Occured, Try Again"
                  });
                }
              });
            }
            res.status(404).json({
              errorMsg: "An Error Occured, Try Again"
            });
          })
          .catch((err) => {
            if(err){
              res.status(404).json({
                err,
                errorMsg: "An Error Occured, Try Again"
              });
            }
          });
        }    
        res.status(404).json({
          authState: "unsuccessful",
          errorMsg: "Incorrect Login Credentials Provided"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "An Error Occured, Try Again"
          });
        }
      });
    })
    .catch((err) => {
      if(err){
        res.status(404).json({
          err,
          errorMsg: "An Error Occured, Try Again"
        });
      }
    });
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

//Login Auth For Student
router.post("/", (req, res) => {
  var studentDetails = {
    indexNumber: req.body.indexNumber,
    password: req.body.password
  };

  StudentLogin.findOne({
    indexNumber: studentDetails.indexNumber
  }).then((fetchedDetails) => {
    if(fetchedDetails){
      console.log(fetchedDetails)
      return bcrypt.compare(studentDetails.password, fetchedDetails.password).then((result) => {
        if(result){
          return StudentLogin.findByIdAndUpdate(fetchedDetails._id, {
            $set: {
              currentState: "loggedin"
            }
          }, {new: true}).then((updatedDetails) => {
            if(updatedDetails){
              return StudentPD.findOne({
                indexNumber: updatedDetails.indexNumber
              }).then((studentDetails) => {
                if(studentDetails){
                  var user = {
                    studentDetails,
                    loginId: updatedDetails._id
                  };
                  return jwt.sign({user}, "secretKey", {expiresIn: "24h"}, (err, token) => {
                    if(err){
                      return res.status(404).json({
                        err,
                        errorMsg: "An Error Occured, Try Again"
                      });
                    }
                    res.status(200).json({
                      user: {
                        details: studentDetails,
                        token
                      },
                      authState: "successful"
                    });
                  });
                }
                res.status(404).json({
                  err,
                  errorMsg: "An Error Occured, Try Again"
                });
              })
              .catch((err) => {
                if(err){
                  res.status(404).json({
                    err,
                    errorMsg: "An Error Occured, Try Again"
                  });
                }
              });
            }
            res.status(404).json({
              errorMsg: "An Error Occured, Try Again"
            });
          })
          .catch((err) => {
            if(err){
              res.status(404).json({
                err,
                errorMsg: "An Error Occured, Try Again"
              });
            }
          });
        }
        res.status(404).json({
          errorMsg: "Incorrect Login Credentials Provided",
          authState: "unsuccessful"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "An Error Occured, Try Again"
          });
        }
      });
    }
    res.status(404).json({
      errorMsg: "Incorrect Login Credentials Provided",
      authState: "unsuccessful"
    });
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

//Verify Student Email 
router.post("/verify/student-email", (req, res) => {
  var email = req.body.email;

  if(validator.validate(email)){
    return StudentPD.findOne({
      email
    }).then((studentDetails) => {
      if(studentDetails){
        return jwt.sign({indexNumber: studentDetails.indexNumber}, "secretKey", {expiresIn: "300000"}, (err, token) => {
          if(err){
            return res.status(404).json({
              err,
              errorMsg: "An Error Occured, Try Again"
            });
          }

          var message = `Dear, ${studentDetails.firstName}, you made a request to update your password. Click on this <a href=http://localhost:3000/login/update/password/${token}>UpdatePasswordLink</a> to update your password otherwise ignore it if it was not you. Please take note that the update link password will be inactive after 5 minutes.`;

          EmailAPI(Mailgun, studentDetails, message).then((sent) => {
            if(sent){
              return res.status(200).json({
                msg: "A password update link has been sent to your email.",
                emailSent: true
              });
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
      res.status(404).json({
        errorMsg: "Email Address Does Not Exist"
      });
    })
    .catch((err) => {
      if(err){
        res.status(404).json({
          errorMsg: "Email Address Does Not Exist"
        });
      }
    });
  }
  res.status(404).json({
    errorMsg: "Valid Email Address Is Required"
  });
});

//Update Student Password
router.post("/update/password", verifyUpdateToken, (req, res) => {
  var loginDetails = {
    indexNumber: req.indexNumber,
    password: req.body.password
  };

  if(loginDetails.password){
    return bcrypt.hash(loginDetails.password, 10).then((hash) => {
      if(hash){
        return StudentLogin.findOneAndUpdate({
          indexNumber: loginDetails.indexNumber
        }, {
          $set: {
            password: hash
          }
        }, {new: true}).then((updatedDetails) => {
          if(updatedDetails){
            return res.status(200).json({
              msg: "Password Updated Successfully",
              updateState: "successful"
            });
          }
          res.status(404).json({
            errorMsg: "Unable To Update Password, Try Again",
            updatedState: "unsuccessful"
          });
        })
        .catch((err) => {
          if(err){
            res.status(404).json({
              err,
              errorMsg: "An Error Occured, Try Again"
            });
          }
        });
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
  }
  res.status(404).json({
    errorMsg: "Password Is Required"
  });
});


module.exports = router;