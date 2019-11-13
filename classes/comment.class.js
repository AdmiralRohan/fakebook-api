const User = require("./user.class");

class Comment {
  constructor(id, content, post_id, owner_id, owner_name, commented_on) {
    this.id = id;
    this.content = content;
    this.postId = post_id;
    this.owner = new User(owner_id, owner_name);
    this.time = commented_on;
  }
}

module.exports = Comment;
