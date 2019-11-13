const db = require("../dbConnection");
const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = await jwt.verify(token, "Fakebook");
    console.log(decoded);

    res.profileId = decoded.id;
    if (req.originalUrl === "/users/logout") {
      res.token = token;
    }

    const result = await db
      .select(db.ref("logged_in").as("loggedIn"))
      .from("tokens")
      .where({
        user_id: decoded.id,
        token: token
      });

    if (!result.length) {
      res.json({ success: false, msg: "Authentication required" });
    } else {
      next();
    }
  } catch (error) {
    res.json({ success: false, error });
  }
};

module.exports = auth;
