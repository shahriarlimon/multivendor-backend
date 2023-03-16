const express = require('express');
const { urlencoded } = require("express")
const ErrorHandler = require('./utils/ErrorHandler');
const app = express()
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload")

app.use(express.json())
app.use(cookieParser())
app.use(urlencoded({ extended: true, limit: "50mb" }))
app.use(fileUpload({ useTemFiles: true }))

if (process.env.NODE_ENV !== "PRODUCTION") {
    require("dotenv").config({ path: "backend/config/.env" })
}
/* error handling */
app.use(ErrorHandler)

module.exports = app;