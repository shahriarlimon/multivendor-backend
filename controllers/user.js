const express = require('express');
const jwt = require("jsonwebtoken")
const path = require('path');
const fs = require("fs");
const User = require("../models/user.js")
const catchAsyncError = require('../middlewares/catchAsyncError');
const router = express.Router();
const ErrorHandler = require('../utils/ErrorHandler');
const { upload } = require('../multer.js');
const sendMail = require('../utils/sendMail.js');
const { sendToken } = require('../utils/sendToken.js');
const { isAuthenticated } = require('../middlewares/auth.js');
router.post("/login-user", catchAsyncError(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) return next(new ErrorHandler("Please provide all the fields", 400));
    const user = await User.findOne({ email }).select("+password");
    if (!user) return next(new ErrorHandler("User doesn't exist", 400));
    const passwordMatched = await user.comparePassword(password);
    if (!passwordMatched) return (next(new ErrorHandler("Please provide correct information", 400)));
    sendToken(user, 201, res)

}))
router.post("/create-user", upload.single("avatar"), async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            const filename = req.file.filename;
            const filePath = `uploads/${filename}`;
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.log(err);
                    res.status(500).json({ message: "Error deleting file" });
                }
            });
            return next(new ErrorHandler("User already exists", 400));

        }
        const filename = req.file.filename;
        const fileUrl = path.join(filename);

        const user = {
            name: name,
            email: email,
            password: password,
            avatar: fileUrl,
        };
        const activationToken = createActivationToken(user)
        const activationURL = `http://localhost:3000/activation/${activationToken}`;
        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                message: `Hello ${user.name},please click on the link to activate your account: ${activationURL}`
            })
            const newUser = await User.create(user);
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

const createActivationToken = (user) => {
    return jwt.sign(user, process.env.ACTIVATION_SECRET, {
        expiresIn: "10m"
    })
}

/* activate user */
router.post("/activation", catchAsyncError(async (req, res, next) => {
    try {
        const { activation_token } = req.body;
        const newUser = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);
        if (!newUser) return next(new ErrorHandler("Invalid token", 404));
        const { name, email, password, avatar } = newUser;
        await User.create({ name, email, password, avatar })
        sendToken(newUser, 201, res)
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
}))

/* load user */
router.get("/getuser", isAuthenticated, catchAsyncError(async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return next(new ErrorHandler("User doesn't exist", 404));
        res.status(200).json({
            success: true,
            user
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}))

/* logout user */
router.get("/logout", isAuthenticated, catchAsyncError(async (req, res, next) => {
    try {
        res.cookie("token", null, {
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
}))
/* update user information */
router.put("/update-user-info", isAuthenticated, catchAsyncError(async (req, res, next) => {
    try {
        const { name, email, phoneNumber, password } = req.body;
        let user = await User.findOne({ email }).select("+password");
        if (!user) return next(new ErrorHandler("User not found", 400));
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) return next(new ErrorHandler("Please provide correct information", 400));
        user.name = name;
        user.email = email;
        user.phoneNumber = phoneNumber;
        await user.save();
        res.status(201).json({ success: true, user })


    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}))

/* update user avatar */
router.put("/update-avatar", isAuthenticated, upload.single("image"), catchAsyncError(async (req, res, next) => {
    try {
        const existsUser = await User.findById(req.user.id);
        const existAvatarPath = `uploads/${existsUser.avatar}`;
        fs.unlinkSync(existAvatarPath);
        const fileUrl = path.join(req.file.filename);
        const user = await User.findOneAndUpdate(req.user.id, { avatar: fileUrl });
        res.status(201).json({
            success: true,
            user
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}))


// update user addresses
router.put(
    "/update-user-addresses",
    isAuthenticated,
    catchAsyncError(async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);

            const sameTypeAddress = user.addresses.find(
                (address) => address.addressType === req.body.addressType
            );
            if (sameTypeAddress) {
                return next(
                    new ErrorHandler(`${req.body.addressType} address already exists`)
                );
            }

            const existsAddress = user.addresses.find(
                (address) => address._id === req.body._id
            );

            if (existsAddress) {
                Object.assign(existsAddress, req.body);
            } else {
                // add the new address to the array
                user.addresses.push(req.body);
            }

            await user.save();

            res.status(200).json({
                success: true,
                user,
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);




// delete user address
router.delete(
    "/delete-user-address/:id",
    isAuthenticated,
    catchAsyncError(async (req, res, next) => {
        try {
            const userId = req.user._id;
            const addressId = req.params.id;
            await User.updateOne(
                {
                    _id: userId,
                },
                { $pull: { addresses: { _id: addressId } } }
            );

            const user = await User.findById(userId);

            res.status(200).json({ success: true, user });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);


// update user password
router.put(
    "/update-user-password",
    isAuthenticated,
    catchAsyncError(async (req, res, next) => {
        try {
            let user = await User.findById(req.user.id).select("+password");

            const isPasswordMatched = await user.comparePassword(
                req.body.oldPassword
            );

            if (!isPasswordMatched) {
                return next(new ErrorHandler("Old password is incorrect!", 400));
            }

            if (req.body.newPassword !== req.body.confirmPassword) {
                return next(
                    new ErrorHandler("Password doesn't matched with each other!", 400)
                );
            }
            user.password = req.body.newPassword;

            await user.save();

            res.status(200).json({
                success: true,
                message: "Password updated successfully!",
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

// find user infoormation with the userId
router.get(
    "/user-info/:id",
    catchAsyncError(async (req, res, next) => {
        try {
            const user = await User.findById(req.params.id);

            res.status(201).json({
                success: true,
                user,
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);


// update user password
router.put(
    "/update-user-password",
    isAuthenticated,
    catchAsyncError(async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id).select("+password");

            const isPasswordMatched = await user.comparePassword(
                req.body.oldPassword
            );

            if (!isPasswordMatched) {
                return next(new ErrorHandler("Old password is incorrect!", 400));
            }

            if (req.body.newPassword !== req.body.confirmPassword) {
                return next(
                    new ErrorHandler("Password doesn't matched with each other!", 400)
                );
            }
            user.password = req.body.newPassword;

            await user.save();

            res.status(200).json({
                success: true,
                message: "Password updated successfully!",
            });
        } catch (error) {
            return next(new ErrorHandler(error.message, 500));
        }
    })
);

module.exports = router;