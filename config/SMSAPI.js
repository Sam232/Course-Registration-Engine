module.exports = {
  SMSAPI: (Nexmo, message, mobileNumber) => {
    var nexmo = new Nexmo({
      apiKey: process.env.NEXMON_APIKEY || "2a4a5111",
      apiSecret: process.env.NEXMON_APISECRET || "OZDjvpWYAMLglt4l"
    });

    var message = {
      from: "GTUC COURSE-REG",
      to: mobileNumber,
      message
    };

    var sendMsg = new Promise((resolve, reject) => {
      nexmo.message.sendSms(message.from, message.to, message.message, (err, response) => {
        if(err){
          console.log(err)
          reject(err);
        }
        else{
          resolve(true);
        }
      });
    });
    return sendMsg;
  }
}