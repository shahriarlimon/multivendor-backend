const mongoose = require('mongoose');
const connectDatabase = () => {
    mongoose
        .connect(process.env.MONGO_URL_NEW, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then((data) => {
            console.log(`mongodb connected with server: ${data.connection.host}`);
        });
};

module.exports = connectDatabase;