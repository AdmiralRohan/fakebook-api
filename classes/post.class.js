const User = require("./user.class");

class Post {
  constructor(
    id,
    content,
    owner_id,
    owner_name,
    posted_on,
    originalPost = null,
    isSharedPost = false
  ) {
    this.id = id;
    this.content = content;
    this.owner = new User(owner_id, owner_name);
    this.time = posted_on;
    this.originalPost = originalPost;
    this.isSharedPost = isSharedPost;
  }
}

module.exports = Post;
