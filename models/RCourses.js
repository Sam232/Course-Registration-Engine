const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var RegisteredCoursesSchema = new Schema({
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
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: "student"
  }
});

var RegisteredCourses = mongoose.model("registeredcourses", RegisteredCoursesSchema);

module.exports = RegisteredCourses;