const router = require("express").Router();
const {ObjectID} = require("mongodb");

const Payment = require("../models/Payment");
const Course = require("../models/Course");
const RCourses = require("../models/RCourses");
const Grade = require("../models/Grade");
const StudentPD = require("../models/StudentPD");
const LecturerPD = require("../models/LecturerPD");
const RDates = require("../models/RDates");

const {verifyStudentToken} = require("../config/verifyToken");

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
          if(fetchPayment.paid == true){
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
              res.status(200).json({
                errorMsg: "Unable To Fetch Your Grades, Try Again",
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
              return res.status(404).json({
                errorMsg: "You Have Already Registered For This Course"
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

module.exports = router;