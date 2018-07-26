const router = require("express").Router();
const {ObjectID} = require("mongodb");

const FinancePD = require("../models/FinancePD");
const StudentPD = require("../models/StudentPD");
const Payment = require("../models/Payment");

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
        indexNumber: paymentDetails.indexNumber,
        level: paymentDetails.level,
        semester: paymentDetails.semester
      }).then((existingPayment) => {
        if(existingPayment){
          return res.status(404).json({
            errorMsg: "Payment Has Been Already Made"
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

          payments.filter(payment => console.log(payment));
          //console.log(myEnabledPayments)
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
    semester: req.body.semester,
    paid: req.body.paid
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
              res.status(404).json({
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
          res.status(404).json({
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

module.exports = router;