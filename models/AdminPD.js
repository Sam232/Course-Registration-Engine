const mongoose = require("mongoose");
const uuid = require("uuid");

var Schema = mongoose.Schema;

var AdminPDSchema = new Schema({
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
    default: "admin",
    required: false
  },
  linkId: {
    type: String,
    default: uuid()
  }
});

var AdminPD = mongoose.model("admin", AdminPDSchema);

module.exports = AdminPD;