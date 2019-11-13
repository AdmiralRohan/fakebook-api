const db = require("../dbConnection");

const isUserExists = async (req, res, next) => {
  try {
    const friendId = req.params.userId;
    const result = await db
      .select(db.raw(`CONCAT(fname, ' ', lname) as user_name`))
      .from("users")
      .where("user_id", friendId);

    if (result.length === 1) {
      res.userName = result[0].user_name;
      next();
    } else {
      throw new Error("User doesn't exist");
    }
  } catch (error) {
    res.json({
      success: false,
      msg: "User doesn't exist",
      error: error.message
    });
  }
};

module.exports = isUserExists;
