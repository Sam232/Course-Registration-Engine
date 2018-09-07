const router = require("express").Router();
const {ObjectID} = require("mongodb");
const Twilio = require("twilio");
const Mailgun = require("mailgun-js");
const validator = require("email-validator"); 

const Course = require("../models/Course");
const SCourse = require("../models/SCourse");
const Grade = require("../models/Grade");
const LecturerPD = require("../models/LecturerPD");
const StudentPD = require("../models/StudentPD");
const RCourses = require("../models/RCourses");

const {EmailAPI} = require("../config/EmailAPI");
const {SMSAPI} = require("../config/SMSAPI");
const {verifyToken} = require("../config/verifyToken");

//Welcome Page Details
router.get("/welcome/:id", verifyToken, (req, res) => {
  var lecturerId = req.params.id;
  if(!ObjectID.isValid(lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  var sgcNumber = {};
  Grade.count({
    lecturerId 
  }).then((gradesNumber) => {
    sgcNumber.grades = gradesNumber || 0;

    Course.count({
      lecturerId
    }).then((courseNumber) => {
      sgcNumber.courses = courseNumber || 0;

      RCourses.count({
        lecturerId
      }).then((rcoursesNumber) => {
        sgcNumber.rcourses = rcoursesNumber || 0;
        res.status(200).json({
          queryState: "successful",
          sgcNumber
        });
      })
      .catch((err) => {
        res.status(404).json({
          err,
          errorMsg: "Unable To Fetch The Students Who Have Registered For Your Courses"
        });
      });
    })
    .catch((err) => {
      if(err){
        res.status(404).json({
          err,
          errorMsg: "Unable To Fetch The Courses You\'ve Added"
        });
      }
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch The Grades You\'ve Added"
      });
    }
  });
});

//Get One Lecturer
router.get("/view/lecturer/:id", verifyToken, (req, res) => {
  var lecturerId = req.params.id;
  if(!ObjectID.isValid(lecturerId)){
    return res.status(404).json({
      errorMsg: "Provided ID Is Invalid."
    });
  }

  LecturerPD.findById(lecturerId).then((personalDetails) => {
    if(personalDetails){
      return res.status(200).json({
        personalDetails,
        queryState: "successful"
      });
    }
    res.status(404).json({
      errorMsg: "No Lecturer\'s ID Does Not Match The Provided ID"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch Lecturer\'s Personal Details"
      });
    }
  });
});

//Confirm Lecturer's Update
router.post("/confirm-update", verifyToken, (req, res) => {
  var emailDetails = {
    firstName: req.body.firstName,
    email: req.body.lecturerEmail,
    loginToken: req.body.loginToken,
    token: req.body.token
  }
  
  if(!validator.validate(emailDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  var message = `Dear ${emailDetails.firstName}, you have requested to update your profile details. If it was you click on this link <a href=https://gtuccr.herokuapp.com/lecturer/confirm-update/${emailDetails.loginToken}/${emailDetails.token}/ target=_blank>UPDATE PROFILE</a> to confirm the update otherwise ignore it if it was not you. Please note that you will not be able to make the update after 5 minutes`;

  EmailAPI(Mailgun, emailDetails, message).then((sent) => {
    if(sent){
      return res.status(200).json({
        emailSent: true
      });
    }
  })
  .catch((err) => {
    if(err){
      return res.status(404).json({
        err,
        emailSent: false
      });
    }
  });
});

//Update Lecturer's Details
router.put("/update/lecturer/:id", verifyToken, (req, res) => {
  var lecturerDetails = {
    id: req.params.id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    mobileNumber: req.body.mobileNumber
  };

  if(!ObjectID.isValid(lecturerDetails.id)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  if(!validator.validate(lecturerDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(lecturerDetails.mobileNumber.length !== 10 && lecturerDetails.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      errorMsg: "Valid Mobile Number Is Required"
    });
  }

  LecturerPD.findByIdAndUpdate(lecturerDetails.id, {
    $set: {
      firstName: lecturerDetails.firstName,
      lastName: lecturerDetails.lastName,
      email: lecturerDetails.email,
      mobileNumber: lecturerDetails.mobileNumber
    }
  }, {new: true}).then((updatedDetails) => {
    if(updatedDetails){
      return res.status(200).json({
        LecturerPD: updatedDetails,
        updateState: "successful"
      });
    }
    res.status(404).json({
      updateState: "unsuccessful",
      errorMsg: "Update Unsuccessful, Try Again"
    });
  })
  .catch((err) => {
    res.status(404).json({
      err,
      errorMsg: "Update Unsuccessful, Try Again"
    });
  });
});

//CRUD COURSES
//Add Course
router.post("/add/course/:lecturerId", verifyToken, (req, res) => {
  var newCourse = {
    code: req.body.code,
    name: req.body.name,
    creditHours: req.body.creditHours,
    level: req.body.level,
    semester: req.body.semester,
    lecturerId: req.params.lecturerId
  };

  if(!ObjectID.isValid(newCourse.lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  LecturerPD.findById(newCourse.lecturerId).then((lecturerDetails) => {
    if(lecturerDetails){
      return Course.find({}).then((fetchedCourses) => {
        if(fetchedCourses.length > 0){
          var existingCourses = fetchedCourses.filter(courses => courses.code == newCourse.code || courses.name == newCourse.name);

          if(existingCourses.length > 0){
            if(existingCourses[0].code == newCourse.code){
              return res.status(404).json({
                errorMsg: "Course Code Already Exist",
                addState: "unsuccessful"
              });
            }
            else{
              return res.status(404).json({
                errorMsg: "Course Name Already Exist",
                addState: "unsuccessful"
              });
            }
          }
          else{
            return new Course(newCourse).save().then((courseDetails) => {
              if(courseDetails){
                return SCourse.findOne({
                  code: courseDetails.code,
                  name: courseDetails.name
                }).then((savedCourse) => {
                  if(savedCourse){
                    return res.status(200).json({
                      courseDetails,
                      addState: "successful"
                    });
                  }
                  new SCourse(newCourse).save().then((scourseDetails) => {
                    if(scourseDetails){
                      return res.status(200).json({
                        courseDetails,
                        addState: "successful"
                      });
                    }
                    res.status(200).json({
                      courseDetails,
                      addState: "successful",
                      msg: "Unable To Course Save. Delete And Add Again"
                    });
                  })
                  .catch((err) => {
                    if(err){
                      res.status(404).json({
                        err,
                        errorMsg: "Unable To Course Save. Delete And Add Again",
                        addState: "unsuccessful"
                      });
                    }
                  }); 
                })
                .catch((err) => {
                  if(err){
                    res.status(404).json({
                      err,
                      errorMsg: "An Error Occured. Delete Added Course And Add Again",
                      addState: "unsuccessful"
                    });
                  }
                });               
              }
              res.status(404).json({
                errorMsg: "Unable To Add New Course, Try Again",
                addState: "unsuccessful"
              });
            })
            .catch((err) => {
              if(err){
                res.status(404).json({
                  err,
                  errorMsg: "Unable To Add New Course, Try Again",
                  addState: "unsuccessful"
                });
              }
            });
          }          
        }

        new Course(newCourse).save().then((courseDetails) => {
          if(courseDetails){
            return SCourse.findOne({
              code: courseDetails.code,
              name: courseDetails.name
            }).then((savedCourse) => {
              if(savedCourse){
                return res.status(200).json({
                  courseDetails,
                  addState: "successful"
                });
              }
              new SCourse(newCourse).save().then((scourseDetails) => {
                if(scourseDetails){
                  return res.status(200).json({
                    courseDetails,
                    addState: "successful"
                  });
                }
                res.status(200).json({
                  courseDetails,
                  addState: "successful",
                  msg: "Unable To Course Save. Delete And Add Again"
                });
              })
              .catch((err) => {
                if(err){
                  res.status(404).json({
                    err,
                    errorMsg: "Unable To Course Save. Delete And Add Again",
                    addState: "unsuccessful"
                  });
                }
              }); 
            })
            .catch((err) => {
              if(err){
                res.status(404).json({
                  err,
                  errorMsg: "An Error Occured. Delete Added Course And Add Again",
                  addState: "unsuccessful"
                });
              }
            });               
          }
          res.status(404).json({
            errorMsg: "Unable To Add New Course, Try Again",
            addState: "unsuccessful"
          });
        })
        .catch((err) => {
          if(err){
            res.status(404).json({
              err,
              errorMsg: "Unable To Add New Course, Try Again",
              addState: "unsuccessful"
            });
          }
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
      errorMsg: "No Lecturer\'s ID Matches The Provided Lecturer ID"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        errorMsg: "An Error Occured While Verifying The Lecturer\'s ID, Try Again"
      });
    }
  });
});

//Get One Course
router.get("/view/single/course/:id", verifyToken, (req, res) => {
  var courseId = req.params.id;
  if(!ObjectID.isValid(courseId)){
    return res.status(404).json({
      errorMsg: "Provided ID Is Invalid."
    });
  }

  Course.findById(courseId).then((courseDetails) => {
    if(courseDetails){
      return res.status(200).json({
        courseDetails,
        queryState: "successful"
      });
    }
    res.status(200).json({
      msg: "No Course\'s ID Matches The Provided ID",
      queryState: "unsuccessful"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch The Course\'s Details"
      });
    }
  });
});

//View Lecturer's Courses
router.get("/view/course/:lecturerId", verifyToken, (req, res) => {
  var lecturerId = req.params.lecturerId;

  if(!ObjectID.isValid(lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  LecturerPD.findById(lecturerId).then((lecturerDetails) => {
    if(lecturerDetails){
      return Course.find({
        lecturerId
      }).then((courses) => {
        if(courses.length > 0){
          return res.status(200).json({
            courses,
            queryState: "successful"
          });
        } 
        res.status(200).json({
          courses: [],
          queryState: "successful"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            errorMsg: "An Error Occurered While Fetching Courses, Try Again"
          });
        }
      });
    }
    res.status(404).json({
      errorMsg: "No Lecturer\'s ID Matches The Provided ID"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        errorMsg: "An Error Occurered While Verifying The Provided Lecturer ID, Try Again"
      });
    }
  });
});

//Update Course
router.put("/update/course/:courseId", verifyToken, (req, res) => {
  var courseDetails = {
    id: req.params.courseId,
    code: req.body.code,
    name: req.body.name,
    creditHours: req.body.creditHours,
    level: req.body.level,
    semester: req.body.semester
  };

  if(!ObjectID.isValid(courseDetails.id)){
    return res.status(404).json({
      errorMsg: "Invalid Course ID Provided"
    });
  }

  Course.findById(courseDetails.id).then((course) => {
    if(course){
      return Course.find({
        _id: {$ne: courseDetails.id}
      }).then((fetchedCourses) => {
        if(fetchedCourses.length > 0){
          var existingCourses = fetchedCourses.filter(course => course.code == courseDetails.code || course.name == courseDetails.name);

          if(existingCourses.length > 0){
            if(existingCourses[0].code == courseDetails.code){
              return res.status(404).json({
                errorMsg: "This Course Code Has Been Used As The Code For A Different Course",
                updateState: "unsuccessful"
              });
            }
            else{
              return res.status(404).json({
                errorMsg: "This Course Name Has Been Used As The Name For A Different Course",
                updateState: "unsuccessful"
              });
            } 
          }
          else{
            return Course.findByIdAndUpdate(courseDetails.id, {
              $set: {
                code: courseDetails.code,
                name: courseDetails.name,
                creditHours: courseDetails.creditHours,
                level: courseDetails.level,
                semester: courseDetails.semester
              }
            }, {new: false}).then((oldCourse) => {
              if(oldCourse){
                return SCourse.findOneAndUpdate({
                  code: oldCourse.code,
                  name: oldCourse.name
                }, {
                  $set: {
                    code: courseDetails.code,
                    name: courseDetails.name,
                    creditHours: courseDetails.creditHours,
                    level: courseDetails.level,
                    semester: courseDetails.semester
                  }
                }, {new: true}).then((updatedCourse) => {
                  if(updatedCourse){
                    return res.status(200).json({
                      updatedCourse,
                      updateState: "successful"
                    });
                  }
                  res.status(404).json({
                    errorMsg: "Unable To Update Saved Course Details, Update Course Again",
                    updateState: "unsuccessful"
                  });
                })
                .catch((err) => {
                  if(err){
                    res.status(404).json({
                      errorMsg: "Unable To Update Saved Course Details, Update Course Again",
                      updateState: "unsuccessful"
                    });
                  }
                });
              }
              res.status(404).json({
                errorMsg: "Unable To Update Course Details, Try Again",
                updateState: "unsuccessful"
              });
            })
            .catch((err) => {
              if(err){
                res.status(404).json({
                  errorMsg: "Unable To Update Course Details, Try Again",
                  updateState: "unsuccessful"
                });
              }
            });
          } 
        }
        Course.findByIdAndUpdate(courseDetails.id, {
          $set: {
            code: courseDetails.code,
            name: courseDetails.name,
            creditHours: courseDetails.creditHours,
            level: courseDetails.level,
            semester: courseDetails.semester
          }
        }, {new: false}).then((oldCourse) => {
          if(oldCourse){
            return SCourse.findOneAndUpdate({
              code: oldCourse.code,
              name: oldCourse.name
            }, {
              $set: {
                code: courseDetails.code,
                name: courseDetails.name,
                creditHours: courseDetails.creditHours,
                level: courseDetails.level,
                semester: courseDetails.semester
              }
            }, {new: true}).then((updatedCourse) => {
              if(updatedCourse){
                return res.status(200).json({
                  updatedCourse,
                  updateState: "successful"
                });
              }
              res.status(404).json({
                errorMsg: "Unable To Update Saved Course Details, Update Course Again",
                updateState: "unsuccessful"
              });
            })
            .catch((err) => {
              if(err){
                res.status(404).json({
                  errorMsg: "Unable To Update Saved Course Details, Update Course Again",
                  updateState: "unsuccessful"
                });
              }
            });
          }
          res.status(404).json({
            errorMsg: "Unable To Update Course Details, Try Again",
            updateState: "unsuccessful"
          });
        })
        .catch((err) => {
          if(err){
            res.status(404).json({
              errorMsg: "Unable To Update Course Details, Try Again",
              updateState: "unsuccessful"
            });
          }
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
      errorMsg: "No Course\'s ID Matches The Provided ID"
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

//Delete Course
router.delete("/delete/course/:courseId", verifyToken, (req, res) => {
  var courseId = req.params.courseId;

  if(!ObjectID.isValid(courseId)){
    return res.status(404).json({
      errorMsg: "An Invalid Course ID Provided"
    });
  }

  Course.findById(courseId).then((courseDetails) => {
    if(courseDetails){
      return Course.findByIdAndRemove(courseId).then((deletedCourse) => {
        if(deletedCourse){
          return SCourse.findOneAndRemove({
            code: deletedCourse.code,
            name: deletedCourse.name
          }).then((deletedSCourse) => {
            if(deletedSCourse){     
              return res.status(200).json({
                deletedCourse,
                deleteState: "successful"
              });
            }
            res.status(200).json({
              deletedCourse,
              deleteState: "successful"
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
          errorMsg: "Unable To Delete Course, Try Again",
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
      errorMsg: "No Course\'s ID Matches The Provided ID"
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

//View Saved Course(s)
router.get("/view/saved/courses/:lecturerId", verifyToken, (req, res) => {
  var lecturerId = req.params.lecturerId;

  if(!ObjectID.isValid(lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  LecturerPD.findById(lecturerId).then((lecturerDetails) => {
    if(lecturerDetails){
      return SCourse.find({
        lecturerId
      }).then((savedCourse) => {
        if(savedCourse.length > 0){
          return res.status(200).json({
            savedCourse,
            queryState: "successful"
          });
        }
        res.status(200).json({
          savedCourse,
          queryState: "successful"
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
      errorMsg: "No Lecturer\'s ID Matches The Provided ID"
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

//CRUD GRADES
//Add Grade
router.post("/add/grade/:lecturerId", verifyToken, (req, res) => {
  var totalMarks = req.body.totalMarks;
  const newGrade = (totalMarks) => {
    if(totalMarks >= 70 && totalMarks <= 100){
      return "A";
    }
    if(totalMarks >= 60 && totalMarks <= 69){
      return "B";
    }
    if(totalMarks >= 50 && totalMarks <= 59){
      return "C";
    }
    if(totalMarks >= 40 && totalMarks <= 49){
      return "D";
    }
    if(totalMarks <= 30 ){
      return "F";
    }
  };

  var gradeDetails = {
    courseCode: req.body.courseCode,
    courseName: req.body.courseName,
    grade: newGrade(totalMarks),
    classMarks: req.body.classMarks,
    examMarks: req.body.examMarks,
    totalMarks,
    level: req.body.level,
    semester: req.body.semester,
    indexNumber: req.body.indexNumber,
    lecturerId: req.params.lecturerId
  };

  if(!ObjectID.isValid(gradeDetails.lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }
  
  LecturerPD.findById(gradeDetails.lecturerId).then((lecturerDetails) => {
    if(lecturerDetails){
      return Grade.findOne({
        courseCode: gradeDetails.courseCode,
        courseName: gradeDetails.courseName,
        level: gradeDetails.level,
        semester: gradeDetails.semester,
        indexNumber: gradeDetails.indexNumber
      }).then((fetchedGrade) => {
        if(fetchedGrade){
          return res.status(404).json({
            errorMsg:  `The Excel File Contains Duplicate Grade Details For The Student With The ID ${fetchedGrade.indexNumber}, Please Correct And Upload Again.`,
            addState: "unsuccessful"
          });
        }
        new Grade(gradeDetails).save().then((addedGrade) => {
          if(addedGrade){
            //send sms to student
            return StudentPD.findOne({
              indexNumber: gradeDetails.indexNumber
            }).then((student) => {
              if(student){
                var message = `Dear ${student.firstName}, your exam grade for ${addedGrade.courseName} has been uploaded to the GTUC COURSE-REG platform. Please login to view your Grade.`;
                return SMSAPI(Twilio, message, "+233"+student.mobileNumber).then((response) => {
                  if(response){
                    return res.status(200).json({
                      addedGrade,
                      addState: "successful",
                      smsSent: true
                    });
                  }
                })
                .catch((err) => {
                  if(err){
                    res.status(404).json({
                      err,
                      addState: "successful",
                      smsSent: false
                    });
                  }
                });
              }
              res.status(200).json({
                addedGrade,
                addState: "successful",
                smsSent: false
              });
            })
            .catch((err) => {
              if(err){
              return res.status(404).json({
                err,
                addState: "successful"
              });
              }
            });
          }
          res.status(404).json({
            errorMsg: `Unable To Add The New Grade Details For The Student With ID Number ${gradeDetails.indexNumber}, Please Try Again`,
            addState: "unsuccessful"
          });
        })
        .catch((err) => {
          if(err){
            res.status(404).json({
              err,
              errorMsg: `An Error Occured While Adding The Grade Details For The Student With ID Number ${gradeDetails.indexNumber}, Please Try Again`
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
    }
    res.status(404).json({
      errorMsg: "No Lecturer\'s ID Matches The Provided ID"
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

//Get One Grade
router.get("/view/single/grade/:id", verifyToken, (req, res) => {
  var gradeId = req.params.id;
  if(!ObjectID.isValid(gradeId)){
    return res.status(404).json({
      errorMsg: "Provided ID Is Invalid."
    });
  }

  Grade.findById(gradeId).then((gradeDetails) => {
    if(gradeDetails){
      return res.status(200).json({
        gradeDetails,
        queryState: "successful"
      });
    }
    res.status(200).json({
      msg: "No Grade\'s ID Matches The Provided ID",
      queryState: "unsuccessful"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch The Grade\'s Details"
      });
    }
  });
});

//View Grades
router.get("/view/grades/:lecturerId", verifyToken, (req, res) => {
  var lecturerId = req.params.lecturerId;

  if(!ObjectID.isValid(lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  LecturerPD.findById(lecturerId).then((lecturerDetails) => {
    if(lecturerDetails){
      return Grade.find({
        lecturerId
      }).then((grades) => {
        if(grades.length > 0){
          return res.status(200).json({
            grades,
            queryState: "successful"
          });
        } 
        res.status(200).json({
          grades,
          queryState: "successful"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            errorMsg: "An Error Occurered While Fetching Grades, Try Again"
          });
        }
      });
    }
    res.status(404).json({
      errorMsg: "No Lecturer\'s ID Matches The Provided ID"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        errorMsg: "An Error Occurered While Verifying The Provided Lecturer ID, Try Again"
      });
    }
  });
});

//Update Grade
router.put("/update/grade/:gradeId", verifyToken, (req, res) => {
  var totalMarks = req.body.totalMarks;
  const newGrade = (totalMarks) => {
    if(totalMarks >= 70 && totalMarks <= 100){
      return "A";
    }
    if(totalMarks >= 60 && totalMarks <= 69){
      return "B";
    }
    if(totalMarks >= 50 && totalMarks <= 59){
      return "C";
    }
    if(totalMarks >= 40 && totalMarks <= 49){
      return "D";
    }
    if(totalMarks <= 30 ){
      return "F";
    }
  };

  var gradeDetails = {
    gradeId: req.params.gradeId,
    courseCode: req.body.courseCode,
    courseName: req.body.courseName,
    grade: newGrade(totalMarks),
    classMarks: req.body.classMarks,
    examMarks: req.body.examMarks,
    totalMarks: req.body.totalMarks,
    level: req.body.level,
    semester: req.body.semester,
    indexNumber: req.body.indexNumber
  };

  if(!ObjectID.isValid(gradeDetails.gradeId)){
    return res.status(404).json({
      errorMsg: "Invalid Grade ID Provided"
    });
  }

  Grade.findById(gradeDetails.gradeId).then((grade) => {
    if(grade){
      return Grade.find({
        _id: {$ne: gradeDetails.gradeId}
      }).then((fetchedGrades) => {
        if(fetchedGrades.length > 0){
          var existingGrades = fetchedGrades.filter(grade => grade.courseCode == gradeDetails.courseCode && grade.courseName == gradeDetails.courseName && grade.level == gradeDetails.level && grade.semester == gradeDetails.semester && grade.indexNumber == gradeDetails.indexNumber);

          if(existingGrades.length > 0){
            return res.status(404).json({
              errorMsg: "The Grade Details Exist For Another Student",
              updateState: "unsuccessful"
            }); 
          }
          else{
            return Grade.findByIdAndUpdate(gradeDetails.gradeId, {
              $set: {
                courseCode: gradeDetails.courseCode,
                courseName: gradeDetails.courseName,
                grade: gradeDetails.grade,
                marks: gradeDetails.marks,
                level: gradeDetails.level,
                semester: gradeDetails.semester,
                indexNumber: gradeDetails.indexNumber,
              }
            }, {new: true}).then((updatedGrade) => {
              if(updatedGrade){
                return res.status(200).json({
                  updatedGrade,
                  updateState: "successful"
                });
              }
              res.status(404).json({
                errorMsg: "Unable To Update Course Details, Try Again",
                updateState: "unsuccessful"
              });
            })
            .catch((err) => {
              if(err){
                res.status(404).json({
                  errorMsg: "Unable To Update Course Details, Try Again",
                  updateState: "unsuccessful"
                });
              }
            });
          } 
        }
        Grade.findByIdAndUpdate(gradeDetails.gradeId, {
          $set: {
            courseCode: gradeDetails.courseCode,
            courseName: gradeDetails.courseName,
            grade: gradeDetails.grade,
            classMarks: gradeDetails.classMarks,
            examMarks: gradeDetails.examMarks,
            totalMarks: gradeDetails.totalMarks,
            level: gradeDetails.level,
            semester: gradeDetails.semester,
            indexNumber: gradeDetails.indexNumber,
          }
        }, {new: true}).then((updatedGrade) => {
          if(updatedGrade){
            return res.status(200).json({
              updatedGrade,
              updateState: "successful"
            });
          }
          res.status(404).json({
            errorMsg: "Unable To Update Course Details, Try Again",
            updateState: "unsuccessful"
          });
        })
        .catch((err) => {
          if(err){
            res.status(404).json({
              err,
              errorMsg: "Unable To Update Course Details, Try Again",
              updateState: "unsuccessful"
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
    }
    res.status(404).json({
      errorMsg: "No Grade\'s ID Matches The Provided ID"
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

//Delete Grade
router.delete("/delete/grade/:gradeId", verifyToken, (req, res) => {
  var gradeId = req.params.gradeId;

  if(!ObjectID.isValid(gradeId)){
    return res.status(404).json({
      errorMsg: "An Invalid Grade ID Provided"
    });
  }

  Grade.findById(gradeId).then((gradeDetails) => {
    if(gradeDetails){
      return Grade.findByIdAndRemove(gradeId).then((deletedGrade) => {
        if(deletedGrade){
          return res.status(200).json({
            deletedGrade,
            deleteState: "successful"
          });
        }
        res.status(404).json({
          errorMsg: "Unable To Delete Grade Details, Try Again",
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
      errorMsg: "No Grade\'s ID Matches The Provided ID"
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

//View Students Registered For A Lecturer's Course
router.get("/view/course/registrants/:lecturerId", verifyToken, (req, res) => {
  var lecturerId = req.params.lecturerId;

  if(!ObjectID.isValid(lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  LecturerPD.findById(lecturerId).then((lecturerDetails) => {
    if(lecturerDetails){
      return RCourses.find({
        lecturerId
      }).populate("student").then((courses) => {
        var students = [];
        if(courses.length > 0){
          courses.forEach((course, index) => {
            students.push(course.student);
          });

          return res.status(200).json({
            students,
            queryState: "successful"
          });
        }
        res.status(200).json({
          students,
          queryState: "successful"
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
      errorMsg: "No Lecturer\'s ID Matches The Provided ID",
      queryState: "unsuccessful"
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

//Download Students Registered For A Lecturer's Course
router.get("/download/course/registrants/:lecturerId", verifyToken, (req, res) => {
  var lecturerId = req.params.lecturerId;

  if(!ObjectID.isValid(lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  LecturerPD.findById(lecturerId).then((lecturerDetails) => {
    if(lecturerDetails){
      return RCourses.find({
        lecturerId
      }).populate("student").then((courses) => {
        var students = [];
        if(courses.length > 0){
          courses.forEach((course, index) => {
            const {indexNumber} = course.student;
            students.push({
              "CODE": course.code,
              "NAME": course.name,
              "CLASS MARKS": "",
              "EXAM MARKS": "",
              "LEVEL": course.level,
              "SEMESTER": course.semester,
              "Index Number": indexNumber
            });
          });

          return res.status(200).json({
            students,
            queryState: "successful"
          });
        }
        res.status(200).json({
          students,
          queryState: "successful"
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
      errorMsg: "No Lecturer\'s ID Matches The Provided ID",
      queryState: "unsuccessful"
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

module.exports = router;