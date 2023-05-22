const express = require('express');
const jwt = require("jsonwebtoken")
const path = require('path');
const fs = require("fs");
const Product = require("../models/product.js")
const catchAsyncError = require('../middlewares/catchAsyncError');
const router = express.Router();
const ErrorHandler = require('../utils/ErrorHandler');
const { upload } = require('../multer.js');
const Shop = require('../models/shop');
const Event = require('../models/event');

router.post("/create-event", upload.array("images"), catchAsyncError(async (req, res, next) => {
    try {
        const { shopId } = req.body;
        const shop = await Shop.findById(shopId);
        if (!shop) {
            return next(new ErrorHandler("Shop Id is invalid", 400));
        } else {
            const files = req.files;
            const imageUrls = files.map((file) => `${file.filename}`);
            const eventData = req.body;
            eventData.images = imageUrls;
            eventData.shop = shop;
            const event = await Event.create(eventData);
            res.status(200).json({
                success: true,
                event
            })
        }
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
}))


router.get("/get-all-events", catchAsyncError(async (req, res, next) => {
    try {
        const events = await Event.find();
        res.status(201).json({
            success: true,
            events
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
}))
router.get("/get-all-events/:id", catchAsyncError(async (req, res, next) => {
    try {
        const events = await Event.find({ shopId: req.params.id });
        res.status(201).json({
            success: true,
            events
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
}))


router.delete("/delete-event-product/:id", catchAsyncError(async (req, res, next) => {
    try {
        const eventId = req.params.id;
        const eventData = await Event.findById(eventId);
        eventData.images.forEach((imageUrl) => {
            const filename = imageUrl;
            const filePath = `uploads/${filename}`;
            fs.unlink(filePath, (error) => {
                if (error) {
                    console.log(error)
                }
            })
        })
        if (!eventData) return next(new ErrorHandler("Product not found with this id", 500));
        const event = await Event.findByIdAndDelete(eventId)

        res.status(201).json({
            success: true,
            message: "Event deleted successfully"
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
}))
module.exports = router;