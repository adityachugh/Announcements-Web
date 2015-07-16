
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:

Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("isFieldValueInUse", function(request, response){
    //Pre: className, key, value
    //Post: true if in use, false if not in use
    //Purpose: Returns if field value is currently in use (ex. username already being used)

});

Parse.Cloud.define("getAllChildOrganizations", function(request, response){
    //Pre: parentOrganization (will be null for top level organization)
    //Post: array of childOrganizations
    //Purpose: get all child organizations (ex. get schools for a school board)

});

Parse.Cloud.define("getRangeOfAnnouncementsForDay", function(request, response){
    //Pre: startIndex, endIndex, date
    //Post: array of announcements for user
    //Purpose: get announcements for a certain range & day (used in today view) (ex. get announcements 0-9 for today)

});

Parse.Cloud.define("getRangeOfCommentsForAnnouncement", function(request, response){
    //Pre: startIndex, endIndex, post
    //Post: return array of comments for a post
    //Purpose: get comments for a certain range & post (loads latest first (see facebook commenting system)) (used in announcementDetail view) (ex. get comments 0-9 for an post)

});

Parse.Cloud.define("postCommentAsUserOnAnnouncement", function(request, response){
    //Pre: commentText, user, time, post
    //Post: true if comment was posted, false if post failed
    //Purpose: user posts comment on announcement (used in announcementDetail view)

});

Parse.Cloud.define("postCommentAsOrganizationOnAnnouncement", function(request, response){
    //Pre: commentText, organisation, time, post
    //Post: true if comment was posted, false if post failed
    //Purpose: post comment on announcement (used in announcementDetail view)

});

Parse.Cloud.define("getClubsFollowedByUser", function(request, response){
    //Pre: user
    //Post: array of clubs that the user follows
    //Purpose: to display user's followed club list (used in userProfile view)

});

Parse.Cloud.define("updateUserProfilePhoto", function(request, response){
    //Pre: user, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the profile photo of the user

});

Parse.Cloud.define("updateUserCoverPhoto", function(request, response){
    //Pre: user, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the cover photo of the user

});

Parse.Cloud.define("updateUserDescription", function(request, response){
    //Pre: user, description
    //Post: true if description was successfully saved, false if failed
    //Purpose: update the description of the user

});

Parse.Cloud.define("getChildrenClubsOfOrganization", function(request, response){
    //Pre: Organization
    //Post:
    //Purpose:

});