const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    commentBy: mongoose.Schema.ObjectId,
    post: mongoose.Schema.ObjectId,
    mainComment: { type: String },
    commentDate: {
        type: Date,
        default: Date.now()
    }
});

const Comments = mongoose.model('Comments', commentSchema);
module.exports = Comments;