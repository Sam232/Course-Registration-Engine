const router = require("express").Router();
const {ObjectID} = require("mongodb");
const validator = require("email-validator");

const Payment = require("../models/Payment");
const Course = require("../models/Course");
const RCourses = require("../models/RCourses");
const Grade = require("../models/Grade");
const StudentPD = require("../models/StudentPD");
const LecturerPD = require("../models/LecturerPD");
const RDates = require("../models/RDates");

const {verifyStudentToken} = require("../config/verifyToken");

//Welcome Page Details
router.get("/welcome/:id", verifyStudentToken, (req, res) => {
  var studentId = req.params.id;
  if(!ObjectID.isValid(studentId)){
    return res.status(404).json({
      errorMsg: "Invalid Student ID Provided"
    });
  }

  StudentPD.findById(studentId).then((studentDetails) => {
    if(studentDetails){
      return Course.find({}).populate("lecturerId").then((courses) => {
        var scrcNumber = {
          allSemestersCourses: null,
          registeredCourses: null
        };
        if(courses){
          scrcNumber.allSemestersCourses = courses;
          return RCourses.find({
            student: studentDetails._id
          }).populate("lecturerId").then((registeredCourses) => {
            if(registeredCourses){
              scrcNumber.registeredCourses = registeredCourses;
              return res.status(200).json({
                scrcNumber,
                queryState: "successful"
              });
            }
            scrcNumber.registeredCourses = [];
            res.status(200).json({
              scrcNumber,
              queryState: "successful"
            });
          })
          .catch((err) => {
            if(err){
              res.status(404).json({
                err,
                errorMsg: "Unable To Fetch Your Registered Courses, Refresh Page To Try Again"
              });
            }
          });
        }
        scrcNumber.allSemestersCourses = [];
        scrcNumber.registeredCourses = [];

        res.status(200).json({
          scrcNumber,
          queryState: "successful"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "Unable To Fetch Semester Courses, Refresh Page To Try Again"
          });
        }
      })
    }
    res.status(404).json({
      err,
      errorMsg: "No Student\'s ID Matches The Provided ID"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "An Error Occured, Refresh Page To Try Again"
      });
    }
  });
});

//Get One Student
router.get("/view/student/:id", verifyStudentToken, (req, res) => {
  var studentId = req.params.id;
  if(!ObjectID.isValid(studentId)){
    return res.status(404).json({
      errorMsg: "Provided ID Is Invalid."
    });
  }

  StudentPD.findById(studentId).then((personalDetails) => {
    if(personalDetails){
      return res.status(200).json({
        personalDetails,
        queryState: "successful"
      });
    }
    res.status(200).json({
      msg: "No Student\'s ID Matches The Provided ID",
      queryState: "unsuccessful"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch Student\'s Personal Details"
      });
    }
  });
});

//View Grade
router.get("/view/grade/:studentId/:indexNumber/:level/:semester", verifyStudentToken, (req, res) => {
  var studentDetails = {
    studentId: req.params.studentId,
    indexNumber: req.params.indexNumber,
    level: req.params.level,
    semester: req.params.semester
  };

  //Include Geolocation
  if(!ObjectID.isValid(studentDetails.studentId)){
    return res.status(404).json({
      errorMsg: "Invalid Student ID Provided"
    });
  }

  StudentPD.findById(studentDetails.studentId).then((fetchedStudent) => {
    if(fetchedStudent){
      return Payment.findOne({
        indexNumber: studentDetails.indexNumber,
        level: studentDetails.level,
        semester: studentDetails.semester
      }).then((fetchPayment) => {
        if(fetchPayment){
          if(fetchPayment.paid == "Paid"){
            return Grade.find({
              indexNumber: studentDetails.indexNumber,
              level: studentDetails.level,
              semester: studentDetails.semester
            }).then((fetchedGrade) => {
              if(fetchedGrade){
                return res.status(200).json({
                  fetchedGrade,
                  queryState: "successful"
                });
              }
              res.status(404).json({
                errorMsg: "Unable To Fetch Your Grades, Try Again"
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
          else{
            return res.status(404).json({
              errorMsg: "Please Pay The Current Semester\'s Fees To View Your Grades"
            });
          }          
        }
        res.status(404).json({
          errorMsg: "Please Pay The Current Semester\'s Fees To View Your Grades"
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
      errorMsg: "No Student\'s ID Matches The Provided ID"
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

//Fetch Courses For Registration
router.get("/register/courses/:studentId/:level/:semester", verifyStudentToken, (req, res) => {
  var studentDetails = {
    studentId: req.params.studentId,
    level: req.params.level,
    semester: req.params.semester
  };

  if(!ObjectID.isValid(studentDetails.studentId)){
    return res.status(404).json({
      errorMsg: "Invalid Student ID Provided"
    });
  }

  StudentPD.findById(studentDetails.studentId).then((fetchedStudent) => {
    if(fetchedStudent){
      return RDates.find({}).then((dates) => {
        
        if(dates.length > 0){
          var startDate = dates[0].startDate.split("/");
          var endDate = dates[0].endDate.split("/");
          
          var startDateDay = startDate[0];
          var startDateMonth = startDate[1];
          var endDateDay = endDate[0];
          var endDateMonth = endDate[1];

          var day = new Date().getDate();
          var month = new Date().getMonth() + 1;
          
          var courses = () => {
            Course.find({
              level: studentDetails.level,
              semester: studentDetails.semester
            }).populate("lecturerId").then((fetchedCourses) => {
              if(fetchedCourses){
                return res.status(200).json({
                  fetchedCourses,
                  queryState: "successful"
                });
              }
              res.status(404).json({
                errorMsg: "Unable To Fetch Courses, Try Again",
                queryState: "unsuccessful"
              });
            })
            .catch((err) => {
              if(err){
                res.status(404).json({
                  errorMsg: "Unable To Fetch Courses, Try Again",
                  queryState: "unsuccessful"
                });
              }
            });
          }
          
          if(day > endDateDay && month >= endDateMonth){
            return res.status(404).json({
              errorMsg: "Sorry, Registration Of Courses Have Been Closed"
            });
          }
          if(day < startDateDay && month <= endDateMonth){
            return res.status(404).json({
              errorMsg: "Registration Of Courses Have Not Yet Started"
            });
          }
          if(startDateDay == day && startDateMonth == month || endDateDay == day && endDateMonth == month){
            return courses();
          }
          if(day >= startDateDay && day <= endDateDay && startDateMonth == month && endDateMonth == month){
            return courses();
          }          
          if(startDateDay == 30 || startDateDay == 31 && day < startDateDay && day <= endDateDay && startDateMonth == month || endDateMonth == month){
            return courses();
          }          
        }
        else{
          return res.status(404).json({
            errorMsg: "Registration Of Courses Have Not Yet Started"
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
      errorMsg: "No Student\'s ID Matches The Provided ID"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        errorMsg: "Unable To Fetch Courses, Try Again",
        queryState: "unsuccessful"
      });
    }
  });
});

//Add Registered Course
router.post("/add/course/:studentId", verifyStudentToken, (req, res) => {
  var courseDetails = {
    code: req.body.code,
    name: req.body.name,
    creditHours: req.body.creditHours,
    level: req.body.level,
    semester: req.body.semester,
    lecturerId: req.body.lecturerId,
    student: req.params.studentId
  };

  if(!ObjectID.isValid(courseDetails.student)){
    return res.status(404).json({
      errorMsg: "Invalid Student ID Provided"
    });
  }

  if(!ObjectID.isValid(courseDetails.lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  StudentPD.findById(courseDetails.student).then((studentDetails) => {
    if(studentDetails){
      return LecturerPD.findById(courseDetails.lecturerId).then((lecturerDetails) => {
        if(lecturerDetails){
          return RCourses.findOne({
            code: courseDetails.code,
            name: courseDetails.name,
            creditHours: courseDetails.creditHours,
            level: courseDetails.level,
            semester: courseDetails.semester,
            student: courseDetails.student
          }).then((fetchCourse) => {
            if(fetchCourse){
              return res.status(200).json({
                msg: "You Have Already Registered For This Course"
              });
            }

            new RCourses(courseDetails).save().then((addedCourse) => {
              if(addedCourse){
                return res.status(200).json({
                  addedCourse,
                  addState: "successful"
                });
              }
              res.status(404).json({
                errorMsg: "Unable To Complete Registration, Try Again",
                addState: "unsuccessful"
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
          })
        }
        res.status(404).json({
          errorMsg: "No Lecturer\'s ID Matches The Provided ID"
        });
      });
    }
    res.status(404).json({
      errorMsg: "No Student\'s ID Matches The Provided ID"
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

//Delete A Registered Course
router.delete("/delete/course/:courseCode", verifyStudentToken, (req, res) => {
  var courseCode = req.params.courseCode;

  RCourses.findOne({
    code: courseCode
  }).then((courseDetails) => {
    if(courseDetails){
      return RCourses.findOneAndRemove({
        code: courseCode
      }).then((deletedCourse) => {
        if(deletedCourse){
          return res.status(200).json({
            deletedCourse,
            deleteState: "successful"
          });
        }
        res.status(404).json({
          errorMsg: "Unable To Delete Course Details, Try Again",
          deleteState: "unsuccessful"
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
      errorMsg: "No Registered Course\'s ID Matches The Provided ID"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        errorMsg: "An Error Occured, Try Again"
      });
    }
  });
});

//Update Student
router.put("/update/:id", verifyStudentToken, (req, res) => {
  var studentDetails = {
    id: req.params.id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    mobileNumber: req.body.mobileNumber,
    indexNumber: req.body.indexNumber
  };

  if(!ObjectID.isValid(studentDetails.id)){
    return res.status(404).json({
      errorMsg: "Invalid Student ID Provided"
    });
  }

  if(!validator.validate(studentDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(studentDetails.mobileNumber.length !== 10 && studentDetails.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      errorMsg: "Valid Mobile Number Is Required"
    });
  }

  StudentPD.find({
    _id: {$ne: studentDetails.id}
  }).then((students) => {
    var newStudent = students.filter(student => student.email == studentDetails.email || student.mobileNumber == studentDetails.mobileNumber || student.indexNumber == studentDetails.indexNumber);

    if(newStudent.length > 0){
      if(newStudent[0].email == studentDetails.email){
        return res.status(404).json({
          errorMsg: "Provided Email Address Of The Student Already Exist"
        });
      }
      else if(newStudent[0].mobileNumber == studentDetails.mobileNumber){
        return res.status(404).json({
          errorMsg: "Provided Mobile Number Of The Student Already Exist"
        });
      }
      else{
        return res.status(404).json({
          errorMsg: "Provided Index Number Of The Student Already Exist"
        });
      }
    }

    StudentPD.findByIdAndUpdate(studentDetails.id, {
      $set: {
        firstName: studentDetails.firstName,
        lastName: studentDetails.lastName,
        email: studentDetails.email,
        mobileNumber: studentDetails.mobileNumber,
        indexNumber: studentDetails.indexNumber
      }
    }, {new: false}).then((oldDetails) => {
      if(oldDetails){
        return StudentLogin.findOneAndUpdate({
          indexNumber: oldDetails.indexNumber
        }, {
          $set: {
            indexNumber: studentDetails.indexNumber
          }
        }, {new: true}).then((newLoginDetails) => {
          if(newLoginDetails){
            return res.status(200).json({
              updateState: "successful"
            });
          }
          res.status(404).json({
            errorMsg: "Update Unsuccessful"
          });
        })
        .catch((err) => {
          if(err){
            res.status(404).json({
              err,
              errorMsg: "Update Unsuccessful"
            });
          }
        });
      }
      res.status(404).json({
        errorMsg: "Unable To Update Your Personal Details"
      });
    })
    .catch((err) => {
      res.status(404).json({
        err,
        errorMsg: "Unable To Update Your Personal Details"
      });
    });
  })
  .catch((err) => {
    res.status(404).json({
      err,
      errorMsg: "Unable To Fetch The Documents Containing The Student\'s PD"
    });
  });
});

//Update Student-Login
router.put("/update/student-login/", verifyStudentToken, (req, res) => {
  var loginDetails = {
    indexNumber: req.body.indexNumber,
    oldPassword: req.body.oldPassword,
    newPassword: req.body.newPassword
  };

  if(loginDetails.oldPassword.length < 8){
    return res.status(404).json({
      errorMsg: "The Length Of The Old Password Must Greater Than 8"
    });
  }

  if(loginDetails.newPassword.length < 8){
    return res.status(404).json({
      errorMsg: "The Length Of The New Password Must Greater Than 8"
    });
  }

  if(loginDetails.oldPassword == loginDetails.newPassword){
    return res.status(404).json({
      errorMsg: "The Old And New Password Must Not Be The Same"
    });
  }

  if(!/[^a-zA-Z0-9]/.test(loginDetails.newPassword)){
    return res.status(404).json({
      errorMsg: "The New Password Must Contain Alphabets And A Symbol. Numbers Can Be Included But It Is Optional"
    });
  }

  StudentLogin.findOne({
    indexNumber: loginDetails.indexNumber
  }).then((studentLoginDetails) => {
    if(studentLoginDetails){
      return bcrypt.compare(loginDetails.oldPassword, studentLoginDetails.password).then((result) => {
        if(result){
          return bcrypt.hash(loginDetails.newPassword, 10).then((hash) => {
            if(hash){
              return StudentLogin.findOneAndUpdate({
                indexNumber: loginDetails.indexNumber
              }, {
                $set: {
                  password: hash
                }
              }, {new: true}).then((updatedLoginDetails) => {
                if(updatedLoginDetails){
                  return res.status(200).json({
                    updateState: "successful"
                  });
                }
                res.status(200).json({
                  updateState: "unsuccessful"
                });
              })
              .catch((err) => {
                if(err){
                  res.status(404).json({
                    errorMsg: "An Error Occurred While Updating Login Details, Try Again"
                  });
                }
              });
            }
            res.status(404).json({
              errorMsg: "An Error Occurred While Updating Login Details, Try Again"
            });
          })
          .catch((err) => {
            if(err){
              res.status(404).json({
                errorMsg: "An Error Occurred While Updating Login Details, Try Again"
              });
            }
          })
        }
        res.status(404).json({
          errorMsg: "The Old Password Provided Is Incorrect"
        });
      })
      .catch((err) => {
        if(err){
          console.log(err)
          res.status(404).json({
            errorMsg: "An Error Occurred, Try Again"
          });
        }
      });
    }
    res.status(404).json({
      errorMsg: "No Student\'s Index Number Matches The Provided Index Number"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        errorMsg: "An Error Occurred, Try Again"
      });
    }
  });
});

module.exports = router;