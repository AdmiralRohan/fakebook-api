const db = require("../dbConnection");
const Post = require("./../classes/post.class");

module.exports = async row => {
  if (!row.is_shared_post) {
    return new Post(
      row.post_id,
      row.post_content,
      row.post_owner_id,
      row.post_owner_name,
      row.posted_on
    );
  } else {
    const originalPostId = row.original_post_id;

    if (originalPostId) {
      // original post has not been deleted yet
      const [originalPost] = await db
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
        .where("post_id", originalPostId);

      if (!originalPost.is_shared_post) {
        return new Post(
          row.post_id,
          row.post_content,
          row.post_owner_id,
          row.post_owner_name,
          row.posted_on,
          new Post(
            originalPost.post_id,
            originalPost.post_content,
            originalPost.post_owner_id,
            originalPost.post_owner_name,
            originalPost.posted_on
          ),
          row.is_shared_post
        );
      } else {
        throw new Error();
      }
    } else {
      // original post has been deleted
      return new Post(
        row.post_id,
        row.post_content,
        row.post_owner_id,
        row.post_owner_name,
        row.posted_on,
        row.original_post_id,
        row.is_shared_post
      );
    }
  }
};
