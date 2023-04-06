const express = require('express');
const bodyParser = require("body-parser")
const ErrorHandler = require('./middlewares/error');
const app = express()
const cookieParser = require("cookie-parser");
/* const fileUpload = require("express-fileupload") */
const cors = require('cors');

app.use(express.json())
/* app.use(express.urlencoded({ extended: true })); */
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
    })
);
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
/* app.use(fileUpload({ useTemFiles: true }))
 */app.use("/", express.static("uploads"))

if (process.env.NODE_ENV !== "PRODUCTION") {
    require("dotenv").config({ path: "backend/config/.env" })
}

/* importing routes */
const user = require("./controllers/user");
const shop = require("./controllers/shop");
const product = require("./controllers/product")
app.use('/api/v2/user', user)
app.use('/api/v2/shop', shop)
app.use('/api/v2/product', product)
/* error handling */
app.use(ErrorHandler)

module.exports = app;