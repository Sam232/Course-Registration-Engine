const router = require("express").Router();
const {ObjectID} = require("mongodb");
const Nexmo = require("nexmo");

const Course = require("../models/Course");
const SCourse = require("../models/SCourse");
const Grade = require("../models/Grade");
const LecturerPD = require("../models/LecturerPD");
const StudentPD = require("../models/StudentPD");
const RCourses = require("../models/RCourses");

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
            return new SCourse(newCourse).save().then((scourseDetails) => {
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
                errorMsg: "Course Code Already Exist",
                updateState: "unsuccessful"
              });
            }
            else{
              return res.status(404).json({
                errorMsg: "Course Name Already Exist",
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
        res.status(404).json({
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
  var gradeDetails = {
    courseCode: req.body.courseCode,
    courseName: req.body.courseName,
    grade: req.body.grade,
    marks: req.body.marks,
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
            errorMsg: "The Grade Details Have Been Already Added",
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
                return SMSAPI(Nexmo, message, "+233"+student.mobileNumber).then((res) => {
                  if(res){
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
            errorMsg: "Unable To Add New Grade Details, Try Again",
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
  var gradeDetails = {
    gradeId: req.params.gradeId,
    courseCode: req.body.courseCode,
    courseName: req.body.courseName,
    grade: req.body.grade,
    marks: req.body.marks,
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

module.exports = router;