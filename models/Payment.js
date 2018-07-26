const mongoose = require("mongoose");

var Schema = mongoose.Schema;

var PaymentSchema = new Schema({
  indexNumber: {
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
  paid: {
    type: Boolean,
    default: "Paid"
  },
  financeId: {
    type: Schema.Types.ObjectId,
    ref: "finances"
  }
});

var Payment = mongoose.model("payment", PaymentSchema);

module.exports = Payment;