var express = require("express");
var router = express.Router();
const passport = require("passport");
const localStrategy = require("passport-local");
const userModel = require("./users");
const postModel = require("./posts");
const storyModel = require("./story");
passport.use(new localStrategy(userModel.authenticate()));
const upload = require("./multer");
const utils = require("../utils/utils");


// GET
router.get("/", function (req, res) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("/like/:postid", async function (req, res) {
  const post = await postModel.findOne({ _id: req.params.postid });
  const user = await userModel.findOne({ username: req.session.passport.user });
  if (post.like.indexOf(user._id) === -1) {
    post.like.push(user._id);
  } else {
    post.like.splice(post.like.indexOf(user._id), 1);
  }
  await post.save();
  res.json(post);
});

router.get("/feed", isLoggedIn, async function (req, res) {
  var user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");

  let stories = await storyModel.find({ user: { $ne: user._id } })
  .populate("user");
  let allUser = await userModel.find().populate("stories")
  let storyUser = allUser.filter( item =>{
    if (item.stories.length > 0 && item.id != user.id) {
      return true;
    }
    else return false;
  })
  var uniq = {};
  var uniqueUser = stories.filter(item => {
    if(!uniq[item.user.id]){
      uniq[item.user.id] = " ";
      return true;
    }
    else return false;
  })
  // console.log(storyUser)
  let posts = await postModel.find().populate("user");

  res.render("feed", {
    footer: true,
    user,
    posts,
    storyUser,
    dater: utils.formatRelativeTime,
  });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts")
    .populate("saved");
  // console.log(user);

  res.render("profile", { footer: true, user });
});

router.get("/profile/:userId", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });

  if (user._id === req.params.userId) {
    res.redirect("/profile");
  }

  let userprofile = await userModel
    .findById(req.params.userId)
    .populate("posts");

  res.render("userprofile", { footer: true, userprofile, user });
});

router.get("/check/:follow/:postUserId", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({
    username: req.session.passport.user,
  });


  let followHoneWaala = await userModel.findById(req.params.postUserId);

  if (user.following.indexOf(followHoneWaala._id) !== -1) {
    let index = user.following.indexOf(followHoneWaala._id);
    user.following.splice(index, 1);

    let index2 = followHoneWaala.followers.indexOf(user._id);
    followHoneWaala.followers.splice(index2, 1);
  } else {
    followHoneWaala.followers.push(user._id);
    user.following.push(followHoneWaala._id);
  }

  await followHoneWaala.save();
  await user.save();
  if (req.params.follow == "followfromUserprofile") {
    res.redirect(`/profile/${req.params.postUserId}`);
  }else if(req.params.follow == "followfromFollowing"){ 
    res.redirect(`/following`);
  }else if(req.params.follow == "followfromFollowers"){ 
    res.redirect(`/followers`);
  }else{
    res.redirect("/feed");
  }
});

router.get("/search", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });
  res.render("search", { footer: true, user });
});

router.get("/save/:postid", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });

  if (user.saved.indexOf(req.params.postid) === -1) {
    user.saved.push(req.params.postid);
  } else {
    var index = user.saved.indexOf(req.params.postid);
    user.saved.splice(index, 1);
  }
  await user.save();
  res.json(user);
});

router.get("/followers", isLoggedIn, async (req,res)=>{
  let user = await userModel.findOne({ username: req.session.passport.user }).populate('followers');
  res.render('followers',{ footer: true ,user})
})
router.get("/following", isLoggedIn, async (req,res)=>{
  let user = await userModel.findOne({ username: req.session.passport.user }).populate('following');
  res.render('following',{ footer: true ,user})
})

router.get("/saved", isLoggedIn , async (req,res)=>{
  let user = await userModel.findOne({ username: req.session.passport.user }).populate("saved");
  res.render('saved',{ footer: true ,user})
})
router.get("/search/:user", isLoggedIn, async function (req, res) {
  const searchTerm = `^${req.params.user}`;
  const regex = new RegExp(searchTerm);

  let users = await userModel.find({ username: { $regex: regex } });

  res.json(users);
});

router.get("/edit", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user });
});
router.get("/editPost/:postId", isLoggedIn, async function (req, res) {
  let {postId} = req.params;
  const post = await postModel.findById(postId)
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("editPost", { footer: true, user,post });
});
router.post("/updatePost/:postId",isLoggedIn,upload.single("image"), async function(req,res){
  var {postId} = req.params;
  if (req.file) {
    const updatedPost = await postModel.findByIdAndUpdate(postId,{picture: req.file.filename,like: []},{ new: true })
  }
  if (req.body.caption) {
    const updatedPost = await postModel.findByIdAndUpdate(postId,{caption: req.body.caption},{ new: true })
  }
  res.redirect('/feed')
})
router.post("/deletePost/:postId/:userId",isLoggedIn, async function(req,res){
  try {
    var {postId,userId} = req.params;
    const user = await userModel.findById(userId)
    const updatedPostOfUser = user.posts.filter(item =>{
      if (item._id == postId) {
        return false;
      } else {
        return true;
      }
    })
    const updatedUser = await userModel.findByIdAndUpdate(userId,{posts: updatedPostOfUser});
    const updatedPost = await postModel.findByIdAndDelete(postId);
    res.redirect('/feed')
  } catch (error) {
    console.log(error);
    res.redirect('/feed')
  }
})

router.get("/upload", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ username: req.session.passport.user });
  res.render("upload", { footer: true, user });
});

router.post("/update", isLoggedIn ,upload.single("image"), async function (req, res) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    { username: req.body.username, name: req.body.name, bio: req.body.bio },
    { new: true }
  );
  req.login(user, function (err) {
    if (err) throw err;
    res.redirect("/profile");
  });
});

router.post(
  "/post",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    if (req.body.category === "post") {
      const post = await postModel.create({
        user: user._id,
        caption: req.body.caption,
        picture: req.file.filename,
      });
      user.posts.push(post._id);
    } else if (req.body.category === "story") {
      let story = await storyModel.create({
        story: req.file.filename,
        caption: req.body.caption,
        user: user._id,
      });
      user.stories.push(story._id);
    } else {
      res.send("tez mat chalo");
    }

    await user.save();
    res.redirect("/feed");
  }
);

router.post(
  "/upload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    user.picture = req.file.filename;
    await user.save();
    res.redirect("/edit");
  }
);

// POST

router.post("/register", function (req, res) {
  const user = new userModel({
    username: req.body.username,
    email: req.body.email,
    name: req.body.name,
  });

  userModel.register(user, req.body.password).then(function (registereduser) {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/feed",
    failureRedirect: "/login",
  }),
  function (req, res) {}
);

router.get("/logout", function (req, res) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

router.get("/story/:userId", isLoggedIn,async (req,res)=>{
  let { userId } = req.params
  let user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");

  let storyUser = await userModel.findById(userId).populate("stories")

  let stories = await storyModel.find({ user: { $ne: user._id } })
  .populate("user");

  // console.log(stories)
  res.render("story",{ footer: true ,user,storyUser})
})

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/login");
  }
}
var cron = require('node-cron');

// To remove story after 24hours from the uploading time
cron.schedule('* * * * *', async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const expiredStories = await storyModel.find({ date: { $lt: cutoff } });
  
  for (const story of expiredStories) {
    await storyModel.findByIdAndDelete(story._id);

    await userModel.updateMany(
      { stories: story._id },
      { $pull: { stories: story._id } }
    );
  }
});

module.exports = router;
