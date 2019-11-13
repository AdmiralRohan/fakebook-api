class User {
  constructor(id, name, friendshipStatus = 0) {
    this.id = id;
    this.name = name;
    this.friendshipStatus = friendshipStatus;
  }
}

module.exports = User;
