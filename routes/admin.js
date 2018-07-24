const router = require("express").Router();
const validator = require("email-validator"); 
const bcrypt = require("bcrypt");
const generatePassword = require("generate-password");
const Mailgun = require("mailgun-js");
const {ObjectID} = require("mongodb");
const Nexmo = require("nexmo");
const uuid = require("uuid/v4");

const AdminPD = require("../models/AdminPD");
const LecturerPD = require("../models/LecturerPD");
const FinancePD = require("../models/FinancePD");
const StudentPD = require("../models/StudentPD");
const StudentLogin = require("../models/StudentLogin");
const RDates = require("../models/RDates");
const Course = require("../models/Course");
const RCourses = require("../models/RCourses"); 
const Payment = require("../models/Payment");

const {EmailAPI} = require("../config/EmailAPI");
const {SMSAPI} = require("../config/SMSAPI");

const {verifyToken} = require("../config/verifyToken");

//Confirm Admin Update
router.post("/confirm-update/", verifyToken, (req, res) => {
  var emailDetails = {
    adminFirstName: req.body.firstName,
    email: req.body.adminEmail,
    loginToken: req.body.loginToken,
    token: req.body.token
  }
  
  if(!validator.validate(emailDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  var message = `Dear ${emailDetails.adminFirstName}, you have requested to update your profile details. If it was you click on this link <a href=http://localhost:3000/admin/confirm-update/${emailDetails.loginToken}/${emailDetails.token}/ target=_blank>Update Profile</a> to confirm the update otherwise ignore it if it was not you. Please note that you will not be able to make the update after 5 minutes`;

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

//Update Admin
router.put("/update/admin/:id", verifyToken, (req, res) => {
  var adminDetails = {
    id: req.params.id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    mobileNumber: req.body.mobileNumber
  };

  if(!ObjectID.isValid(adminDetails.id)){
    return res.status(404).json({
      errorMsg: "Invalid Admin ID Provided"
    });
  }

  if(!validator.validate(adminDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(adminDetails.mobileNumber.length !== 10 && adminDetails.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      errorMsg: "Valid Mobile Number Is Required"
    });
  }

  AdminPD.findByIdAndUpdate(adminDetails.id, {
    $set: {
      firstName: adminDetails.firstName,
      lastName: adminDetails.lastName,
      email: adminDetails.email,
      mobileNumber: adminDetails.mobileNumber
    }
  }, {new: true}).then((updatedDetails) => {
    if(updatedDetails){
      return res.status(200).json({
        AdminPD: updatedDetails,
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

//Welcome Page Details
router.get("/welcome", verifyToken, (req, res) => {
  var usersNumber = {};

  LecturerPD.count().then((lecturersNumbers) => {
    usersNumber.lecturers = lecturersNumbers || 0;

    FinancePD.count().then((financeNumber) => {
      usersNumber.financialAccountants = financeNumber || 0;

      StudentPD.count().then((studentsNumber) => {
        usersNumber.studentsNumber = studentsNumber || 0;
        res.status(200).json({
          queryState: "successful",
          usersNumber
        });
      })
      .catch((err) => {
        res.status(404).json({
          err,
          errorMsg: "Unable To Fetch Students Number"
        });
      });
    })
    .catch((err) => {
      if(err){
        res.status(404).json({
          err,
          errorMsg: "Unable To Fetch Financial Accountants Number"
        });
      }
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch Lecturers Number"
      });
    }
  });
});

//Get Lecturers
router.get("/view/lecturers", verifyToken, (req, res) => {
  LecturerPD.find({}).then((lecturers) => {
    if(lecturers.length > 0){
      return res.status(200).json({
        lecturers
      });
    }
    res.status(200).json({
      lecturers,
      message: "No Lecturers Added Yet"
    });
  })
  .catch((err) => {
    if(err){
      res.status(200).json({
        err,
        errMsg: "Unable To Fetch Lecturers Personal Details"
      });
    }
  });
});

//Get One Lecturer
router.get("/view/single/lecturer/:id", verifyToken, (req, res) => {
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
    res.status(200).json({
      msg: "No Lecturer\'s ID Matches The Provided ID",
      queryState: "unsuccessful"
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

//Add Lecturer
router.post("/add/lecturer", verifyToken, (req, res) => {
  var lecturerPD = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    mobileNumber: req.body.mobileNumber,
    linkId: uuid()
  };

  if(!validator.validate(lecturerPD.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(lecturerPD.mobileNumber.length !== 10 && lecturerPD.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      errorMsg: "Valid Mobile Number Is Required"
    });
  }

  LecturerPD.find({}).then((lecturerPersonalDetails) => {
    var newPersonalDetails = lecturerPersonalDetails.filter(personalDetails => personalDetails.email == lecturerPD.email || personalDetails.mobileNumber == lecturerPD.mobileNumber);

    if(newPersonalDetails.length > 0){
      if(newPersonalDetails[0].email == lecturerPD.email){
        return res.status(404).json({
          errorMsg: "Provided Email Address Of The New Lecturer Already Exist"
        });
      }
      else{
        return res.status(404).json({
          errorMsg: "Provided Mobile Number Of The New Lecturer Already Exist"
        });
      }
    }

    new LecturerPD(lecturerPD).save().then((personalDetails) => {
      if(personalDetails){
        var message = `Welcome ${personalDetails.firstName} to GTUC COURSE-REG, you can login to the application using this link <a href=http://localhost:3000/login/${personalDetails.linkId} target=_blank>login link</a>`;

        return EmailAPI(Mailgun, personalDetails, message).then((sent) => {
          if(sent){
            return res.status(200).json({
              lecturerPD: personalDetails,
              emailSent: true
            });
          }
        })
        .catch((err) => {
          if(err){
            return res.status(200).json({
              err,
              lecturerPD: personalDetails,
              emailSent: false
            });
          }
        });
      }
      res.status(404).json({
        errorMsg: "Unable To Add Lecturer, Try Again",
      });
    })
    .catch((err) => {
      if(err){
        res.status(404).json({
          err,
          errorMsg: "Unable To Add Lecturer, Try Again"
        });
      }      
    });
  })
  .catch((err) => {
    res.status(404).json({
      err,
      errorMsg: "Unable To Check Whether LecturerPD Already Exist"
    });
  });
});

//Confirm The Lecturer's Update
router.post("/confirm-update/lecturer", verifyToken, (req, res) => {
  var emailDetails = {
    adminFirstName: req.body.adminFirstName,
    lecturerFirstName: req.body.lecturerFirstName,
    email: req.body.adminEmail,
    loginToken: req.body.loginToken,
    token: req.body.token
  }
  
  if(!validator.validate(emailDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  var message = `Dear ${emailDetails.adminFirstName}, you have requested to update ${emailDetails.lecturerFirstName}\'s profile details. If it was you click on this link <a href=http://localhost:3000/admin/confirm-update/lecturer/${emailDetails.loginToken}/${emailDetails.token}/ target=_blank>Update Profile</a> to confirm the update otherwise ignore it if it was not you. Please note that you will not be able to make the update after 5 minutes`;

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

//Update Lecturer
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
      lecturerDetails,
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  if(!validator.validate(lecturerDetails.email)){
    return res.status(404).json({
      lecturerDetails,
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(lecturerDetails.mobileNumber.length !== 10 && lecturerDetails.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      lecturerDetails,
      errorMsg: "Valid Mobile Number Is Required"
    });
  }

  LecturerPD.find({
    _id: {$ne: lecturerDetails.id}
  }).then((lecturers) => {
    var newLecturers = lecturers.filter(lecturer => lecturer.email == lecturerDetails.email || lecturer.mobileNumber == lecturerDetails.mobileNumber);

    if(newLecturers.length > 0){
      if(newLecturers[0].email == lecturerDetails.email){
        return res.status(404).json({
          lecturerDetails,
          errorMsg: "Provided Email Address Of The Lecturer Already Exist"
        });
      }
      else{
        return res.status(404).json({
          lecturerDetails,
          errorMsg: "Provided Mobile Number Of The Lecturer Already Exist"
        });
      }
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
          updatedDetails
        });
      }
      res.status(404).json({
        errorMsg: "Unable To Update Lecturer\'s PD"
      });
    })
    .catch((err) => {
      res.status(404).json({
        err,
        errorMsg: "Unable To Update Lecturer\'s PD"
      });
    });
  })
  .catch((err) => {
    res.status(404).json({
      err,
      errorMsg: "Unable To Fetch The Documents Containing The Lecturer\'s PD"
    });
  });
});

//Delete A Lecturer
router.delete("/delete/lecturer/:id", verifyToken, (req, res) => {
  var lecturerId = req.params.id;

  if(!ObjectID.isValid(lecturerId)){
    return res.status(404).json({
      errorMsg: "Invalid Lecturer ID Provided"
    });
  }

  LecturerPD.findById(lecturerId).then((lecturer) => {
    if(lecturer){
      return LecturerPD.findByIdAndRemove(lecturerId).then((deletedLecturer) => {
        if(deletedLecturer){
          return res.status(200).json({
            deletedLecturer
          });
        }
        res.status(404).json({
          errorMsg: "Unable To Delete Lecturer\'s PD"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "Unable To Delete Lecturer\'s Details"
          });
        }
      });
    }
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch Lecturer\'s Details"
      });
    }
  });
});

//Get Finance
router.get("/view/finance", verifyToken, (req, res) => {
  FinancePD.find({}).then((finance) => {
    if(finance.length > 0){
      return res.status(200).json({
        finance
      });
    }
    res.status(200).json({
      finance,
      message: "No Financial Accountant Added Yet"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errMsg: "Unable To Fetch Financial Accountant(s) Personal Details"
      });
    }
  });
});

//Get One Finance
router.get("/view/single/finance/:id", verifyToken, (req, res) => {
  var financeId = req.params.id;
  if(!ObjectID.isValid(financeId)){
    return res.status(404).json({
      errorMsg: "Provided ID Is Invalid."
    });
  }

  FinancePD.findById(financeId).then((personalDetails) => {
    if(personalDetails){
      return res.status(200).json({
        personalDetails,
        queryState: "successful"
      });
    }
    res.status(200).json({
      msg: "No Financial Accountant\'s ID Matches The Provided ID",
      queryState: "unsuccessful"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch Financial Accountant\'s Personal Details"
      });
    }
  });
});

//View Payment
router.get("/view/payments/:financeId", verifyToken, (req, res) => {
  var financeId = req.params.financeId;

  if(!ObjectID.isValid(financeId)){
    return res.status(404).json({
      errorMsg: "Invalid Finance ID Provided"
    });
  }

  FinancePD.findById(financeId).then((financeDetails) => {
    if(financeDetails){
      return Payment.find({
        financeId
      }).then((payments) => {
        if(payments.length > 0){
          return res.status(200).json({
            payments,
            queryState: "successful"
          });
        }
        res.status(200).json({
          payments: [],
          queryState: "successful",
          msg: "No Payments Enabled"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "Unable To Fetch Payments, Try Again"
          });
        }
      })
    }
    res.status(404).json({
      errorMsg: "No Financial Accountant\'s ID Matches The Provided ID"
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

//Add Finance
router.post("/add/finance", verifyToken, (req, res) => {
  var financePD = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    mobileNumber: req.body.mobileNumber,
    linkId: uuid()
  };

  if(!validator.validate(financePD.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(financePD.mobileNumber.length !== 10 && financePD.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      errorMsg: "Valid Mobile Number Is Required"
    });
  }

  FinancePD.find({}).then((financePersonalDetails) => {
    var newPersonalDetails = financePersonalDetails.filter(personalDetails => personalDetails.email == financePD.email || personalDetails.mobileNumber == financePD.mobileNumber);

    if(newPersonalDetails.length > 0){
      if(newPersonalDetails[0].email == financePD.email){
        return res.status(404).json({
          errorMsg: "Provided Email Address Of The New Financial Accountant Already Exist"
        });
      }
      else{
        return res.status(404).json({
          errorMsg: "Provided Mobile Number Of The New Financial Accountant Already Exist"
        });
      }
    }

    new FinancePD(financePD).save().then((personalDetails) => {
      if(personalDetails){
        var message = `Welcome ${personalDetails.firstName} to GTUC COURSE-REG, you can login to the application using this link <a href=http://localhost:3000/login/${personalDetails.linkId} target=_blank>login link</a>`;

        return EmailAPI(Mailgun, personalDetails, message).then((sent) => {
          if(sent){
            return res.status(200).json({
              financePD: personalDetails,
              emailSent: true
            });
          }
        })
        .catch((err) => {
          if(err){
            return res.status(200).json({
              err,
              financePD: personalDetails,
              emailSent: false
            });
          }
        });
      }
      res.status(404).json({
        errorMsg: "Unable To Add Financial Accountant, Try Again",
      });
    })
    .catch((err) => {
      if(err){
        res.status(404).json({
          errorMsg: "Error Completing Registration"
        });
      }
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Check Whether FinancePD Already Exist"
      });
    }
  });
});

//Confirm The Financial Accountant's Update
router.post("/confirm-update/finance", verifyToken, (req, res) => {
  var emailDetails = {
    adminFirstName: req.body.adminFirstName,
    financeFirstName: req.body.financeFirstName,
    email: req.body.adminEmail,
    loginToken: req.body.loginToken,
    token: req.body.token
  }
  
  if(!validator.validate(emailDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  var message = `Dear ${emailDetails.adminFirstName}, you have requested to update ${emailDetails.financeFirstName}\'s profile details. If it was you click on this link <a href=http://localhost:3000/admin/confirm-update/finance/${emailDetails.loginToken}/${emailDetails.token}/ target=_blank>Update Profile</a> to confirm the update otherwise ignore it if it was not you. Please note that you will not be able to make the update after 5 minutes`;

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

//Update Financial Accountant's Personal Details
router.put("/update/finance/:id", verifyToken, (req, res) => {
  var financeDetails = {
    id: req.params.id,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    mobileNumber: req.body.mobileNumber
  };

  if(!ObjectID.isValid(financeDetails.id)){
    return res.status(404).json({
      financeDetails,
      errorMsg: "Invalid Financial Accountant ID Provided"
    });
  }

  if(!validator.validate(financeDetails.email)){
    return res.status(404).json({
      financeDetails,
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(financeDetails.mobileNumber.length !== 10 && financeDetails.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      financeDetails,
      errorMsg: "Valid Mobile Number Is Required"
    });
  }

  FinancePD.find({
    _id: {$ne: financeDetails.id}
  }).then((finance) => {
    var newFinance = finance.filter(finance => finance.email == financeDetails.email || finance.mobileNumber == financeDetails.mobileNumber);

    if(newFinance.length > 0){
      if(newFinance[0].email == financeDetails.email){
        return res.status(404).json({
          financeDetails,
          errorMsg: "Provided Email Address Of The Financial Accountant Already Exist"
        });
      }
      else{
        return res.status(404).json({
          financeDetails,
          errorMsg: "Provided Mobile Number Of The Financial Accountant Already Exist"
        });
      }
    }

    FinancePD.findByIdAndUpdate(financeDetails.id, {
      $set: {
        firstName: financeDetails.firstName,
        lastName: financeDetails.lastName,
        email: financeDetails.email,
        mobileNumber: financeDetails.mobileNumber
      }
    }, {new: true}).then((updatedDetails) => {
      if(updatedDetails){
        return res.status(200).json({
          updatedDetails
        });
      }
      res.status(404).json({
        financeDetails,
        errorMsg: "Unable To Update Financial Accountant\'s PD"
      });
    })
    .catch((err) => {
      res.status(404).json({
        err,
        financeDetails,
        errorMsg: "Unable To Update Financial Accountant\'s PD"
      });
    });
  })
  .catch((err) => {
    res.status(404).json({
      err,
      financeDetails,
      errorMsg: "Unable To Fetch The Documents Containing The Financial Accountant\'s PD"
    });
  });
});

//Delete A Finance
router.delete("/delete/finance/:id", verifyToken, (req, res) => {
  var financeId = req.params.id;

  if(!ObjectID.isValid(financeId)){
    return res.status(404).json({
      errorMsg: "Invalid Financial Accountant\'s ID Provided"
    });
  }

  FinancePD.findById(financeId).then((finance) => {
    if(finance){
      return FinancePD.findByIdAndRemove(financeId).then((deletedFinance) => {
        if(deletedFinance){
          return res.status(200).json({
            deletedFinance
          });
        }
        res.status(404).json({
          errorMsg: "Unable To Delete Financial Accountant\'s PD"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "Unable To Delete Financial Accountant\'s Details"
          });
        }
      });
    }
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch Finance Accountant\'s Details"
      });
    }
  });
});

//CRUD Student
//Get Students
router.get("/view/students", verifyToken, (req, res) => {
  StudentPD.find({}).then((students) => {
    if(students.length > 0){
      return res.status(200).json({
        students
      });
    }
    res.status(200).json({
      students,
      message: "No Students Added Yet"
    });
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errMsg: "Unable To Fetch Students Personal Details"
      });
    }
  });
});

//Get One Student
router.get("/view/single/student/:id", verifyToken, (req, res) => {
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

//Add Student 
router.post("/add/student", verifyToken, (req, res) => {
  var studentPD = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    mobileNumber: req.body.mobileNumber,
    indexNumber: req.body.indexNumber
  };

  if(!validator.validate(studentPD.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(studentPD.mobileNumber.length !== 10 && studentPD.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      errorMsg: "Valid Mobile Number Is Required"
    });
  }

  StudentPD.find({}).then((studentPersonalDetails) => {
    var newPersonalDetails = studentPersonalDetails.filter(personalDetails => personalDetails.email == studentPD.email || personalDetails.mobileNumber == studentPD.mobileNumber || personalDetails.indexNumber == studentPD.indexNumber);

    if(newPersonalDetails.length > 0){
      if(newPersonalDetails[0].email == studentPD.email){
        return res.status(404).json({
          errorMsg: "Provided Email Address Of The New Student Already Exist"
        });
      }
      else if(newPersonalDetails[0].mobileNumber == studentPD.mobileNumber){
        return res.status(404).json({
          errorMsg: "Provided Mobile Number Of The New Student Already Exist"
        });
      }
      else{
        return res.status(404).json({
          errorMsg: "Provided Index Number Of The New Student Already Exist"
        });
      }
    }

    new StudentPD(studentPD).save().then((personalDetails) => {
      var password = generatePassword.generate({
        length: 10,
        numbers: true,
        symbols: true
      });

      if(personalDetails){
        return bcrypt.hash(password, 10).then((hashedPassword) => {
          var loginDetails = {
            indexNumber: studentPD.indexNumber,
            password: hashedPassword     
          };

          new StudentLogin(loginDetails).save().then((studentLoginDetails) => {
            if(studentLoginDetails){
              var message = `Welcome ${personalDetails.firstName} to GTUC COURSE-REG, your new password is <b>${password}</b>. You can login to the application using this link <a href=http://localhost:5000/student/login target=_blank>login link</a>`;

              return EmailAPI(Mailgun, personalDetails, message).then((sent) => {
                if(sent){
                  return res.status(200).json({
                    studentPD: personalDetails,
                    emailSent: true
                  });
                }
              })
              .catch((err) => {
                if(err){
                  return res.status(404).json({
                    err,
                    studentPD: personalDetails,
                    emailSent: false
                  });
                }
              });
            }
            res.status(404).json({
              errorMessage: "An Error Occured. Delete The Student\'s Added Details And Try Again."
            });
          })
          .catch((err) => {
            if(err){
              console.log(err)
              res.status(404).json({
                errorMessage: "An Error Occured. Delete The Student\'s Added Details And Try Again."
              });
            }
          })
        })
        .catch((err) => {
          if(err){
            console.log(err)
            StudentPD.findByIdAndRemove(personalDetails._id).then((removedStudentDetails) => {
              if(removedStudentDetails){
                return res.status(404).json({
                  errorMessage: "Unable To Add New Student, Try Again."
                });
              }
              res.status(404).json({
                errorMessage: "An Error Occured. Delete The Student\'s Added Details And Try Again."
              });
            })
            .catch((err) => {
              if(err){
                res.status(404).json({
                  errorMessage: "An Error Occured. Delete The Student\'s Added Details And Try Again."
                });
              }
            });
          }
        });
      }
      res.status(404).json({
        errorMsg: "Unable To Add Student, Try Again",
      });
    })
    .catch((err) => {
      res.status(404).json({
        err,
        errorMsg: "Error Completing Registration"
      });
    });
  })
  .catch((err) => {
    res.status(404).json({
      err,
      errorMsg: "Unable To Check Whether StudentPD Already Exist"
    });
  });
});

//Update Student
router.put("/update/student/:id", verifyToken, (req, res) => {
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
          res.status(200).json({
            updateState: "unsuccessful"
          });
        })
        .catch((err) => {
          if(err){
            res.status(200).json({
              err,
              updateState: "unsuccessful"
            });
          }
        });
      }
      res.status(404).json({
        errorMsg: "Unable To Update Student\'s PD"
      });
    })
    .catch((err) => {
      res.status(404).json({
        err,
        errorMsg: "Unable To Update Student\'s PD"
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
router.put("/update/student-login/", verifyToken, (req, res) => {
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
      errorMsg: "The Length Of The New Password Must Be Greater Than 8"
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

//Delete A Student
router.delete("/delete/student/:id", verifyToken, (req, res) => {
  var studentId = req.params.id;

  if(!ObjectID.isValid(studentId)){
    return res.status(404).json({
      errorMsg: "Invalid Student\'s ID Provided"
    });
  }

  StudentPD.findById(studentId).then((student) => {
    if(student){
      return StudentPD.findByIdAndRemove(studentId).then((deletedStudent) => {
        if(deletedStudent){
          return StudentLogin.findOneAndRemove({
            indexNumber: deletedStudent.indexNumber
          }).then((deletedLogin) => {
            if(deletedLogin){
              return res.status(200).json({
                deletedStudent,
                deleteState: "successful"
              });
            }

            new StudentPD({
              firstName: deletedStudent.firstName,
              lastName: deletedStudent.lastName,
              mobileNumber: deletedStudent.mobileNumber,
              email: deletedStudent.email,
              indexNumber: deletedStudent.indexNumber
            }).save().then((studentDetails) => {
              if(studentDetails){
                return res.status(404).json({
                  errorMsg: "Unable To Delete Student\'s PD Details, Try Again",
                  deleteState: "unsuccessful"
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
          })
          .catch((err) => {
            if(err){
              new StudentPD({
                firstName: deletedStudent.firstName,
                lastName: deletedStudent.lastName,
                mobileNumber: deletedStudent.mobileNumber,
                email: deletedStudent.email,
                indexNumber: deletedStudent.indexNumber
              }).save().then((studentDetails) => {
                if(studentDetails){
                  return res.status(404).json({
                    errorMsg: "Unable To Delete Student\'s PD Details, Try Again",
                    deleteState: "unsuccessful"
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
          });
        }
        res.status(404).json({
          errorMsg: "Unable To Delete Student\'s PD"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "Unable To Delete Student\'s PD Details"
          });
        }
      });
    }
  })
  .catch((err) => {
    if(err){
      res.status(404).json({
        err,
        errorMsg: "Unable To Fetch Student\'s PD Details"
      });
    }
  });
});

//Add Registration Dates
router.post("/add/registration-dates", verifyToken, (req, res) => {
  var registrationDates = {
    startDate: req.body.startDate,
    endDate: req.body.endDate
  };

  RDates.remove({}).then((removedRDates) => {
    if(removedRDates){
      return new RDates(registrationDates).save().then((rdates) => {
        if(rdates){
          return StudentPD.find({}).then((students) => {
            if(students.length > 0){
              students.forEach((value, index) => {
                if(value){
                  //send sms to students
                  var message = `Dear ${value.firstName}, you can now register for your semester\'s courses on the GTUC COURSE-REG platform. Please registration start from today to ${rdates.endDate}, thank you!!`;
                  return SMSAPI(Nexmo, message, "+233"+value.mobileNumber).then((res) => {
                    if(res){
                      return null;
                    }
                  })
                  .catch((err) => {
                    if(err){
                      return console.log("Registration SMS Not Sent")
                    }
                  });
                }
              });
              return Course.remove({}).then((deletedCourses) => {
                if(deletedCourses){
                  return RCourses.remove({}).then((deletedrcourses) => {
                    if(deletedrcourses){
                      return res.status(200).json({
                        rdates,
                        addState: "successful"
                      });
                    }
                    res.status(404).json({
                      errorMessage: "Unable To Delete Last Semester\'s Course. Add Registration Dates Again"
                    });
                  })
                  .catch((err) => {
                    if(err){
                      res.status(404).json({
                        errorMessage: "Unable To Delete Last Semester\'s Course. Add Registration Dates Again"
                      });
                    }
                  });
                }
                res.status(404).json({
                  errorMsg: "Unable To Delete Last Semester\'s Course. Add Registration Dates Again"
                });
              })
              .catch((err) => {
                if(err){
                  res.status(404).json({
                    errorMsg: "Unable To Delete Last Semester\'s Course. Add Registration Dates Again"
                  });
                }
              });
            }
            res.status(200).json({
              rdates,
              addState: "successful"
            });
          })
          .catch((err) => {
            if(err){
              res.status(404).json({
                fetchStudentsErr: err,
              });
            }
          });
        }
        res.status(404).json({
          errorMsg: "Unable To Add New Registration Dates",
          addState: "unsuccessful"
        });
      })
      .catch((err) => {
        if(err){
          res.status(404).json({
            err,
            errorMsg: "Unable To Add New Registration Dates"
          });
        }
      });
    }
    new RDates(registrationDates).save().then((rdates) => {
      if(rdates){
        return res.status(200).json({
          rdates,
          addState: "successful"
        });
      }
      res.status(404).json({
        errorMsg: "Unable To Add New Registration Dates",
        addState: "successful"
      });
    })
    .catch((err) => {
      if(err){
        res.status(404).json({
          err,
          errorMsg: "Unable To Add New Registration Dates"
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

//Fetch Registration Date
router.get("/view/registration-date", verifyToken, (req, res) => {
  RDates.find({}).then((rdates) => {
    if(rdates.length > 0){
      return res.status(200).json({
        rdates: rdates[0],
        queryState: "successful"
      });
    }
    res.status(200).json({
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