const express = require('express');
const catchAsyncError = require('../middlewares/catchAsyncError');
const router = express.Router();
const ErrorHandler = require('../utils/ErrorHandler');
const Coupon = require('../models/coupon');
const { isSeller } = require('../middlewares/auth');

/* create coupon code */
router.post("/create-coupon-code", isSeller, catchAsyncError(async (req, res, next) => {
    try {
        const couponExists = await Coupon.find({ name: req.body.name });
        if (couponExists.length !== 0) {
            return next(new ErrorHandler("Coupon code already exists", 400))
        }
        const coupon = await Coupon.create(req.body);
        res.status(201).json({
            success: true,
            coupon
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
}))
router.get("/get-coupon/:id", isSeller, catchAsyncError(async (req, res, next) => {
    try {
        const coupons = await Coupon.find({ shopId: req.seller.id });
        res.status(201).json({
            success: true,
            coupons
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }


}))


// delete coupoun code of a shop
router.delete(
    "/delete-coupon/:id",
    isSeller,
    catchAsyncError(async (req, res, next) => {
        try {
            const coupon = await Coupon.findByIdAndDelete(req.params.id);
            if (!coupon) {
                return next(new ErrorHandler("Coupon code dosen't exists!", 400));
            }
            res.status(201).json({
                success: true,
                message: "Coupon code deleted successfully!",
            });
        } catch (error) {
            return next(new ErrorHandler(error, 400));
        }
    })
);

// get coupon code value by its name
router.get(
    "/get-coupon-value/:name",
    catchAsyncError(async (req, res, next) => {
      try {
        const couponCode = await Coupon.findOne({ name: req.params.name });
  
        res.status(200).json({
          success: true,
          couponCode,
        });
      } catch (error) {
        return next(new ErrorHandler(error, 400));
      }
    })
  );

module.exports = router;