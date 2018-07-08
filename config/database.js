module.exports = {
  dbConnect: (mongoose) => {
    if(process.env.NODE_ENV === "production"){
      return mongoose.connect(process.env.MONGODB_URI, (err) => {
        if(err){
          return console.log(`Unable To Connect to the MongoDB Database Server, ${err}`);
        }
        console.log("Connected To The Production MongoDB Database")
      });
    }
    mongoose.connect("mongodb://localhost:27017/coursereg", (err) => {
      if(err){
        return console.log(`Unable To Connect to the MongoDB Database Server, ${err}`);
      }
      console.log("Connected To The Local MongoDB Database")
    });
  }
}