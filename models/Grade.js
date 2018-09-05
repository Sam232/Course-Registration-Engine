const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var GradeSchema = new Schema({
  courseCode: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  classMarks: {
    type: String,
    required: true
  },
  examMarks: {
    type: String,
    required: true
  },
  totalMarks: {
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
  indexNumber: {
    type: String,
    required: true
  },
  lecturerId: {
    type: Schema.Types.ObjectId,
    ref: "lecturers"
  }
});

var Grades = mongoose.model("grades", GradeSchema);

module.exports = Grades;