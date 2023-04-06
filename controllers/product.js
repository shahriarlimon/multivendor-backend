const express = require('express');
const jwt = require("jsonwebtoken")
const path = require('path');
const fs = require("fs");
const Product = require("../models/product.js")
const catchAsyncError = require('../middlewares/catchAsyncError');
const router = express.Router();
const ErrorHandler = require('../utils/ErrorHandler');
const { upload } = require('../multer.js');
const sendMail = require('../utils/sendMail.js');
const { sendToken } = require('../utils/sendToken.js');
const { isAuthenticated, isSeller } = require('../middlewares/auth.js');
const Shop = require('../models/shop');

router.post("/create-product", upload.array("images"), catchAsyncError(async (req, res, next) => {
    try {
        const shopId = req.body;
        const shop = await Shop.findById(shopId);
        if (!shop) {
            return next(new ErrorHandler("Shop Id is invalid", 400));
        } else {
            const files = req.files;
            const imageUrls = files.map((file) => `${file.fileName}`);
            const productData = req.body;
            productData.images = imageUrls;
            productData.shop = shop;
            const product = await Product.create(productData);
            res.status(200).json({
                success: true,
                product
            })
        }
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
}))


module.exports = router;