const jwt = require("jsonwebtoken");

const generateSignJWT = async (emailId) => {
    const token = await jwt.sign({ emailId }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });
    return token;
};

const verifySignJWT = async (req, res , next) => {
    const token = req.cookies.signup_token;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        
        req.emailId = decoded.emailId;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }
}

module.exports = {
    generateSignJWT,
    verifySignJWT
};
