const db = require("../dbConnection");
const User = require("./../classes/user.class");
const fetchFriendshipStatusCode = require("./../utils/fetchFriendshipStatusCode");

module.exports = async (commentId, profileId) => {
  const result = await db
    .select("user_id", db.raw(`CONCAT(fname, " ", lname) AS user_name`))
    .from("users")
    .whereIn(
      "user_id",
      db
        .select("comment_liked_by")
        .from("comment_liked_by_users")
        .where({ comment_id: commentId })
        .orderBy("comment_liked_by", "desc")
    );

  const users = await Promise.all(
    result.map(async row => {
      const friendshipStatusCode = await fetchFriendshipStatusCode(
        profileId,
        row.user_id
      );
      return new User(row.user_id, row.user_name, friendshipStatusCode);
    })
  );

  const isLikedByLoggedInUser = users.find(user => profileId == user.id)
    ? true
    : false;

  return { users, isLikedByLoggedInUser };
};
