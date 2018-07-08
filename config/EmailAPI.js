module.exports = {
  EmailAPI: (Mailgun, personalDetails, message) => {
    var mailgun = new Mailgun({
      apiKey: process.env.MAILGUN_APIKEY,
      domain: process.env.MAILGUN_DOMAIN
    });
    
    var data = {
      from: "GTUC COURSE-REG <coursereg@codelove.solutions>",
      to:  personalDetails.email,
      subject: "GTUC COURSE-REG",
      html: message
    };
    
    var sendEmail = new Promise((resolve, reject) => {
      mailgun.messages().send(data, (err, body) => {
        if(err || !body){
          reject(err);
        }
        else{
          resolve(true);
        }
      });
    });  
    
    return sendEmail;
  }
};