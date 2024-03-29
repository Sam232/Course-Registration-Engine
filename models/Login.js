const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var LoginSchema = new Schema({
  role: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("logins", LoginSchema);