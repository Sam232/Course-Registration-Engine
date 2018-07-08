const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var StudentPDSchema = new Schema({
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
  indexNumber: {
    type: String,
    required: true
  }
});

var StudentPD = mongoose.model("student", StudentPDSchema);

module.exports = StudentPD;