const express = require("express");
const commentRouter = express.Router();
const db = require("../dbConnection");
const auth = require("../middlewares/auth");
const { body } = require("express-validator");

const commentLikedByUsers = require("./../utils/fetchCommentLikedByUsers");

commentRouter.patch(
  "/:commentId",
  [
    auth,
    body("content")
      .trim()
      .escape()
  ],
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const { profileId } = res;

      if (!content.length) {
        return res
          .status(422)
          .json({ success: false, msg: "Comment content missing" });
      }

      let result = await db
        .table("comments")
        .select(db.ref("comment_content").as("commentContent"))
        .where({
          comment_id: commentId,
          comment_owner: profileId
        });

      if (result.length === 1) {
        result = await db
          .table("comments")
          .where({ comment_id: commentId })
          .update({ comment_content: content });
      } else {
        return res
          .status(422)
          .json({ success: false, msg: "Invalid operation" });
      }

      if (result === 1) {
        res.status(200).json({
          success: true,
          msg: "Comment updated successfully",
          content
        });
      } else {
        throw new Error("Operation couldn't completed due to database failure");
      }
    } catch (error) {
      res
        .status(401)
        .json({
          success: false,
          msg: "Can't update the comment",
          error: error.message
        });
    }
  }
);

commentRouter.delete("/:commentId", auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { profileId } = res;

    let result = await db
      .table("comments")
      .select(db.ref("comment_content").as("commentContent"))
      .where({
        comment_id: commentId,
        comment_owner: profileId
      });

    if (result.length === 1) {
      result = await db
        .table("comments")
        .where({ comment_id: commentId, comment_owner: profileId })
        .del();
    } else {
      return res.status(422).json({ success: false, msg: "Invalid operation" });
    }

    if (result === 1) {
      res.status(200).json({
        success: true,
        msg: "Comment deleted successfully"
      });
    } else {
      throw new Error("Operation couldn't completed due to database failure");
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Can't delete the comment",
      error: error.message
    });
  }
});

commentRouter.post("/:commentId/like", auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { profileId } = res;

    let result = await db
      .select("comment_liked_on")
      .from("comment_liked_by_users")
      .where({ comment_id: commentId, comment_liked_by: profileId });

    if (!result.length) {
      result = await db("comment_liked_by_users").insert({
        comment_id: commentId,
        comment_liked_by: profileId,
        comment_liked_on: new Date()
      });

      if (!result.length) {
        throw new Error("Operation couldn't completed due to database failure");
      }

      const { users, isLikedByLoggedInUser } = await commentLikedByUsers(
        commentId,
        profileId
      );

      res.status(200).json({
        success: true,
        msg: "Comment liked successfully",
        users,
        isLikedByLoggedInUser
      });
    } else {
      return res.status(422).json({ success: false, msg: "Invalid operation" });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Failed to like the comment",
      error: error.message
    });
  }
});

commentRouter.post("/:commentId/dislike", auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { profileId } = res;

    let result = await db
      .select("comment_liked_on")
      .from("comment_liked_by_users")
      .where({ comment_id: commentId, comment_liked_by: profileId });

    if (result.length === 1) {
      result = await db
        .table("comment_liked_by_users")
        .where({ comment_id: commentId, comment_liked_by: profileId })
        .del();

      if (result !== 1) {
        throw new Error("Operation couldn't completed due to database failure");
      }

      const { users, isLikedByLoggedInUser } = await commentLikedByUsers(
        commentId,
        profileId
      );

      res.status(200).json({
        success: true,
        msg: "Comment disliked successfully",
        users,
        isLikedByLoggedInUser
      });
    } else {
      return res.status(422).json({ success: false, msg: "Invalid operation" });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Failed to dislike the comment",
      error: error.message
    });
  }
});

// TODO: Check whether comment exists before calling this
commentRouter.get("/:commentId/liked-by-users", auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { profileId } = res;
    const { users, isLikedByLoggedInUser } = await commentLikedByUsers(
      commentId,
      profileId
    );

    res.status(200).json({
      success: true,
      msg: "Liked users fetched successfully",
      users,
      isLikedByLoggedInUser
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Couldn't fetch the user's list",
      error: error.message
    });
  }
});

module.exports = commentRouter;
