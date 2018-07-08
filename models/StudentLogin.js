const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var StudentLoginSchema = new Schema({
  indexNumber: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  currentState: {
    type: String,
    default: "loggedout"
  }
});

var StudentLogin = mongoose.model("studentlogin", StudentLoginSchema);

module.exports = StudentLogin;