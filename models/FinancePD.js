const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var FinancePDSchema = new Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    default: "financialAccount",
    required: false
  },
  linkId: {
    type: String,
    required: true
  }
});

var FinancePD = mongoose.model("finance", FinancePDSchema);

module.exports = FinancePD;