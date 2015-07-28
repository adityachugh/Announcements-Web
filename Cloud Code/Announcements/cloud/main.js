
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:

const USER = 'User';
const _USER = '_User';
const ORGANIZATION = 'Organization';

var Organization = Parse.Object.extend("Organization");


Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

Parse.Cloud.define("testWithParameters", function(request, response) {
  response.success("Hello " + request.params.name + ". You are " + request.params.age + " years old!");
});


Parse.Cloud.define("isFieldValueInUse", function(request, response){
    //TESTED

    //Pre: className, key, value
    //Post: true if in use, false if not in use
    //Purpose: Returns if field value is currently in use (ex. username already being used)

    Parse.Cloud.useMasterKey();

    var className = request.params.className;
    var key = request.params.key;
    var value = request.params.value;

    var query;
    if (className == USER || className == _USER) {
        query = new Parse.Query(Parse.User);
    } else {
        query = new Parse.Query(className);
    }

    query.equalTo(key, value);
    query.find({
        success: function(results) {
            if (results.length < 1) {
                response.success(false);
            } else {
                response.success(true)
            }
        },
        error: function(error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("getAllChildOrganizations", function(request, response){

    //NOT TESTED

    //Pre: parentOrganizationObjectId (will be null for top level organization)
    //Post: array of childOrganizations
    //Purpose: get all child organizations (ex. get schools for a school board)

    //ALSO used in Discover view - will show all 'clubs' based on selected school

    Parse.Cloud.useMasterKey();
    var parentOrganization = new Organization();
    parentOrganization.id = request.params.parentOrganizationObjectId;
    var query = new Parse.Query(ORGANIZATION);
    query.equalTo('Parent', parentOrganization);
    query.find({
        success: function(results) {
            response.success(results);
        },
        error: function(error) {
            response.error(error);

        }
    });

});

Parse.Cloud.define("getRangeOfAnnouncementsForDay", function(request, response){
    //NOT TESTED

    //Pre: startIndex, endIndex, date
    //Post: array of announcements for user
    //Purpose: get announcements for a certain range & day (used in today view) (ex. get announcements 0-9 for today)

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("getRangeOfCommentsForAnnouncement", function(request, response){
    //NOT TESTED

    //Pre: startIndex, endIndex, post
    //Post: return array of comments for a post
    //Purpose: get comments for a certain range & post (loads latest first (see facebook commenting system)) (used in announcementDetail view) (ex. get comments 0-9 for an post)

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("postCommentAsUserOnAnnouncement", function(request, response){
    //NOT TESTED

    //Pre: commentText, user, time, post
    //Post: true if comment was posted, false if post failed
    //Purpose: user posts comment on announcement (used in announcementDetail view)

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("postCommentAsOrganizationOnAnnouncement", function(request, response){
    //NOT TESTED

    //Pre: commentText, organization, time, post
    //Post: true if comment was posted, false if post failed
    //Purpose: post comment on announcement (used in announcementDetail view)

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("getClubsFollowedByUser", function(request, response){
    //NOT TESTED

    //Pre: user
    //Post: array of clubs that the user follows
    //Purpose: to display user's followed club list (used in userProfile view)

    Parse.Cloud.useMasterKey();
});

//NEXT 3: make separate functions for updating club photo/cover/description, or keep generic?

Parse.Cloud.define("updateUserProfilePhoto", function(request, response){
    //NOT TESTED

    //Pre: user, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the profile photo of the user

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("updateUserCoverPhoto", function(request, response){
    //NOT TESTED

    //Pre: user, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the cover photo of the user

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("updateUserDescription", function(request, response){
    //NOT TESTED

    //Pre: user, description
    //Post: true if description was successfully saved, false if failed
    //Purpose: update the description of the user

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("getPostsOfOrganizationInRange", function(request, response){
    //NOT TESTED

    //Pre: Organization, startIndex, endIndex
    //Post: array of posts (latest first)
    //Purpose: to show array of posts (latest first) for use in clubProfileView

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("getChildOrganizationsInRange", function(request, response){
    //NOT TESTED

    //Pre: Organization, startIndex, endIndex
    //Post: array of children (latest first)
    //Purpose: to show array of posts (latest first) for use in clubProfileView

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("checkIfUserIsAdminOfOrganization", function(request, response){
    //NOT TESTED

    //Pre: Organization, user
    //Post: true if admin, false if not
    //Purpose: find out if user is admin of an organization - sees different screens

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("updateFollowStateForUser", function(request, response){
    //NOT TESTED

    //Pre: isFollowing, user, organization
    //Post: true if it was successful, false if not successful; isFollowing
    //Purpose: allow user to follow / unfollow organizations

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("getFollowersAndFollowRequestsForOrganizationInRange", function(request, response){
    //NOT TESTED

    //Pre: organization, startIndex, endIndex
    //Post: array of followers
    //Purpose: get followers in a certain range for an organization

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("getAdminsForOrganizationInRange", function(request, response){
    //NOT TESTED

    //Pre: Organization, startIndex, endIndex
    //Post: array of admins
    //Purpose: get admins in a certain range for an organization

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("addAdminToOrganization", function(request, response){
    //NOT TESTED

    //Pre: Organzation, selectedUserToBeAdmin, adminRoleAssigned
    //Post: true if succesfully added as admin, false if failed.
    //Purpose: to add new admins to an organization

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("removeAdminFromOrganization", function(request, response){
    //NOT TESTED

    //Pre: Organization, selectedAdminToRemove
    //Post: true if succesfully removed, false is failed.
    //Purpose: to remove admins from an organization

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("createNewOrganization", function(request, response){
    //NOT TESTED

    //Pre: parentOrganizationObjectId, organizationName, organizationHandle, organizationDescription, organizationType, adminArray
    //Post: true if successfully created club, false is failed.
    //Purpose: to create a new organization which is a child to another organization that the user is an admin of

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("updateOrganizationFields", function(request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, organizationName, organizationDescription, organizationType, adminArray
    //Post: true if successfully modified organization's attributes, false if failed
    //Purpose: to update an organization's information

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("changeOrganizationType", function(request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, oldType, newType
    //Post: true if successfully changed, false if failed
    //Purpose: to change organizationType to public from private or vice versa

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("privateOrganizationAccessCodeEntered", function(request, response) {
    //NOT TESTED

    //Pre: user, organizationObjectId, organizationType, accessCode, enteredAccessCode
    //Post: true if user inputs correct access code; false if incorrect code
    //Purpose: to determine whether user has entered the correct access code to join a private organization - sends follow request

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("getRequestedPrivateOrganizationUsers", function(request, response) {
    //NOT TESTED

    //Pre: Organization, startIndex, endIndex [only load max 10-15 at once]
    //Post: Array of requested users
    //Purpose: display requested users as a 'pending' list for private organization admins (can accept or reject)

    //updateFollowStateForUser if admin accepts request

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("deletePost", function(request, response) {
    //NOT TESTED

    //Pre: post, user
    //Post: true if deleted, false if not
    //Purpose: Delete a post, and all associated comments

    Parse.Cloud.useMasterKey();
});

Parse.Cloud.define("deleteComment", function(request, response) {
    //NOT TESTED

    //Pre: comment, user
    //Post: true if deleted, false if not
    //Purpose: Delete a comment

    Parse.Cloud.useMasterKey();
});