const express = require('express');
const jwt = require("jsonwebtoken")
const path = require('path');
const fs = require("fs");
const catchAsyncError = require('../middlewares/catchAsyncError');
const router = express.Router();
const ErrorHandler = require('../utils/ErrorHandler');
const { upload } = require('../multer.js');
const sendMail = require('../utils/sendMail.js');
const Shop = require('../models/shop');
const { shopToken } = require('../utils/shopToken');
const { isSeller } = require('../middlewares/auth');

router.post('/create-shop', upload.single("avatar"), async (req, res, next) => {
    try {
        const { email } = req.body;
        const sellerEmail = await Shop.findOne({ email });
        if (sellerEmail) {
            const filename = req.file.filename;
            const filePath = `uploads/${filename}`;
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ message: "Error deleting file" });
                }
            });
            return next(new ErrorHandler("Shop already exists", 400));
        }
        const filename = req.file.filename;
        const fileUrl = path.join(filename);

        const seller = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            avatar: fileUrl,
            address: req.body.address,
            phoneNumber: req.body.phoneNumber,
            zipCode: req.body.zipCode
        };

        const activationToken = createActivationToken(seller)
        const activationURL = `http://localhost:3000/seller/activation/${activationToken}`;
        try {
            await sendMail({
                email: seller.email,
                subject: "Activate your shop",
                message: `Hello ${seller.name},please click on the link to activate your shop: ${activationURL}`
            })
            const newSeller = await Shop.create(seller);
            res.status(201).json({
                success: true,
                message: "Verification has been sent to your email"
            })
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
})


/* create activation token */

const createActivationToken = (seller) => {
    return jwt.sign(seller, process.env.ACTIVATION_SECRET, {
        expiresIn: "10m"
    })
}

/* activate shop */
router.post("/activation", catchAsyncError(async (req, res, next) => {
    try {
        const { activation_token } = req.body;
        const newSeller = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);
        if (!newSeller) return next(new ErrorHandler("Invalid token", 404));
        const { name, email, password, avatar, zipCode, phoneNumber, address } = newSeller;
        const seller = await Shop.create({ name, email, password, avatar, zipCode, phoneNumber, address })
        shopToken(seller, 201, res)
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
}))


router.post("/login-shop", catchAsyncError(async (req, res, next) => {

    const { email, password } = req.body;
    if (!email || !password) return next(new ErrorHandler("Please provide all the fields", 400));
    const seller = await Shop.findOne({ email }).select("+password");
    if (!seller) return next(new ErrorHandler("User doesn't exist", 400));
    const passwordMatched = await seller.comparePassword(password);
    if (!passwordMatched) return (next(new ErrorHandler("Please provide correct information", 400)));
    shopToken(seller, 201, res)

}))

/* load seller */
router.get("/getseller", isSeller, catchAsyncError(async (req, res, next) => {
    try {
        const seller = await Shop.findById(req.seller.id);
        if (!seller) return next(new ErrorHandler("Seller doesn't exist", 404));
        res.status(200).json({
            success: true,
            seller
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}))

router.get("/get-shop-info/:id", catchAsyncError(async (req, res, next) => {
    try {
        const shop = await Shop.findById(req.params.id);
        res.status(201).json({
            success: true,
            shop
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}))

/* logout seller */
router.get("/logout", isSeller, catchAsyncError(async (req, res, next) => {
    try {
        res.cookie("seller_token", null, {
            expires: new Date(Date.now()),
            httpOnly: true
        })
        res.status(201).json({
            success: true,
            message: "Logout successful"
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}));

// update shop profile picture
router.put(
    "/update-shop-avatar",
    isSeller,
    upload.single("image"),
    catchAsyncError(async (req, res, next) => {
        try {
            const existsUser = await Shop.findById(req.seller._id);

            const existAvatarPath = `uploads/${existsUser.avatar}`;

            fs.unlinkSync(existAvatarPath);

            const fileUrl = path.join(req.file.filename);

            const seller = await Shop.findByIdAndUpdate(req.seller._id, {
                avatar: fileUrl,
            });

            res.status(200).json({
                success: true,
                seller,
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// update seller info
router.put(
    "/update-seller-info",
    isSeller,
    catchAsyncError(async (req, res, next) => {
        try {
            const { name, description, address, phoneNumber, zipCode } = req.body;

            const shop = await Shop.findOne(req.seller._id);

            if (!shop) {
                return next(new ErrorHandler("User not found", 400));
            }

            shop.name = name;
            shop.description = description;
            shop.address = address;
            shop.phoneNumber = phoneNumber;
            shop.zipCode = zipCode;

            await shop.save();

            res.status(201).json({
                success: true,
                shop,
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);
module.exports = router;