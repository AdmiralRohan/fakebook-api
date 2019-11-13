const db = require("../dbConnection");
const friendList = require("./../utils/fetchFriendList");
const User = require("./../classes/user.class");

module.exports = async (profileId, friendId) => {
  const friendsOfMe = {};
  const result1 = await await db
    .select(
      db.ref("user_id").as("userId"),
      db.raw(`CONCAT(fname, ' ', lname) as userName`)
    )
    .from("users")
    .whereIn("user_id", friendList(profileId));

  const result2 = await await db
    .select(
      db.ref("user_id").as("userId"),
      db.raw(`CONCAT(fname, ' ', lname) as userName`)
    )
    .from("users")
    .whereIn("user_id", friendList(friendId));

  result1.forEach(row => {
    friendsOfMe[row.userId] = row;
  });

  const friendsOfFriend = result2.map(
    row => new User(row.userId, row.userName, 2)
  );

  return friendsOfFriend.filter(user => user.id in friendsOfMe);
};
