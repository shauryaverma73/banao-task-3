const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    postedByUser: mongoose.Schema.ObjectId,
    postContent: String,
    image: {
        type: [String],
        default: []
    },
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: mongoose.Schema.ObjectId,
        ref: 'Users'
    }],
    createdAt: {
        type: Date,
        default: Date.now()
    },
    comments: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Comments'
        }
    ]
});

const Posts = mongoose.model('Posts', postSchema);
module.exports = Posts;