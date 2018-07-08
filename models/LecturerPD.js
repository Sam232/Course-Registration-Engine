const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var LecturerPDSchema = new Schema({
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
    default: "lecturer",
    required: false
  },
  linkId: {
    type: String,
    required: true
  }
});

var LecturerPD = mongoose.model("lecturer", LecturerPDSchema);

module.exports = LecturerPD;