exports.shopToken = (seller, statusCode, res) => {
    const token = seller.getJwtToken();
    const options = {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        sameSite: "none",
        secure: true,
        httpOnly: true
    }
    res.status(statusCode).cookie("seller_token", token, options).json({
        success: true,
        seller, token
    })
} 