const express = require("express");
const postRouter = express.Router();
const db = require("../dbConnection");
const auth = require("../middlewares/auth");
const { body } = require("express-validator");

const convertToPostsClass = require("../utils/convertToPostsClass");
const postLikedByUsers = require("./../utils/fetchPostLikedByUsers");

const Comment = require("./../classes/comment.class");

postRouter.post(
  "/",
  [
    auth,
    body("content")
      .trim()
      .escape()
  ],
  async (req, res) => {
    try {
      let { content } = req.body;
      const { profileId } = res; // Posted by the logged in user
      const isSharedPost = false; // This value will always be false as we are creating new post

      if (!content.length) {
        return res
          .status(422)
          .json({ success: false, msg: "Post content missing" });
      }

      const [postId] = await db("posts").insert({
        post_content: content,
        original_post: null,
        post_owner: profileId,
        posted_on: new Date(),
        is_shared_post: isSharedPost
      });

      if (postId) {
        res.status(200).json({
          success: true,
          msg: "Your post has created successfully",
          postId
        });
      } else {
        throw new Error("Operation couldn't completed due to database failure");
      }
    } catch (error) {
      res.status(401).json({
        success: false,
        msg: "Couldn't create post",
        error: error.message
      });
    }
  }
);

postRouter.get("/:postId", auth, async (req, res) => {
  try {
    const { postId } = req.params;

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
      .where("posts.post_id", postId);

    if (result.length == 1) {
      const [post] = await Promise.all(
        result.map(async row => convertToPostsClass(row))
      );

      res.status(200).json({
        success: true,
        msg: "Post fetched successfully",
        post
      });
    } else {
      throw new Error();
    }
  } catch (error) {
    res.status(401).json({ success: false, msg: "Post couldn't fetch", error });
  }
});

postRouter.patch(
  "/:postId",
  [
    auth,
    body("content")
      .trim()
      .escape()
  ],
  async (req, res) => {
    try {
      const { postId } = req.params;
      const { content } = req.body;
      const { profileId } = res;

      if (!content.length) {
        return res
          .status(422)
          .json({ success: false, msg: "Post content missing" });
      }

      let result = await db
        .table("posts")
        .select(db.ref("post_content").as("postContent"))
        .where({
          post_id: postId,
          post_owner: profileId
        });

      if (result.length === 1) {
        result = await db
          .table("posts")
          .where({ post_id: postId })
          .update({ post_content: content });
      } else {
        return res
          .status(422)
          .json({ success: false, msg: "Invalid operation" });
      }

      if (result === 1) {
        res.status(200).json({
          success: true,
          msg: "Post updated successfully",
          content
        });
      } else {
        throw new Error("Operation couldn't completed due to database failure");
      }
    } catch (error) {
      res.status(401).json({
        success: false,
        msg: "Can't update the post",
        error: error.message
      });
    }
  }
);

postRouter.delete("/:postId", auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { profileId } = res;

    let result = await db
      .table("posts")
      .select(db.ref("post_content").as("postContent"))
      .where({
        post_id: postId,
        post_owner: profileId
      });

    if (result.length === 1) {
      result = await db
        .table("posts")
        .where({ post_id: postId, post_owner: profileId })
        .del();
    } else {
      return res.status(422).json({ success: false, msg: "Invalid operation" });
    }

    if (result === 1) {
      res.status(200).json({
        success: true,
        msg: "Post deleted successfully"
      });
    } else {
      throw new Error("Operation couldn't completed due to database failure");
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Can't delete the post",
      error: error.message
    });
  }
});

postRouter.get("/:postId/comments", auth, async (req, res) => {
  try {
    const { postId } = req.params;

    const result = await db
      .table("comments")
      .join("users", "comments.comment_owner", "users.user_id")
      .select(
        "comment_id",
        "comment_content",
        "post_id",
        db.ref("comment_owner").as("comment_owner_id"),
        db.raw(`CONCAT(fname, " ", lname) AS comment_owner_name`),
        "commented_on"
      )
      .where("post_id", postId)
      .orderBy("comments.commented_on", "desc");

    const comments = await Promise.all(
      result.map(async row => {
        return new Comment(
          row.comment_id,
          row.comment_content,
          row.post_id,
          row.comment_owner_id,
          row.comment_owner_name,
          row.commented_on
        );
      })
    );

    res.status(200).json({
      success: true,
      msg: "Comments fetched successfully",
      comments
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Comments couldn't fetch",
      error: error.message
    });
  }
});

postRouter.post(
  "/:postId/comments",
  [
    auth,
    body("content")
      .trim()
      .escape()
  ],
  async (req, res) => {
    try {
      const { postId } = req.params;
      let { content } = req.body;
      const { profileId } = res; // Commented by the logged in user

      if (!content.length) {
        return res
          .status(422)
          .json({ success: false, msg: "Comment content missing" });
      }

      const [commentId] = await db("comments").insert({
        post_id: postId,
        comment_content: content,
        comment_owner: profileId,
        commented_on: new Date()
      });

      if (commentId) {
        const result = await db
          .table("comments")
          .join("users", "comments.comment_owner", "users.user_id")
          .select(
            "comment_id",
            "comment_content",
            "post_id",
            db.ref("comment_owner").as("comment_owner_id"),
            db.raw(`CONCAT(fname, " ", lname) AS comment_owner_name`),
            "commented_on"
          )
          .where("comment_id", commentId);

        if (!result.length) {
          throw new Error(
            "Operation couldn't completed due to database failure"
          );
        }

        const comment = new Comment(
          result[0].comment_id,
          result[0].comment_content,
          result[0].post_id,
          result[0].comment_owner_id,
          result[0].comment_owner_name,
          result[0].commented_on
        );

        res.status(200).json({
          success: true,
          msg: "Your comment has created successfully",
          comment
        });
      } else {
        throw new Error("Operation couldn't completed due to database failure");
      }
    } catch (error) {
      res.status(401).json({
        success: false,
        msg: "Couldn't create comment",
        error: error.message
      });
    }
  }
);

postRouter.post("/:postId/like", auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { profileId } = res;

    let result = await db
      .select("post_liked_on")
      .from("post_liked_by_users")
      .where({ post_id: postId, post_liked_by: profileId });

    if (!result.length) {
      result = await db("post_liked_by_users").insert({
        post_id: postId,
        post_liked_by: profileId,
        post_liked_on: new Date()
      });

      if (!result.length) {
        throw new Error("Operation couldn't completed due to database failure");
      }

      const { users, isLikedByLoggedInUser } = await postLikedByUsers(
        postId,
        profileId
      );

      res.status(200).json({
        success: true,
        msg: "Post liked successfully",
        users,
        isLikedByLoggedInUser
      });
    } else {
      return res.status(422).json({ success: false, msg: "Invalid operation" });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Failed to like the post",
      error: error.message
    });
  }
});

postRouter.post("/:postId/dislike", auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { profileId } = res;

    let result = await db
      .select("post_liked_on")
      .from("post_liked_by_users")
      .where({ post_id: postId, post_liked_by: profileId });

    if (result.length === 1) {
      result = await db
        .table("post_liked_by_users")
        .where({ post_id: postId, post_liked_by: profileId })
        .del();

      if (result !== 1) {
        throw new Error("Operation couldn't completed due to database failure");
      }

      const { users, isLikedByLoggedInUser } = await postLikedByUsers(
        postId,
        profileId
      );

      res.status(200).json({
        success: true,
        msg: "Post disliked successfully",
        users,
        isLikedByLoggedInUser
      });
    } else {
      return res.status(422).json({ success: false, msg: "Invalid operation" });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      msg: "Failed to dislike the post",
      error: error.message
    });
  }
});

postRouter.get("/:postId/liked-by-users", auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { profileId } = res;
    const { users, isLikedByLoggedInUser } = await postLikedByUsers(
      postId,
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

postRouter.post(
  "/:postId/share",
  [
    auth,
    body("content")
      .trim()
      .escape()
  ],
  async (req, res) => {
    try {
      let { postId } = req.params; // Post to share
      let { content } = req.body;
      const { profileId } = res; // Shared by the logged in user
      const isSharedPost = true; // This value will always be true as we are sharing the post

      // Checking whether this post is already a shared post or not, if yes then fetch it's original id
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
        .where("posts.post_id", postId);

      if (result.length == 1) {
        const [post] = await Promise.all(
          result.map(async row => convertToPostsClass(row))
        );

        if (post.isSharedPost) {
          postId = post.originalPost.id;
        }
      } else {
        res.status(404).json({ success: false, msg: "Post doesn't exist" });
      }

      const [sharedPostId] = await db("posts").insert({
        post_content: content,
        original_post: postId,
        post_owner: profileId,
        posted_on: new Date(),
        is_shared_post: isSharedPost
      });

      if (sharedPostId) {
        res.status(200).json({
          success: true,
          msg: "Your post has shared successfully",
          sharedPostId
        });
      } else {
        throw new Error("Operation couldn't completed due to database failure");
      }
    } catch (error) {
      res.status(401).json({
        success: false,
        msg: "Couldn't share post",
        error: error.message
      });
    }
  }
);

module.exports = postRouter;
