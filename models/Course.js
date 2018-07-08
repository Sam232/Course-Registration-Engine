const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var CourseSchema = new Schema({
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

var Courses = mongoose.model("courses", CourseSchema);

module.exports = Courses;