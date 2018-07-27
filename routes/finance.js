const router = require("express").Router();
const {ObjectID} = require("mongodb");
const validator = require("email-validator");
const Mailgun = require("mailgun-js"); 

const FinancePD = require("../models/FinancePD");
const StudentPD = require("../models/StudentPD");
const Payment = require("../models/Payment");

const {EmailAPI} = require("../config/EmailAPI");

const {verifyToken} = require("../config/verifyToken");

//Get One Finance
router.get("/view/finance/:id", verifyToken, (req, res) => {
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

//Get One Student
router.get("/view/single/student/:indexNumber", verifyToken, (req, res) => {
  var studentIndexNumber = req.params.indexNumber;

  StudentPD.findOne({
    indexNumber: studentIndexNumber
  }).then((personalDetails) => {
    if(personalDetails){
      return res.status(200).json({
        personalDetails,
        queryState: "successful"
      });
    }
    res.status(200).json({
      msg: "No Student\'s Index Number Matches The Provided Index Number",
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

//Confirm Financial Accountant's Update
router.post("/confirm-update", verifyToken, (req, res) => {
  var emailDetails = {
    firstName: req.body.firstName,
    email: req.body.financeEmail,
    loginToken: req.body.loginToken,
    token: req.body.token
  }
  
  if(!validator.validate(emailDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  var message = `Dear ${emailDetails.firstName}, you have requested to update your profile details. If it was you click on this link <a href=http://localhost:3000/finance/confirm-update/${emailDetails.loginToken}/${emailDetails.token}/ target=_blank>Update Profile</a> to confirm the update otherwise ignore it if it was not you. Please note that you will not be able to make the update after 5 minutes`;

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
      errorMsg: "Invalid Financial Accountant\'s ID Provided"
    });
  }

  if(!validator.validate(financeDetails.email)){
    return res.status(404).json({
      errorMsg: "Valid Email Address Is Required"
    }); 
  }

  if(financeDetails.mobileNumber.length !== 10 && financeDetails.mobileNumber.substring(0, 1) !== 0){
    return res.status(404).json({
      errorMsg: "Valid Mobile Number Is Required"
    });
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
        FinancePD: updatedDetails,
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

//Add Payment
router.post("/add/payment/:financeId", verifyToken, (req, res) => {
  var paymentDetails = {
    financeId: req.params.financeId,
    indexNumber: req.body.indexNumber,
    level: req.body.level,
    semester: req.body.semester
  };

  if(!ObjectID.isValid(paymentDetails.financeId)){
    return res.status(404).json({
      errorMsg: "Invalid Financial ID Provided"
    });
  }

  FinancePD.findById(paymentDetails.financeId).then((financeDetails) => {
    if(financeDetails){
      return Payment.findOne({
        indexNumber: paymentDetails.indexNumber
      }).then((existingPayment) => {
        if(existingPayment){
          return res.status(404).json({
            errorMsg: "A Payment Has Been Already Made For A Student With This Index Number"
          });
        }
        new Payment(paymentDetails).save().then((newPayment) => {
          if(newPayment){
            return res.status(200).json({
              newPayment,
              addState: "successful"
            });
          }
          res.status(200).json({
            msg: "Unable To Add New Payment",
            addState: "unsuccessful"
          });          
        })
        .catch((err) => {
          if(err){
            res.status(404).json({
              err,
              errorMsg: "Unable To Add New Payment, Try Again"
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
      return Payment.find({}).then((payments) => {
        if(payments.length > 0){
          var financePayment = {
            allEnabledPayments: payments,
            myEnabledPayments: []
          };

          var myEnabledPayments = payments.filter(payment => payment.financeId.toHexString() === financeId);
          if(myEnabledPayments.length > 0){  
            financePayment.myEnabledPayments = myEnabledPayments;
          }          
          return res.status(200).json({
            financePayment,
            queryState: "successful"
          });
        }
        res.status(200).json({
          financePayment: {
            allEnabledPayments: [],
            myEnabledPayments: []
          },
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

//Update Payment
router.put("/update/payment/:paymentId", verifyToken, (req, res) => {
  var paymentDetails = {
    paymentId: req.params.paymentId,
    indexNumber: req.body.indexNumber,
    level: req.body.level,
    semester: req.body.semester
  };

  if(!ObjectID.isValid(paymentDetails.paymentId)){
    return res.status(404).json({
      errorMsg: "Invalid Payment ID Provided"
    });
  }

  Payment.findById(paymentDetails.paymentId).then((fetchedPayment) => {
    if(fetchedPayment){
      return Payment.find({
        _id: {$ne: paymentDetails.paymentId}
      }).then((allPayment) => {
        if(allPayment.length > 0){
          var existingPayment = allPayment.filter(payment => payment.indexNumber == paymentDetails.indexNumber && payment.level == paymentDetails.level && payment.semester == paymentDetails.semester);

          if(existingPayment.length > 0){
            return res.status(404).json({
              errorMsg: "Payment Details Already Exist"
            });
          }
          else{
            return Payment.findByIdAndUpdate(paymentDetails.paymentId, {
              $set: {
                indexNumber: paymentDetails.indexNumber,
                level: paymentDetails.level,
                semester: paymentDetails.semester
              }
            }, {new: true}).then((updatedPayment) => {
              if(updatedPayment){
                return res.status(200).json({
                  updatedPayment,
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
                  err,
                  errorMsg: "Unable To Update Payment Details"
                });
              }
            });
          }
        }

        Payment.findByIdAndUpdate(paymentDetails.paymentId, {
          $set: {
            indexNumber: paymentDetails.indexNumber,
            level: paymentDetails.level,
            semester: paymentDetails.semester
          }
        }, {new: true}).then((updatedPayment) => {
          if(updatedPayment){
            return res.status(200).json({
              updatedPayment,
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
              err,
              errorMsg: "Unable To Update Payment Details"
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
      errorMsg: "No Payment\'s ID Matches The Provided ID"
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

//Delete Payment
router.delete("/delete/payment/:paymentId", verifyToken, (req, res) => {
  var paymentId = req.params.paymentId;

  if(!ObjectID.isValid(paymentId)){
    return res.status(404).json({
      errorMsg: "An Invalid Payment ID Provided"
    });
  }

  Payment.findById(paymentId).then((paymentDetails) => {
    if(paymentDetails){
      return Payment.findByIdAndRemove(paymentId).then((deletedPayment) => {
        if(deletedPayment){
          return res.status(200).json({
            deletedPayment,
            deleteState: "successful"
          });
        }
        res.status(404).json({
          errorMsg: "Unable To Delete Payment Details, Try Again",
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
      errorMsg: "No Payment\'s ID Matches The Provided ID"
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

module.exports = router;