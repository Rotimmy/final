var firebaseConfig = {
  apiKey: "AIzaSyDxYp7nP2Qo5lsoio-ZFf6Zb6glqC66QWk",
  authDomain: "twitter-feed-44e41.firebaseapp.com",
  databaseURL: "https://twitter-feed-44e41.firebaseio.com",
  projectId: "twitter-feed-44e41",
  storageBucket: "twitter-feed-44e41.appspot.com",
  messagingSenderId: "576611415232",
  appId: "1:576611415232:web:21c12b30e978e149336925"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

let postAppRef = firebase.database();

$(document).ready(function(){
  getData();
  loadFeed();
  curate();
  popUp();
});

function getData(){
  let url = "https://api.instagram.com/v1/users/self/media/recent/?access_token=1125976861.22fd430.3c5674ff251d49baa3062292bd4fd71e";
  // fetch data
  $.get(url).done(function(res){
    let postRef = postAppRef.ref("approved");
    postRef.remove()
      .then(function() {
        console.log("Remove succeeded.");
        if(res.data.length === 0){
          console.log("Sorry, we could not find any posts matching your query");
        } else {
          pushToFirebase(res, postRef);
        };
      })
      .catch(function(error) {
        console.log("Remove failed: " + error.message)
      });
  });
};

// push to firebase (CREATE/PUSH)
function pushToFirebase(res, postRef){
  let postArr = res.data;

  $.each(postArr, function(){
    let $this = this,
        postID = $this.id,
        username = $this.user.username,
        likes = $this.likes,
        postUrl = $this.link,
        imgUrl = $this.images.standard_resolution.url,
        date = $this.created_time; // standardize date format

    if ($this.caption !== null){
      var caption = $this.caption.text
    } else {
      var caption = "null";
    };
    // create object
    let fbPostData = {
      "id": postID,
      "username": username,
      "likes": likes,
      "url": postUrl,
      "img": imgUrl,
      "caption": caption
    };
    // push to firebase
    postRef.push({
      post: fbPostData
    });
  });
};

// load feed (READ/GET)
function loadFeed(){
  let keys = [];
  let posts = [];

  postAppRef.ref("approved").on("value", (res)=>{
    let postData = res.val();

    for(key in postData){
       keys.push(key);
       posts.push(postData[key].post);
    }
    $("#feed").empty(); // empty feed

    $.each(posts, function(i){
      let $this = this;
      // load articles
      let $div = $("<div></div>"),
          $post = $div.addClass("post"),
          $imgWrap = $("<div></div>").addClass("post-img-wrap"),
          $imgInner = $("<div></div>").addClass("post-img-inner"),
          $openIcon = $("<img>").addClass("icon").attr("src", "images/open.png"),
          $approvalBtn = $("<img>").addClass("approval-btn").attr("src", "images/minus_wh.png"),
          $body = $("<div></div>").addClass("post-body"),
          $byline = $("<div></div>").addClass("byline"),
          $author = $("<span></span>").addClass("author"),
          $likes = $("<span></span>").addClass("likes"),
          $heart = $("<img>").addClass("heart").attr("src", "images/heart.png")
          $date = $("<span></span>").addClass("date"),
          // $editBtn = $("<div>edit</div>").addClass("edit-btn"),
          $text = $("<div></div>").addClass("caption");
      // post id:
      $post.attr("data-id", keys[i]);
      // post image
      $($imgInner).appendTo($imgWrap).append($openIcon);
      if ($this.img == null || $this.img == undefined){
        $($imgWrap).css("background-image", "url('" + $this.alt + "')");
      } else {
        $($imgWrap).css("background-image", "url('" + $this.img + "')");
      };
      $($imgWrap).appendTo($post);
      $($approvalBtn).appendTo($post);
      // post body
      $($author).text($this.username).appendTo($byline);
      $($likes).text($this.likes.count).prepend($heart).appendTo($byline);
      $($byline).appendTo($body);
      // $($date).text($this.date).appendTo($byline);
      if ($this.caption !== "null"){
        $($text).text($this.caption).appendTo($body);
      } else {
        $($text).appendTo($body);
      }
      $($body).appendTo($post);
      // append post to feed
      $($post).appendTo("#feed");
    });
    keys = [];
    posts = [];
  })
};

// curate (DELETE)
function curate(){
  let excluded = [];
  // choose which posts to exclude from feed
  $("#feed").on("click", ".approval-btn", function(){
    let $post = $(this).parent(),
        key = $post.attr("data-id"),
        postToDelete = postAppRef.ref("approved/" + key);

    excluded.push(postToDelete);
    $post.toggleClass("exclude");
  })
  // delete posts
  $("#curate-btn").click(function(e){
    e.preventDefault();
    $.each(excluded, function(i){
      excluded[i].remove();
    })
  });
};

// popUp
function popUp(){
  $("#feed").on({ // show popUp icon on hover with delegation
    mouseenter: function () {
      $(this).find(".icon").css("opacity", "1");
    },
    mouseleave: function () {
      $(this).find(".icon").css("opacity", "0");
    }
  }, ".post-img-wrap");
  $("#feed") // open popUp on click with delegation
    .on("click", ".post-img-wrap", function() {
      let $post = $(this).parent(),
          key = $post.attr("data-id"),
          targetPost = postAppRef.ref("approved/" + key + "/post");
      // get snapshot of post data
      targetPost.once("value").then((snapshot)=> {
        let postData = snapshot.val();
        // load popUp
        $("#popUpImg").css("background-image", "url('" + postData.img + "')");
        $("#popUpUsername").text(postData.username);
        $("#popUpLikes").text(postData.likes.count);
        if (postData.caption !== "null"){
          $("#popUpCaption").text(postData.caption).attr("data-id", key);
        } else {
          $("#popUpCaption").text("...").attr("data-id", key);
        }
        $("#popUpAction").attr("href", postData.url);
        $("#popUp").removeClass("loader").removeClass("hidden");
      }).catch((errorObject)=> {
          console.log("The read failed: " + errorObject.code);
      });
  });
  editCaption(); // edit caption in popUp
  // hide popUp
  $("#closePopUp").click(function(){
    $("#popUp").addClass("hidden");
  });
};
// edit caption (UPDATE)
function editCaption(){
  // show/hide edit button on hover
  $("#popUpBody").hover(
    function() {
      $("#captionEdit").fadeIn("fast");
    }, function() {
      $("#captionEdit").fadeOut();
    }
  );
  // make caption editable on click
  $("#captionEdit").click(function(){
    let key = $("#popUpCaption").attr("data-id"),
        postToUpdate = postAppRef.ref("approved/" + key + "/post");

    postToUpdate.once("value").then((snapshot)=> {
      let postData = snapshot.val();

      if ($(this).hasClass("save")) {
        $(this).text("edit").removeClass("save");
        $("#popUpCaption").attr("contenteditable", "false").css({
          'border': 'none',
          'outline': 'none',
          'background': 'none'
        });
      } else {
        $(this).text("save").addClass("save");
        $("#popUpCaption").attr("contenteditable", "true").css({
          'border': 'none',
          'outline': 'none',
          'background': '#ccc9e0'
        }).focus();
      };
    }).catch((errorObject)=> {
      console.log("The read failed: " + errorObject.code);
    });

    $("#closePopUp").click(function(){
      let newText = $("#popUpCaption").text();
      postToUpdate.update({
        caption: newText
      })
    });

  })
};

// twitter:
// const con_key = config.CONSUMER_KEY,
//       token = config.OAUTH_TOKEN,
//       timestamp = config.TIMESTAMP,
//       oauth_nonce = config.OAUTH_NONCE,
//       signature = config.OAUTH_SIGNATURE;
//
// var settings = {
//   "async": true,
//   "crossDomain": true,
//   "url": "https://cors-anywhere.herokuapp.com/https://api.twitter.com/1.1/search/tweets.json?q=yosemite",
//   "method": "GET",
//   "headers": {
//     "Authorization": "OAuth oauth_consumer_key=" + con_key + ",oauth_token=" + token + ",oauth_signature_method=\"HMAC-SHA1\",oauth_timestamp=" + timestamp + ",oauth_nonce=" + oauth_nonce + ",oauth_version=\"1.0\",oauth_signature=" + signature,
//     "cache-control": "no-cache",
//     "Postman-Token": "d03231fa-e279-461b-af52-5189082e55ba"
//   }
// }
//
// $.ajax(settings).done(function (res) {
//   console.log(res.user);
// });
