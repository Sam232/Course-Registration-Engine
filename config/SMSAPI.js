module.exports = {
  SMSAPI: (Twilio, message, mobileNumber) => {
    var accountSid = process.env.TWILIO_ACCOUNTSID;
    var authToken = process.env.TWILIO_AUTHTOKEN;

    var client = new Twilio(accountSid, authToken);

    var message = {
      from: "GTUC COURSE-REG",
      to: mobileNumber,
      message
    };

    var sendMsg = new Promise((resolve, reject) => {
      client.messages.create({
        body: from+"- "+message.message,
        to: message.to,
        from: process.env.TWILIO_PHONENUMBER
      }).then((response) => {
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
      
    });
    return sendMsg;
  }
}