const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var SCourseSchema = new Schema({
  code: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  creditHours: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    required: true
  },
  semester: {
    type: Number,
    required: true
  },
  lecturerId: {
    type: Schema.Types.ObjectId,
    ref: "lecturer"
  }
});

var SCourses = mongoose.model("savecourses", SCourseSchema);

module.exports = SCourses;