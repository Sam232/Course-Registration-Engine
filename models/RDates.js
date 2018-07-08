const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var RDateSchema = Schema({
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model("rdates", RDateSchema);