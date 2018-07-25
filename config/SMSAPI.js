module.exports = {
  SMSAPI: (Twilio, message, mobileNumber) => {
    var accountSid = process.env.TWILIO_ACCOUNTSID;
    var authToken = process.env.TWILIO_AUTHTOKEN;

    var client = new Twilio(accountSid, authToken);

    var sendMsg = new Promise((resolve, reject) => {
      client.messages.create({
        body: "GTUC COURSE-REG- "+message,
        to: mobileNumber,
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