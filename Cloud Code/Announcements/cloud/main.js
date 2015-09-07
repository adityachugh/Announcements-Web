var constants = require('cloud/constants');
var _ = require("underscore");

//Class name constants
const USER = 'User';
const _USER = '_User';
const ORGANIZATION = 'Organization';
const POST = 'Post';
const FOLLOWERS = 'Followers';
const COMMENTS = 'Comments';
const LEVEL_CONFIG = 'OrganizationLevelsConfig';
const CONFIG = 'OrganizationConfig';

//Parse objects
var Organization = Parse.Object.extend(ORGANIZATION);
var Post = Parse.Object.extend(POST);
var Comments = Parse.Object.extend(COMMENTS);
var Followers = Parse.Object.extend(FOLLOWERS);
var LevelConfig = Parse.Object.extend(LEVEL_CONFIG);
var Config = Parse.Object.extend(CONFIG);

const STATUS_APPROVED = 'A';
const STATUS_PENDING = 'P';
const STATUS_REJECTED = 'R';

const USER_TYPE_ADMIN = 'A';
const USER_TYPE_FOLLOWER = 'F';
const USER_TYPE_NOT_FOLLOWER = 'N';

const TYPE_NOT_FOLLOWER = 'NFO';
const TYPE_ADMIN = 'ADM';
const TYPE_FOLLOWER = 'FOL';
const TYPE_PENDING = 'PEN';
const TYPE_REJECTED = 'REJ';

const ORGANIZATION_PUBLIC = 'PUB';
const ORGANIZATION_PRIVATE = 'PRI';

var checkIfUserIsLoggedIn = function(request, response, code) {
    if (!request.user) {
        response.error('User not logged in!');
    } else {
        code(request, response);
    }
};

var checkIfUserCanViewPost = function(request, response, code) {
    var query = new Parse.Query(POST);
    query.include('organization');
    query.get(request.params.postObjectId, {
        success: function(result) {
            if (result) {
                var post = result;
                var followerQuery = new Parse.Query(FOLLOWERS);
                followerQuery.equalTo('user', request.user);
                followerQuery.equalTo('organization', result.get('organization'));
                followerQuery.notEqualTo('userType', USER_TYPE_NOT_FOLLOWER);
                followerQuery.equalTo('status', STATUS_APPROVED);
                followerQuery.first({
                    success: function(result) {
                        if(result == null) {
                            response.error('You do not have rights to view this post!');
                        } else {
                            if (post.get('startDate') > new Date()) {
                                code(request, response);
                            } else {
                                response.error('You are do not have rights to view this post!');
                            }
                        }
                    },
                    error: function(error) {
                        response.error(error);
                    }
                });
            } else {
                response.error(error);
            }
        },
        error: function(error) {
            response.error(error);
        }
    });
};

var checkIfUserIsAdminOfOrganization = function(request, response, code) {
    var organization = new Organization();
    organization.id = request.params.organizationObjectId;

    var query = new Parse.Query(FOLLOWERS);
    query.equalTo('organization', organization);
    query.equalTo('userType', USER_TYPE_ADMIN);
    query.equalTo('status', STATUS_APPROVED);
    query.equalTo('user', request.user);
    query.first({
        success: function(result) {
            if(result == null) {
                response.error('You are do not have admin rights for this organization!');
            } else { //Admin validation
                code(request, response);
            }
        },
        error: function(error) {
            response.error(error);
        }
    });
};

Parse.Cloud.define("isFieldValueInUse", function(request, response){
    //TESTED

    //Pre: className, key, value
    //Post: true if in use, false if not in use
    //Purpose: Returns if field value is currently in use (ex. username already being used)

    //Parameters
    var className = request.params.className;
    var key = request.params.key;
    var value = request.params.value;

    //Setup query
    var query;
    if (className == USER || className == _USER) {
        query = new Parse.Query(Parse.User);
    } else {
        query = new Parse.Query(className);
    }
    query.equalTo(key, value);
    query.find({
        success: function(results) {

            if (results.length < 1) { //Field value is not in use
                response.success(false);
            } else { //Field value is in use
                response.success(true)
            }
        },
        error: function(error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("getAllChildOrganizations", function(request, response){

    //TESTED

    //Pre: parentOrganizationObjectId
    //Post: array of childOrganizations
    //Purpose: get all child organizations (ex. get schools for a school board)

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var parentOrganization = new Organization();
        parentOrganization.id = request.params.parentOrganizationObjectId;
        var query = new Parse.Query(ORGANIZATION);
        query.equalTo('parent', parentOrganization);
        query.find({
            success: function(results) {
                response.success(results);
            },
            error: function(error) {
                response.error(error);
            }
        });

    });

});

Parse.Cloud.define("isFollowingOrganization", function(request, response){

    //TESTED

    //Pre: organizationObjectId
    //Post: returns the status of the follow
    //Purpose: to find out if a user is following an organization

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var organization = new Organization();
        organization.id = request.params.organizationObjectId;

        var user = request.user;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('user', user);
        query.equalTo('organization', organization);
        query.first({
            success: function(result) {
                if(result.get('userType') == USER_TYPE_NOT_FOLLOWER) {
                    if(result.get('status') != STATUS_APPROVED) {
                        response.success(result.get('status'));
                    } else {
                        response.success(null);
                    }
                } else if(result == null) {
                    response.success(null);
                } else {
                    response.success(result.get("status"));
                }
            },
            error: function(error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getAllTopLevelOrganizations", function(request, response){

    //TESTED

    //Pre:
    //Post: array of all topLevelOrganizations
    //Purpose: get all top level organizations

    var query = new Parse.Query(ORGANIZATION);
    query.doesNotExist('parent');
    query.find({
        success: function(results) {
            response.success(results);
        },
        error: function(error) {
            response.error(error);
        }
    });

});

Parse.Cloud.define("getRangeOfPostsForDay", function(request, response){

    //TESTED

    //Pre: startIndex, numberOfPosts, date
    //Post: array of posts for user
    //Purpose: get posts for a certain range & day (used in today view) (ex. get posts 0-9 for today)

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var followersQuery = new Parse.Query(FOLLOWERS);
        followersQuery.equalTo('user', request.user);
        followersQuery.equalTo('status', STATUS_APPROVED);
        followersQuery.notEqualTo('userType', USER_TYPE_NOT_FOLLOWER);
        followersQuery.include('organization');

        var date = request.params.date;
        console.error(date);
        var startIndex = request.params.startIndex;
        var numberOfPosts = request.params.numberOfPosts;

        var query = new Parse.Query(POST);
        query.greaterThanOrEqualTo('postEndDate', date);
        query.lessThanOrEqualTo('postStartDate', date);
        query.matchesKeyInQuery('organization', 'organization', followersQuery);
        query.skip(startIndex);
        query.limit(numberOfPosts);
        query.descending('priority');
        query.descending('postStartDate');
        query.equalTo('status', STATUS_APPROVED);
        query.include('organization');
        query.find({
            success: function (results) {
                response.success(results);
            }, error: function (error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getRangeOfCommentsForPost", function(request, response){
    //TESTED

    //Pre: startIndex, numberOfComments, postObjectId
    //Post: return array of comments for a post
    //Purpose: get comments for a certain range & post (loads latest first (see facebook commenting system)) (used in postDetail view) (ex. get comments 0-9 for an post)

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserCanViewPost(request, response, function(request, response) {

            var postObjectId = request.params.postObjectId;
            var startIndex = request.params.startIndex;
            var numberOfComments = request.params.numberOfComments;

            var post = new Post();
            post.id = postObjectId;

            var query = new Parse.Query(COMMENTS);
            query.equalTo('post', post);
            query.skip(startIndex);
            query.limit(numberOfComments);
            query.include('createUser');
            query.notEqualTo('isDeleted', true);
            Parse.Cloud.useMasterKey();
            query.find({
                success: function (results) {
                    response.success(results);
                }, error: function (error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("postCommentAsUserOnPost", function(request, response){
    //TESTED

    //Pre: commentText, postObjectId
    //Post: true if comment was posted, false if post failed
    //Purpose: user posts comment on post (used in postDetail view)

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserCanViewPost(request, response, function(request, response) {

            var postObjectId = request.params.postObjectId;
            var commentText = request.params.commentText;
            var user = request.user;
            var post = new Post();
            post.id = postObjectId;

            var comment = new Comments();

            comment.save({
                createUser : user,
                comment : commentText,
                post : post
            }, {
                success: function(comment) {
                    response.success(comment);
                },
                error: function(comment, error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("getOrganizationsForDiscoverTabInRange", function(request, response){
    //TESTED

    //Pre: userObjectId, startIndex, numberOfOrganizations
    //Post: array of children (latest first)
    //Purpose: to show array of posts (latest first) for use in clubProfileView

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var startIndex = request.params.startIndex;
        var numberOfOrganizations = request.params.numberOfOrganizations;

        var user = new Parse.User();
        user.id = request.params.userObjectId;
        var query = new Parse.Query(ORGANIZATION);
        //query.query.notContainedIn('userType', [USER_TYPE_ADMIN, USER_TYPE_FOLLOWER]);
        query.skip(startIndex);
        query.limit(numberOfOrganizations);
        query.find({
            success: function(results) {
                response.success(results);
            },
            error: function(error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getOrganizationsFollowedByUserInRange", function(request, response){
    //TESTED

    //Pre: userObjectId, startIndex, numberOfOrganizations
    //Post: array of clubs that the user follows
    //Purpose: to display user's followed club list (used in userProfile view)

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var user = new Parse.User();
        user.id = request.params.userObjectId;

        var startIndex = request.params.startIndex;
        var numberOfOrganizations = request.params.numberOfOrganizations;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('user', user);
        query.notEqualTo('userType', USER_TYPE_NOT_FOLLOWER);
        query.notContainedIn('status', [STATUS_PENDING, STATUS_REJECTED]);
        query.include('organization');
        query.skip(startIndex);
        query.limit(numberOfOrganizations);
        query.find({
            success: function(results) {
                response.success(results);
            },
            error: function(error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("updateUserProfilePhoto", function(request, response) {
    //TESTED

    //Pre: userObjectId, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the profile photo of the user

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var userObjectId = request.params.userObjectId;
        if (userObjectId == request.user.id) {
            var photo = request.params.photo;
            var photoFile = new Parse.File(userObjectId, photo, 'image/png');
            request.user.save({
                'profilePhoto' : photoFile
            }, {
                success: function(user) {
                    response.success(user);
                },
                error : function(user, error) {
                    response.error(error);
                }
            });
        } else {
            response.error('Another user cannot be edited!');
        }
    });
});

Parse.Cloud.define("updateOrganizationProfilePhoto", function(request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the profile photo of the user

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {
            var organizationObjectId = request.params.organizationObjectId;
            var photo = request.params.photo;
            var photoFile = new Parse.File(organizationObjectId, photo, 'image/png');
            var organization = new Organization();
            organization.id = organizationObjectId;
            organization.save({
                'image' : photoFile
            }, {
                success: function(organization) {
                    response.success(true);
                },
                error : function(user, error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("updateOrganizationCoverPhoto", function(request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the profile photo of the user

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {
            var organizationObjectId = request.params.organizationObjectId;
            var photo = request.params.photo;
            var photoFile = new Parse.File(organizationObjectId + '_cover', photo, 'image/png');
            var organization = new Organization();
            organization.id = organizationObjectId;
            organization.save({
                'coverPhoto' : photoFile
            }, {
                success: function(organization) {
                    response.success(true);
                },
                error : function(user, error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("updateUserCoverPhoto", function(request, response){
    //TESTED

    //Pre: userObjectId, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the cover photo of the user

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var userObjectId = request.params.userObjectId;
        if (userObjectId == request.user.id) {
            var photo = request.params.photo;
            var photoFile = new Parse.File(userObjectId+'_cover', photo, 'image/png');
            request.user.save({
                'coverPhoto' : photoFile
            }, {
                success: function(user) {
                    response.success(user);
                },
                error : function(user, error) {
                    response.error(error);
                }
            });
        } else {
            response.error('Another user cannot be edited!');
        }
    });
});

Parse.Cloud.define("updateUserDescription", function(request, response){
    //TESTED

    //Pre: userObjectId, description
    //Post: true if description was successfully saved, false if failed
    //Purpose: update the description of the user

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var userObjectId = request.params.userObjectId;
        if (userObjectId == request.user.id) {
            var description = request.params.description;
            request.user.save({
                'userDescription' : description
            }, {
                success: function(user) {
                    response.success(user);
                },
                error : function(user, error) {
                    response.error(error);
                }
            });
        } else {
            response.error('Another user cannot be edited!');
        }
    });

});

Parse.Cloud.define("getPostsOfOrganizationInRange", function(request, response){
    //TESTED

    //Pre: OrganizationObjectId, startIndex, numberOfPosts
    //Post: array of posts (latest first)
    //Purpose: to show array of posts (latest first) for use in clubProfileView

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var organizationObjectId = request.params.organizationObjectId;
        var startIndex = request.params.startIndex;
        var numberOfPosts = request.params.numberOfPosts;
        var organization = new Organization();
        organization.id = organizationObjectId;

        var query = new Parse.Query(POST);
        query.equalTo('organization', organization);
        query.lessThanOrEqualTo('postStartDate', new Date());
        query.skip(startIndex);
        query.limit(numberOfPosts);
        query.descending('postStartDate');
        query.equalTo('status', STATUS_APPROVED);
        query.find({
            success: function(results) {
                response.success(results);
            },
            error: function(error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getChildOrganizationsInRange", function(request, response){
    //TESTED

    //Pre: parentOrganizationObjectId, startIndex, numberOfOrganizations
    //Post: array of children (latest first)
    //Purpose: to show array of posts (latest first) for use in clubProfileView

    checkIfUserIsLoggedIn(request, response, function(request, response) {
        var parentOrganization = new Organization();
        parentOrganization.id = request.params.parentOrganizationObjectId;
        var startIndex = request.params.startIndex;
        var numberOfOrganizations = request.params.numberOfOrganizations;

        var query = new Parse.Query(ORGANIZATION);
        query.equalTo('parent', parentOrganization);
        query.skip(startIndex);
        query.limit(numberOfOrganizations);
        query.find({
            success: function(results) {
                response.success(results);
            },
            error: function(error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("checkIfUserIsAdminOfOrganization", function(request, response){
    //TESTED

    //Pre: organizationObjectId, userObjectId
    //Post: true if admin, false if not
    //Purpose: find out if user is admin of an organization - sees different screens

    var organization = new Organization();
    organization.id = request.params.organizationObjectId;

    var user = new Parse.User();
    user.id = request.params.userObjectId;

    var query = new Parse.Query(FOLLOWERS);
    query.equalTo('user', user);
    query.equalTo('organization', organization);
    query.first({
        success: function(result) {
            if(result == null) {
                response.success(false);
            } else {
                if(result.get('userType') == USER_TYPE_ADMIN) {
                    response.success(true);
                } else {
                    response.success(false);
                }
            }
        },
        error: function(error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("updateFollowStateForUser", function(request, response){
    //TESTED

    //Pre: isFollowing, organizationObjectId
    //Post: true if it was successful, false if not successful; isFollowing
    //Purpose: allow user to follow / unfollow organizations
    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var organization = new Organization();
        organization.id = request.params.organizationObjectId;
        var isFollowing = request.params.isFollowing;
        var followerState = USER_TYPE_FOLLOWER;
        var status = STATUS_APPROVED;
        if(isFollowing) {
            followerState = USER_TYPE_FOLLOWER;
            status = STATUS_APPROVED;
        } else {
            followerState = USER_TYPE_NOT_FOLLOWER;
            status = null;
        }

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('user', request.user);
        query.equalTo('organization', organization);
        query.first({
            success: function(result) {
                if(result == null) {
                    response.success(false);
                } else {
                    result.save({
                        userType: followerState,
                        status: status
                    }, {
                        success: function(follower) {
                            response.success(true);
                        },
                        error: function(follower, error) {
                            response.error(error);
                        }
                    });
                }
            },
            error: function(error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getFollowersFollowRequestsAndAdminsForOrganizationInRange", function(request, response){
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfUsers, isAdmin
    //Post: array of followers
    //Purpose: get followers in a certain range for an organization

    checkIfUserIsLoggedIn(request, response, function(request, response) {
            var organization = new Organization();
            organization.id = request.params.organizationObjectId;
            var numberOfUsers = request.params.numberOfUsers;
            var startIndex = request.params.startIndex;
            var isAdmin = request.params.isAdmin;

            var query = new Parse.Query(FOLLOWERS);
            query.equalTo('organization', organization);
        query.exists('status');
        if (isAdmin) {
            query.notEqualTo('status', STATUS_REJECTED);
        } else {
            query.notEqualTo('userType', USER_TYPE_NOT_FOLLOWER);
            query.notContainedIn('status', [STATUS_PENDING, STATUS_REJECTED]);
        }
            query.descending('userType');
            query.limit(numberOfUsers);
            query.skip(startIndex);
            query.find({
                success: function (results) {
                    if (results != null) {
                        var pending = [];
                        var admins = [];
                        var members = [];
                        for (var i = 0; i < results.length; i++) {
                            if (results[i].get('status') == STATUS_PENDING) {
                                pending.push(results[i]);
                            } else if (results[i].get('userType') == USER_TYPE_ADMIN) {
                                admins.push(results[i]);
                            } else {
                                members.push(results[i]);
                            }
                        }
                        var finalResults = pending.concat(admins);
                        resultsToReturn = finalResults.concat(members);

                        response.success(resultsToReturn);
                    } else {
                        response.success(null);
                    }
                },
                error: function (error) {
                    response.error(error);
                }
            });
    });

});

Parse.Cloud.define("getAdminsForOrganizationInRange", function(request, response){
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfUsers
    //Post: array of admins
    //Purpose: get admins in a certain range for an organization

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var organization = new Organization();
        organization.id = request.params.organizationObjectId;
        var numberOfUsers = request.params.numberOfUsers;
        var startIndex = request.params.startIndex;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('organization', organization);
        query.equalTo('userType', USER_TYPE_ADMIN);
        query.descending('updatedAt');
        query.limit(numberOfUsers);
        query.skip(startIndex);
        query.find({
            success: function(results) {
                response.success(results);
            },
            error: function(error) {
                response.error(error);
            }
        });

    });
});

Parse.Cloud.define("getOrganizationsThatUserIsAdminOf", function(request, response){
    //TESTED

    //Pre: userObjectId
    //Post: array of organization
    //Purpose: get admins in a certain range for an organization

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var user = new Parse.User();
        user.id = request.params.userObjectId;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('user', user);
        query.equalTo('userType', USER_TYPE_ADMIN);
        query.equalTo('status', STATUS_APPROVED);
        query.include('organization.childLevelConfig');
        query.include('organization.levelConfig');
        query.include('organization.config');
        query.find({
            success: function(results) {
                response.success(results);
            },
            error: function(error) {
                response.error(error);
            }
        });

    });
});

Parse.Cloud.define("addAdminToOrganization", function(request, response){
    //TESTED

    //Pre: organizationObjectId, selectedUserToBeAdminObjectId
    //Post: true if successfully added as admin, false if failed.
    //Purpose: to add new admins to an organization

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {
            var organization = new Organization();
            organization.id = request.params.organizationObjectId;
            var user = new Parse.User();
            user.id = request.params.selectedUserToBeAdminObjectId;
            var followerQuery = new Parse.Query(FOLLOWERS);
            followerQuery.equalTo('organization', organization);
            followerQuery.equalTo('user', user);
            followerQuery.first({
                success: function(result) {
                    if (result == null) {
                        var follower = new Followers();
                        follower.save({
                            organization: organization,
                            user: user,
                            userType: USER_TYPE_ADMIN,
                            status: STATUS_APPROVED,
                            approvalUser: request.user,
                            approvalDate: new Date()
                        }, {
                            success: function(object) {
                                response.success(true);
                            },
                            error: function(object, error) {
                                response.error(error);
                            }
                        });
                    } else {
                        result.save({
                            userType: USER_TYPE_ADMIN
                        }, {
                            success: function(object) {
                                response.success(true);
                            },
                            error: function(object, error) {
                                response.error(error);
                            }
                        });
                    }
                },
                error: function(error) {
                    response.error(error);
                }
            });
        });
    });

});

Parse.Cloud.define("removeAdminFromOrganization", function(request, response){
    //TESTED

    //Pre: Organization, selectedAdminToRemoveObjectId
    //Post: true if successfully removed, false is failed.
    //Purpose: to remove admins from an organization

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {
            var organization = new Organization();
            organization.id = request.params.organizationObjectId;
            var user = new Parse.User();
            user.id = request.params.selectedAdminToRemoveObjectId;
            var followerQuery = new Parse.Query(FOLLOWERS);
            followerQuery.equalTo('organization', organization);
            followerQuery.equalTo('user', user);
            followerQuery.first({
                success: function(result) {
                    if (result == null) {
                        response.success(true);
                    } else {
                        result.save({
                            userType: USER_TYPE_FOLLOWER
                        }, {
                            success: function(object) {
                                response.success(true);
                            },
                            error: function(object, error) {
                                response.error(error);
                            }
                        });
                    }
                },
                error: function(error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("createNewChildOrganization", function(request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, levelConfigObjectId(childLevelConfig.ObjectId of the organization that is calling the function), configObjectId, organizationName, organizationHandle, organizationType, adminObjectId, approvalRequired, accessCode, profilePhoto, coverPhoto, description
    //Post: true if successfully created an organization, false is failed.
    //Purpose: to create a new organization which is a child to another organization that the user is an admin of

    var parent = new Organization();
    parent.id = request.params.organizationObjectId;

    var levelConfig = new LevelConfig();
    levelConfig.id = request.params.levelConfigObjectId;

    var config = new Config();
    config.id = request.params.configObjectId;

    var admin = new Parse.User();
    admin.id = request.params.adminObjectId;

    var query = new Parse.Query(LEVEL_CONFIG);
    query.equalTo('parent',levelConfig);
    query.first({
        success: function(result) {
            if(result == null) {
                response.error('A child organization cannot be created for this organization!');
            } else {
                var name = request.params.organizationName;
                var handle = request.params.organizationHandle;
                var type = request.params.organizationType;
                var approvalRequired = request.params.approvalRequired;
                var description = request.params.description;
                var accessCode = request.params.accessCode;
                var hasAccessCode = false;
                if (accessCode) {
                    hasAccessCode = true;
                }

                var coverPhoto = request.params.coverPhoto;
                var coverPhotoFile = null;
                if (coverPhoto) {
                    coverPhotoFile = new Parse.File('cover', coverPhoto, 'image/png');
                }

                var profilePhoto = request.params.profilePhoto;
                var profilePhotoFile = null;
                if (profilePhoto) {
                    profilePhotoFile = new Parse.File('profile', profilePhoto, 'image/png');
                }

                var organization = new Organization();
                organization.save({
                    name: name,
                    isTopLevel: false,
                    handle: handle,
                    createUser: request.user,
                    childCount: 0,
                    childLevelConfig: result,
                    levelConfig: levelConfig,
                    config: config,
                    organizationType: type,
                    parent: parent,
                    parentApprovalRequired: approvalRequired,
                    postCount: 0,
                    followerCount: 0,
                    hasAccessCode: hasAccessCode,
                    accessCode: accessCode,
                    image: profilePhotoFile,
                    coverPhoto: coverPhotoFile,
                    organizationDescription: description

                }, {
                    success: function(object) {
                        var follower = new Followers();
                        follower.save({
                            user: admin,
                            organization: object,
                            userType: USER_TYPE_ADMIN,
                            status: STATUS_APPROVED,
                            followDate: new Date()
                        }, {
                            success: function(object) {
                                response.success(true);
                            },
                            error: function(object, error) {
                                response.error("Failed to add admin");
                            }
                        });
                    },
                    error: function(object, error) {
                        response.error("Failed to add child organization");
                    }
                });
            }
        },
        error: function(error) {
            response.error('A child organization cannot be created for this organization!');
        }
    });
});

Parse.Cloud.define("updateOrganizationFields", function(request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, organizationName, organizationDescription, organizationType, adminArray
    //Post: true if successfully modified organization's attributes, false if failed
    //Purpose: to update an organization's information

});

//Parse.Cloud.define("changeOrganizationType", function(request, response) {
//    //NOT TESTED
//
//    //Pre: organizationObjectId, oldType, newType
//    //Post: true if successfully changed, false if failed
//    //Purpose: to change organizationType to public from private or vice versa
//});

Parse.Cloud.define("privateOrganizationAccessCodeEntered", function(request, response) {
    //TESTED

    //Pre: organizationObjectId, enteredAccessCode
    //Post: true if user inputs correct access code; false if incorrect code
    //Purpose: to determine whether user has entered the correct access code to join a private organization - sends follow request

    var query = new Parse.Query(ORGANIZATION);
    query.equalTo('objectId', request.params.organizationObjectId);
    query.first({
        success: function(result) {
            if(result == null) {
                response.success(false);
            } else {
                var organization = result;
                var enteredAccessCode = request.params.enteredAccessCode;
                if (organization.get('accessCode') == enteredAccessCode) {
                    var query = new Parse.Query(FOLLOWERS);
                    query.equalTo('user', request.user);
                    query.equalTo('organization', result);
                    query.first({
                        success: function(result) {
                            if(result == null) {
                                var followers = new Followers();
                                followers.save({
                                    organization: organization,
                                    user: request.user,
                                    userType: USER_TYPE_NOT_FOLLOWER,
                                    status: STATUS_PENDING,
                                    followDate: new Date()
                                }, {
                                    success: function(result) {
                                        response.success(true);
                                    },
                                    error: function(post, error) {
                                        response.error(error);
                                    }
                                });
                            } else {
                                result.save({
                                    userType: USER_TYPE_NOT_FOLLOWER,
                                    status: STATUS_PENDING,
                                    followDate: new Date()
                                }, {
                                    success: function(result) {
                                        response.success(true);
                                    },
                                    error: function(post, error) {
                                        response.error(error);
                                    }
                                });
                            }
                        },
                        error: function(error) {
                            response.error(error);
                        }
                    });
                } else {
                    response.success(false);
                }
            }
        },
        error: function(error) {
            response.error(error);
        }
    });

});

Parse.Cloud.define("getRequestedPendingPrivateOrganizationUsers", function(request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfUsers [only load max 10-15 at once]
    //Post: Array of requested users
    //Purpose: display requested users as a 'pending' list for private organization admins (can accept or reject)
    //updateFollowStateForUser if admin accepts request

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {

            var query = new Parse.Query(Followers);
            query.equalTo('status', STATUS_PENDING);
            query.find({
                success: function(results) {
                    response.success(results);
                },
                error: function(error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("deletePost", function(request, response) {
    //TESTED

    //Pre: organizationObjectId, postObjectId
    //Post: true if successfully deleted post, false if failed
    //Purpose: to delete a post

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {

            var post = new Post();
            post.id = request.params.postObjectId;

            post.save({
                isDeleted: true
            }, {
                success: function(post) {
                    response.success(true);
                },
                error: function(post, error) {
                    response.error(error);
                }
            });

        });
    });
});

Parse.Cloud.define("searchForUsersInRange", function(request, response) {
    //TESTED

    //Pre: searchString,
    //Post: true if successfully deleted post, false if failed
    //Purpose: to delete a post

    checkIfUserIsLoggedIn(request, response, function(request, response) {



    });
});

Parse.Cloud.define("deleteComment", function(request, response) {
    //TESTED

    //Pre: organizationObjectId, commentObjectId
    //Post: true if successfully deleted comment, false if failed
    //Purpose: to delete a comment

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        var objectId = request.params.commentObjectId;
        var query = new Parse.Query(COMMENTS);
        query.equalTo('createUser', request.user);
        query.equalTo('objectId', objectId);
        query.first({
            success: function(result) {
                if(result == null) {
                    response.error('You are not allowed to delete that comment!');
                } else {
                    result.save({
                        isDeleted: true
                    }, {
                        success: function(comment) {
                            response.success(true);
                        },
                        error: function(comment, error) {
                            response.error(error);
                        }
                    });
                }
            },
            error: function(error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("actOnFollowRequest", function(request, response) {
    //TESTED

    //Pre: organizationObjectId, followObjectId, approvalState (Boolean)
    //Post: true if successfully changed user state, false if failed
    //Purpose: to change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function(request, response) {
        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;

            var query = new Parse.Query(FOLLOWERS);
            query.get(request.params.followObjectId, {
                success: function(result) {
                    if(result == null) {
                        response.error('The requested follow request does not exist!');
                    } else {
                        var state = request.params.approvalState;
                        var approvalState;
                        var userType;

                        if (state) {
                            approvalState = STATUS_APPROVED;
                            userType = USER_TYPE_FOLLOWER;
                        } else {
                            approvalState = STATUS_REJECTED;
                            userType = USER_TYPE_NOT_FOLLOWER;
                        }
                        result.save({
                            userType: userType,
                            status: approvalState,
                            approvalDate: new Date(),
                            approvalUser: request.user
                        }, {
                            success: function(result) {
                                response.success(true);
                            },
                            error: function(comment, error) {
                                response.error(error);
                            }
                        });
                    }
                },
                error: function(error) {
                    response.error(error);
                }
            });
        });

    });
});

Parse.Cloud.define("actOnApprovalRequest", function(request, response) {
    //NOT TESTED

    //Pre: postObjectId, organizationObjectId, approvalState (Boolean), rejectionReason, priority
    //Post: true if successfully changed approval state, false if failed
    //Purpose: to change the state of an announcement

    checkIfUserIsLoggedIn(request, response, function(request, response) {
        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;

            var post = new Post();
            post.id = request.params.postObjectId;

            var status = request.params.approvalState ? STATUS_APPROVED : STATUS_REJECTED;
            var priority = request.params.priority;
            var rejectionReason = request.params.rejectionReason ? request.params.rejectionReason : null;

            post.save({
                status: status,
                moderationDate: new Date(),
                moderator: request.user,
                rejectionReason: rejectionReason,
                priority: priority
            }, {
                success: function(post) {
                    response.success(true);
                },
                error: function(post, error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("getAllPostsForOrganization", function(request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfPosts
    //Post: true if successfully changed user state, false if failed
    //Purpose: to delete change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function(request, response) {
        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;

            var startIndex = request.params.startIndex;
            var numberOfPosts = request.params.numberOfPosts;

            var organizationQuery = new Parse.Query(ORGANIZATION);
            organizationQuery.equalTo('parent', organization);
            organizationQuery.equalTo('parentApprovalRequired', true);

            var postQuery = new Parse.Query(POST);
            postQuery.matchesQuery('organization', organizationQuery);
            postQuery.equalTo('status', STATUS_PENDING);
            postQuery.skip(startIndex);
            postQuery.limit(numberOfPosts);
            postQuery.find({
                success: function(results) {
                    response.success(results);
                },
                error: function(error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("getPostsToBeApprovedInRange", function(request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfPosts
    //Post: true if successfully changed user state, false if failed
    //Purpose: to delete change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function(request, response) {
        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;

            var startIndex = request.params.startIndex;
            var numberOfPosts = request.params.numberOfPosts;

            var organizationQuery = new Parse.Query(ORGANIZATION);
            organizationQuery.equalTo('parent', organization);
            organizationQuery.equalTo('parentApprovalRequired', true);

            var postQuery = new Parse.Query(POST);
            postQuery.matchesQuery('organization', organizationQuery);
            postQuery.equalTo('status', STATUS_PENDING);
            postQuery.skip(startIndex);
            postQuery.limit(numberOfPosts);
            postQuery.find({
                success: function(results) {
                    response.success(results);
                },
                error: function(error) {
                    response.error(error);
                }
            });
        });
    });
});

Parse.Cloud.define("uploadPostForOrganization", function(request, response) {
    //TESTED

    //Pre: organizationObjectId, title, body, photo, startDate, endDate, priority, notifyFollowers
    //Post: true if successfully uploaded post, false if failed
    //Purpose: to delete a comment

    checkIfUserIsLoggedIn(request, response, function(request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function(request, response) {

            var organizationObjectId = request.params.organizationObjectId;
            var query = new Parse.Query(ORGANIZATION);
            query.equalTo('objectId', organizationObjectId);
            query.first({
                success: function(result) {
                    var organization = result;
                    var photoFile = null;
                    if (request.params.photo != null) {
                        photoFile = new Parse.File(organizationObjectId+'_photo', request.params.photo, 'image/png');
                    }
                    var title = request.params.title;
                    var body = request.params.body;
                    var startDate = request.params.startDate;
                    var endDate = request.params.endDate;
                    var priority = request.params.priority;
                    var notifyFollowers = request.params.notifyFollowers;
                    var approvalRequired = organization.get('parentApprovalRequired');
                    var status = STATUS_PENDING;
                    if (!approvalRequired) {
                        status = STATUS_APPROVED;
                    }
                    if (title.length >= 30) {
                        response.error('The title of the post cannot be more than 30 characters long!');
                    } else {
                        var post = new Post();
                        post.save({
                            organization: organization,
                            title: title,
                            body: body,
                            image: photoFile,
                            priority: priority,
                            commentsCount: 0,
                            viewsCount: 0,
                            status: status,
                            createUser: request.user,
                            approvalRequired: approvalRequired,
                            notifyFollowers: notifyFollowers,
                            postStartDate: startDate,
                            postEndDate: endDate,
                            isDeleted: false
                        }, {
                            success: function(post) {
                                response.success(true);
                            },
                            error: function(post, error) {
                                response.error(error);
                            }
                        });
                    }
                },
                error: function(error) {
                    response.error(error);
                }
            });
        });
    });
});

var incrementCommentsCount = function(postObjectId, increment) {
    query = new Parse.Query(POST);
    query.get(postObjectId, {
        success: function (post) {
            post.increment("commentsCount");
            post.save();
        },
        error: function (error) {
        }
    });
};

Parse.Cloud.afterSave("Comments", function(request) {
    if (!request.object.existed()) {
        incrementCommentsCount(request.object.id, 1);
    }
});