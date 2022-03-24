// all module imports
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const mailer = require('./util');
const crypto = require('crypto');
const User = require('./userModel');
const Posts = require('./postModel');
const Comments = require('./commentModel');
const auth = require('./middlewares');
const app = express();
const jwt = require('jsonwebtoken');
const sendEmail = require('./util');
const cookieParser = require('cookie-parser');

//json body parser in post requests and cookieparser
app.use(express.json());
app.use(cookieParser());

// config file setting
dotenv.config({ path: './config.env' });

// db connection
mongoose.connect(process.env.DATABASE_STRING, () => {
    console.log('Database Connection Successful.');
});

// registration endpoint
app.post('/register', async (req, res) => {
    try {
        const newUser = await User.create({
            email: req.body.email,
            username: req.body.username,
            password: req.body.password
        });

        if (newUser) {
            const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET_KEY, { expiresIn: '24h' });
            res.cookie('jwt', token);
            res.status(200).json({
                status: 'success',
                data: {
                    token: token,
                    user: newUser
                }
            });
        } else {
            res.status(400).json({
                status: 'error',
                message: 'Some error occured'
            });
        }
    } catch (err) {
        console.log(err);
    }
});

// login endpoint
app.post('/login', async (req, res) => {
    try {
        // get username and password from request body
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(404).json({
                status: 'error',
                data: 'Username or Password can\'t be empty.'
            });
        }

        // check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            res.status(404).json({
                status: 'error',
                data: 'Username or Password incorrect.'
            });
        }

        // check the password
        const passwordCheck = await user.checkPassword(password, user.password);
        if (!passwordCheck) {
            res.status(404).json({
                status: 'error',
                data: 'Email or Password incorrect.'
            });
        }

        // create jwt token and send to client
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '24h' });
        res.cookie('jwt', token);
        res.status(200).json({
            status: 'success',
            data: {
                token
            }
        });
    } catch (err) {
        console.log(err);
    }
});

// forget password endpoint
app.post('/forgetPassword', async (req, res) => {
    try {
        // find the user using email
        let user = await User.findOne({ email: req.body.email });
        if (!user) {
            res.status(404).json({
                status: 'error',
                data: 'User not exists.'
            });
        }

        // calling instance method to create reset token and send it to the client
        const token = await user.createResetToken();
        await user.save();
        const url = `${req.protocol}://${req.get('host')}/resetPassword/${token}`;
        const message = `Click the link to reset password: ${url}`;
        try {
            const mailOptions = {
                email: req.body.email,
                subject: 'Password Reset Mail',
                message
            };
            await sendEmail(mailOptions);
            res.status(200).json({
                status: 'success',
                message: 'mail sent.'
            })
        } catch (err) {
            user.passwordResetToken = undefined;
            await user.save();
            res.status(500).json({
                status: 'success',
                message: 'error sending mail.'
            })
        }
    } catch (err) {
        console.log(err);
    }
});

// resetpassword endpoint
app.post('/resetPassword/:token', async (req, res) => {
    try {
        // getting the token and encrypting it
        const hashToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
        // finding the user using token
        let user = await User.findOne({ passwordResetToken: hashToken });
        if (!user) {
            res.status(500).json({
                status: 'success',
                message: 'error user not exist.'
            });
        }
        // setting new Password
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        await user.save();
        // sending new jwt to user
        const newToken = jwt.sign(user.id, process.env.JWT_SECRET_KEY);
        res.cookie('jwt', token);
        res.status(200).json({
            status: 'success',
            newToken
        });
    } catch (err) {
        console.log(err);
    }
});

// security middleware -- check if user logged in
app.use(auth.isLoggedIn);

// create post only when the user is logged in
app.post('/posts', async (req, res) => {
    try {
        const { postContent, postImage } = req.body;
        if (!postContent) {
            return res.status(400).json({
                status: 'error',
                message: 'post content cant be empty.'
            });
        }
        const post = await Posts.create({ postedByUser: req.user.id, postContent: req.body.postContent, image: req.body.postImage });
        if (post) {
            res.status(200).json({
                status: 'success',
                data: {
                    post
                }
            });
        }
    }
    catch (err) {
        console.log(err);
    }
});

// get specific post using of a user
app.get('/posts/:id', async (req, res) => {
    try {
        const posts = await Posts.find({ postedByUser: req.params.id }).populate('comments').populate('likedBy');
        if (!posts) {
            res.status(404).json({
                status: 'error',
                message: 'Can\'t find any post.'
            });
        }
        res.status(200).json({
            status: 'success',
            data: {
                posts
            }
        });
    } catch (err) {
        console.log(err);
    }
});

// update post
app.patch('/posts/:id', async (req, res) => {
    try {
        console.log('reached');
        if (req.body.postImage) {
            const updatePost = await Posts.findByIdAndUpdate(req.params.id, {
                postContent: req.body.postContent,
                image: req.body.postImage
            }, { new: true });
            if (updatePost) {
                res.status(200).json({
                    status: 'success',
                    data: {
                        updatePost
                    }
                });
            }
        } else {
            const updatePost = await Posts.findByIdAndUpdate(req.params.id, { postContent: req.body.postContent });
            console.log(updatePost);
            if (updatePost) {
                res.status(200).json({
                    status: 'success',
                    data: {
                        updatePost
                    }
                });
            }
        }
    } catch (err) {
        console.log(err);
    }
});

// delete post
app.delete('/posts/:id', async (req, res) => {
    try {
        console.log(req.params.id);
        const delPost = await Posts.findByIdAndDelete(req.params.id);
        console.log(delPost);
        if (delPost) {
            res.status(200).json({
                status: 'success',
                message: 'post deleted successfully'
            });
        }
    } catch (err) {
        console.log('err');
    }
});

//like
app.post('/posts/:id/like', async (req, res) => {
    try {
        const post = await Posts.findOne({ id: req.params.id });
        if (!post) {
            res.status(404).json({
                status: 'error',
                message: 'Post not found'
            });
        }
        const findUser = post.likedBy.find((el) => {
            if (el == req.user.id) {
                return true;
            }
        });
        if (findUser) {
            return res.status(200).json({
                status: 'success',
                message: 'you already liked the post'
            });
        }
        post.likes = post.likes + 1;
        post.likedBy.push(req.user.id);
        await post.save()
        res.status(200).json({
            status: 'success',
            message: 'post liked'
        });

    } catch (err) {
        console.log(err);
    }
});

// add comment 
app.post('/posts/:id/comment', async (req, res) => {
    try {
        const comment = await Comments.create({
            commentBy: req.user.id,
            post: req.params.id,
            mainContent: req.body.comment
        });
        if (comment) {
            const saveComment = await Posts.findOne({ id: req.params.id });
            saveComment.comments.push(comment.id);
            if (await saveComment.save()) {
                res.status(200).json({
                    status: 'success',
                    message: 'Comment added successfully'
                });
            }
        } else {
            res.status(400).json({
                status: 'error',
                message: 'Some error occured'
            });
        }
    } catch (err) {
        console.log(err);
    }
});

// server start
app.listen(8000, () => {
    console.log('Server Online at port 8000.');
});