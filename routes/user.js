const express = require("express");
const userRouter = express.Router();
const auth = require("../middlewares/auth");
const isUserExists = require("../middlewares/isUserExists");
const jwt = require("jsonwebtoken");
const Password = require("node-php-password");
const db = require("../dbConnection");

const convertToPostsClass = require("../utils/convertToPostsClass");
const fetchFriendshipStatus = require("./../utils/fetchFriendshipStatusCode");
const mutualFriendList = require("./../utils/fetchMutualFriends");

const privateKey = "Fakebook";

userRouter.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    let hashedPassword = Password.hash(password);
    const [userId] = await db("users").insert({
      fname: firstName,
      lname: lastName,
      email: email,
      psword: hashedPassword
    });

    if (userId) {
      res.status(200).json({ success: true, msg: "Successfully registered" });
    } else {
      throw new Error("No user id returned");
    }
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

userRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [user] = await db
      .select(
        db.ref("user_id").as("userId"),
        "fname",
        "lname",
        "email",
        "psword"
      )
      .from("users")
      .where("email", "=", email);

    if (Password.verify(password, user.psword)) {
      const token = jwt.sign({ id: user.userId.toString() }, privateKey, {
        expiresIn: "7 days"
      });

      await db("tokens").insert({
        user_id: user.userId,
        token,
        logged_in: new Date()
      });

      delete user.psword;
      res.status(200).json({
        success: true,
        msg: "Login successful",
        user,
        token
      });
    } else {
      throw new Error("Email or password mismatch");
    }
  } catch (error) {
    res
      .status(401)
      .json({ success: false, msg: "Login failed", error: error.message });
  }
});

userRouter.post("/logout", auth, async (req, res) => {
  try {
    const result = await db("tokens")
      .where({
        user_id: res.profileId,
        token: res.token
      })
      .del();

    if (result) {
      res.status(200).json({ success: true, msg: "Logout successful" });
    } else {
      throw new Error();
    }
  } catch (error) {
    res
      .status(401)
      .json({ success: false, msg: "Logout failed", error: error.message });
  }
});

userRouter.get("/profile/:userId", [isUserExists, auth], async (req, res) => {
  try {
    const { userId } = req.params;
    const { profileId, userName } = res;
    let friendshipStatus = 0;
    let mutualFriends = [];

    const result = await db
      .table("posts")
      .join("users", "posts.post_owner", "users.user_id")
      .select(
        "post_id",
        "post_content",
        db.ref("users.user_id").as("post_owner_id"),
        db.ref("posts.original_post").as("original_post_id"),
        db.raw(`CONCAT(fname, " ", lname) AS post_owner_name`),
        "posted_on",
        "is_shared_post"
      )
      .where("post_owner", userId)
      .orderBy("posted_on", "desc");

    const posts = await Promise.all(
      result.map(async row => convertToPostsClass(row))
    );

    if (profileId != userId) {
      friendshipStatus = await fetchFriendshipStatus(profileId, userId);
      mutualFriends = await mutualFriendList(profileId, userId);
    }

    res.status(200).json({
      success: true,
      msg: "Profile posts fetched successfully",
      posts,
      userName,
      friendshipStatus,
      mutualFriends
    });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

userRouter.get("/timeline", auth, async (req, res) => {
  try {
    const { profileId } = res;

    const result = await db
      .table("posts")
      .join("users", "posts.post_owner", "users.user_id")
      .select(
        "post_id",
        "post_content",
        db.ref("users.user_id").as("post_owner_id"),
        db.ref("posts.original_post").as("original_post_id"),
        db.raw(`CONCAT(fname, " ", lname) AS post_owner_name`),
        "posted_on",
        "is_shared_post"
      )
      .whereIn(
        "post_owner",
        db
          .select("request_from")
          .from("friend_requests")
          .where({
            request_to: profileId,
            request_status: "accepted"
          })
          .union(
            db
              .select("request_to")
              .from("friend_requests")
              .where({
                request_from: profileId,
                request_status: "accepted"
              })
          )
      )
      .orderBy("posted_on", "desc");

    const posts = await Promise.all(
      result.map(async row => convertToPostsClass(row))
    );

    res.status(200).json({
      success: true,
      msg: "Timeline posts fetched successfully",
      posts
    });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

module.exports = userRouter;
