var constants = require('cloud/constants');
var _ = require("underscore");
var moment = require('moment');

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

const TYPE_NOT_FOLLOWER = 'NFO';
const TYPE_ADMIN = 'ADM';
const TYPE_FOLLOWER = 'FOL';
const TYPE_PENDING = 'PEN';
const TYPE_REJECTED = 'REJ';

const ORGANIZATION_PUBLIC = 'PUB';
const ORGANIZATION_PRIVATE = 'PRI';

var checkIfUserIsLoggedIn = function (request, response, code) {
    if (!request.user) {
        response.error('Please sign in again.');
    } else {
        code(request, response);
    }
};

var checkIfUserCanViewPost = function (request, response, code) {
    var query = new Parse.Query(POST);
    query.include('organization');
    query.get(request.params.postObjectId, {
        success: function (result) {
            if (result) {
                var post = result;
                var followerQuery = new Parse.Query(FOLLOWERS);
                followerQuery.equalTo('user', request.user);
                followerQuery.equalTo('organization', result.get('organization'));
                followerQuery.notEqualTo('type', TYPE_NOT_FOLLOWER);
                followerQuery.first({
                    success: function (result) {
                        if (result == null) {
                            response.error('You do not have rights to view this post!');
                        } else {
                            //if (!moment(new Date()).isBefore(post.get('startDate'))) {
                            code(request, response);
                            //} else {
                            //    response.error('You are do not have rights to view this post!');
                            //}
                        }
                    },
                    error: function (error) {
                        response.error(error);
                    }
                });
            } else {
                response.error(error);
            }
        },
        error: function (error) {
            response.error(error);
        }
    });
};

var checkIfUserIsAdminOfOrganization = function (request, response, code) {
    var organization = new Organization();
    organization.id = request.params.organizationObjectId;

    var query = new Parse.Query(FOLLOWERS);
    query.equalTo('organization', organization);
    query.equalTo('type', TYPE_ADMIN);
    query.equalTo('user', request.user);
    query.first({
        success: function (result) {
            if (result == null) {
                response.error('You are do not have admin rights for this organization!');
            } else { //Admin validation
                code(request, response);
            }
        },
        error: function (error) {
            response.error(error);
        }
    });
};

//Deprecated, switch to new functions below
Parse.Cloud.define("isFieldValueInUse", function (request, response) {
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
        success: function (results) {

            if (results.length < 1) { //Field value is not in use
                response.success(false);
            } else { //Field value is in use
                response.success(true)
            }
        },
        error: function (error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("isUsernameInUse", function (request, response) {
    //TESTED

    //Pre: username
    //Post: true if in use, false if not in use
    //Purpose: Returns if field value is currently in use (ex. username already being used)

    //Parameters
    var username = request.params.username;

    //Setup query
    var query = new Parse.Query(Parse.User);
    query.equalTo("username", username);
    query.find({
        success: function (results) {
            if (results.length > 0) {
                response.success(true);
            } else {
                response.success(false);
            }
        },
        error: function (error) {
            response.error(error.code);
        }
    });
});

Parse.Cloud.define("isEmailInUse", function (request, response) {
    //TESTED

    //Pre: email
    //Post: true if in use, false if not in use
    //Purpose: Returns if field value is currently in use (ex. username already being used)

    //Parameters
    var email = request.params.email;

    //Setup query
    var query = new Parse.Query(Parse.User);
    query.equalTo("email", email);
    query.find({
        success: function (results) {
            if (results.length > 0) {
                response.success(true);
            } else {
                response.success(false);
            }
        },
        error: function (error) {
            response.error(error.code);
        }
    });
});

Parse.Cloud.define("getAllChildOrganizations", function (request, response) {

    //TESTED

    //Pre: parentOrganizationObjectId
    //Post: array of childOrganizations
    //Purpose: get all child organizations (ex. get schools for a school board)

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var parentOrganization = new Organization();
        parentOrganization.id = request.params.parentOrganizationObjectId;
        var query = new Parse.Query(ORGANIZATION);
        query.equalTo('parent', parentOrganization);
        query.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error);
            }
        });

    });

});

Parse.Cloud.define("isFollowingOrganization", function (request, response) {

    //TESTED

    //Pre: organizationObjectId
    //Post: returns the status of the follow
    //Purpose: to find out if a user is following an organization

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var organization = new Organization();
        organization.id = request.params.organizationObjectId;

        var user = request.user;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('user', user);
        query.equalTo('organization', organization);
        query.first({
            success: function (result) {
                if (result == null) {
                    response.success(TYPE_NOT_FOLLOWER);
                } else {
                    response.success(result.get('type'));
                }
            },
            error: function (error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getAllTopLevelOrganizations", function (request, response) {

    //TESTED

    //Pre:
    //Post: array of all topLevelOrganizations
    //Purpose: get all top level organizations

    var query = new Parse.Query(ORGANIZATION);
    query.doesNotExist('parent');
    query.find({
        success: function (results) {
            response.success(results);
        },
        error: function (error) {
            response.error(error);
        }
    });

});

Parse.Cloud.define("getRangeOfPostsForDay", function (request, response) {

    //TESTED

    //Pre: startIndex, numberOfPosts, date
    //Post: array of posts for user
    //Purpose: get posts for a certain range & day (used in today view) (ex. get posts 0-9 for today)

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var date = request.params.date;
        var startIndex = request.params.startIndex;
        var numberOfPosts = request.params.numberOfPosts;

        var followersQuery = new Parse.Query(FOLLOWERS);
        followersQuery.equalTo('user', request.user);
        followersQuery.notContainedIn('type', [TYPE_NOT_FOLLOWER, TYPE_PENDING, TYPE_REJECTED]);

        var organizationQuery = new Parse.Query(ORGANIZATION);
        organizationQuery.matchesKeyInQuery('parent', 'organization', followersQuery);

        var notifyParentsQuery = new Parse.Query(POST);
        notifyParentsQuery.equalTo('notifyParent', true);
        notifyParentsQuery.matchesQuery('organization', organizationQuery);

        var postQuery = new Parse.Query(POST);
        postQuery.matchesKeyInQuery('organization', 'organization', followersQuery);

        var query = Parse.Query.or(notifyParentsQuery, postQuery);
        query.greaterThanOrEqualTo('postEndDate', date);
        query.lessThanOrEqualTo('postStartDate', date);
        query.equalTo('status', STATUS_APPROVED);
        query.equalTo('isDeleted', false);
        query.include('organization');
        query.descending('priority');
        query.descending('postStartDate');
        query.skip(startIndex);
        query.limit(numberOfPosts);
        query.find({
            success: function (results) {
                response.success(results);
            }, error: function (error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getRangeOfCommentsForPost", function (request, response) {
    //TESTED

    //Pre: startIndex, numberOfComments, postObjectId
    //Post: return array of comments for a post
    //Purpose: get comments for a certain range & post (loads latest first (see facebook commenting system)) (used in postDetail view) (ex. get comments 0-9 for an post)

    Parse.Cloud.useMasterKey();

    checkIfUserIsLoggedIn(request, response, function (request, response) {


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
        query.descending('createdAt');
        query.find({
            success: function (results) {
                response.success(results);
            }, error: function (error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("postCommentAsUserOnPost", function (request, response) {
    //TESTED

    //Pre: commentText, postObjectId
    //Post: true if comment was posted, false if post failed
    //Purpose: user posts comment on post (used in postDetail view)

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var postObjectId = request.params.postObjectId;
        var commentText = request.params.commentText;
        var user = request.user;

        var postQuery = new Parse.Query(POST);
        postQuery.get(postObjectId, {
            success: function (post) {
                var comment = new Comments();

                comment.save({
                    createUser: user,
                    comment: commentText,
                    post: post
                }, {
                    success: function (responseComment) {
                        console.log(responseComment);
                        response.success(responseComment);
                    },
                    error: function (comment, error) {
                        response.error(error);
                    }
                });
            },
            error: function (comment, error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getOrganizationsForDiscoverTabInRange", function (request, response) {
    //TESTED

    //Pre: userObjectId, startIndex, numberOfOrganizations
    //Post: array of children (latest first)
    //Purpose: to show array of posts (latest first) for use in clubProfileView

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var startIndex = request.params.startIndex;
        var numberOfOrganizations = request.params.numberOfOrganizations;

        var user = new Parse.User();
        user.id = request.params.userObjectId;
        var query = new Parse.Query(ORGANIZATION);
        query.skip(startIndex);
        query.limit(numberOfOrganizations);
        query.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error);
            }
        });
    });
});

Parse.Cloud.define("getOrganizationsFollowedByUserInRange", function (request, response) {
    //TESTED

    //Pre: userObjectId, startIndex, numberOfOrganizations
    //Post: array of clubs that the user follows
    //Purpose: to display user's followed club list (used in userProfile view)

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var user = new Parse.User();
        user.id = request.params.userObjectId;

        var startIndex = request.params.startIndex;
        var numberOfOrganizations = request.params.numberOfOrganizations;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('user', user);
        query.notContainedIn('type', [TYPE_PENDING, TYPE_REJECTED, TYPE_NOT_FOLLOWER]);
        query.include('organization');
        query.skip(startIndex);
        query.limit(numberOfOrganizations);
        query.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });
    });
});

Parse.Cloud.define("updateUserProfilePhoto", function (request, response) {
    //TESTED

    //Pre: userObjectId, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the profile photo of the user

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var userObjectId = request.params.userObjectId;
        if (userObjectId == request.user.id) {
            var photo = request.params.photo;
            var photoFile = new Parse.File(userObjectId, photo, 'image/png');
            request.user.save({
                'profilePhoto': photoFile
            }, {
                success: function (user) {
                    response.success(user);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        } else {
            response.error('Another user cannot be edited!');
        }
    });
});

Parse.Cloud.define("updateOrganizationProfilePhoto", function (request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the profile photo of the user

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {
            var organizationObjectId = request.params.organizationObjectId;
            var photo = request.params.photo;
            var photoFile = new Parse.File(organizationObjectId, photo, 'image/png');
            var organization = new Organization();
            organization.id = organizationObjectId;
            organization.save({
                'image': photoFile
            }, {
                success: function (organization) {
                    response.success(true);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.define("updateOrganizationCoverPhoto", function (request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the profile photo of the user

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {
            var organizationObjectId = request.params.organizationObjectId;
            var photo = request.params.photo;
            var photoFile = new Parse.File(organizationObjectId + '_cover', photo, 'image/png');
            var organization = new Organization();
            organization.id = organizationObjectId;
            organization.save({
                'coverPhoto': photoFile
            }, {
                success: function (organization) {
                    response.success(organization);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.define("updateUserCoverPhoto", function (request, response) {
    //TESTED

    //Pre: userObjectId, photo
    //Post: true if photo was successfully saved, false if failed
    //Purpose: update the cover photo of the user

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var userObjectId = request.params.userObjectId;
        if (userObjectId == request.user.id) {
            var photo = request.params.photo;
            var photoFile = new Parse.File(userObjectId + '_cover', photo, 'image/png');
            request.user.save({
                'coverPhoto': photoFile
            }, {
                success: function (user) {
                    response.success(user);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        } else {
            response.error('Another user cannot be edited!');
        }
    });
});

Parse.Cloud.define("updateUserDescription", function (request, response) {
    //TESTED

    //Pre: userObjectId, description
    //Post: true if description was successfully saved, false if failed
    //Purpose: update the description of the user

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var userObjectId = request.params.userObjectId;
        if (userObjectId == request.user.id) {
            var description = request.params.description;
            request.user.save({
                'userDescription': description
            }, {
                success: function (user) {
                    response.success(user);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        } else {
            response.error('Another user cannot be edited!');
        }
    });

});

Parse.Cloud.define("getPostsOfOrganizationInRange", function (request, response) {
    //TESTED

    //Pre: OrganizationObjectId, startIndex, numberOfPosts
    //Post: array of posts (latest first)
    //Purpose: to show array of posts (latest first) for use in clubProfileView

    checkIfUserIsLoggedIn(request, response, function (request, response) {

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
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });
    });
});

Parse.Cloud.define("getChildOrganizationsInRange", function (request, response) {
    //TESTED

    //Pre: parentOrganizationObjectId, startIndex, numberOfOrganizations
    //Post: array of children (latest first)
    //Purpose: to show array of posts (latest first) for use in clubProfileView

    checkIfUserIsLoggedIn(request, response, function (request, response) {
        var parentOrganization = new Organization();
        parentOrganization.id = request.params.parentOrganizationObjectId;
        var startIndex = request.params.startIndex;
        var numberOfOrganizations = request.params.numberOfOrganizations;

        var query = new Parse.Query(ORGANIZATION);
        query.equalTo('parent', parentOrganization);
        query.skip(startIndex);
        query.limit(numberOfOrganizations);
        query.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });
    });
});

Parse.Cloud.define("checkIfUserIsAdminOfOrganization", function (request, response) {
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
        success: function (result) {
            if (result == null) {
                response.success(false);
            } else {
                if (result.get('type') == TYPE_ADMIN) {
                    response.success(true);
                } else {
                    response.success(false);
                }
            }
        },
        error: function (error) {
            response.error(error.code);
        }
    });
});

Parse.Cloud.define("updateFollowStateForUser", function (request, response) {
    //TESTED

    //Pre: isFollowing, organizationObjectId
    //Post: true if it was successful, false if not successful; isFollowing
    //Purpose: allow user to follow / unfollow organizations
    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var isFollowing = request.params.isFollowing;
        if (isFollowing) {
            var organizationQuery = new Parse.Query(ORGANIZATION);
            organizationQuery.get(request.params.organizationObjectId, {
                success: function (result) {
                    var organization = result;
                    var organizationType = result.get('organizationType');
                    if (organizationType == ORGANIZATION_PRIVATE) {
                        if (result.get('hasAccessCode') == true) {
                            response.error('Access code must be entered for this organization before sending a follow request!');
                        } else {
                            var followerQuery = new Parse.Query(FOLLOWERS);
                            followerQuery.equalTo('user', request.user);
                            followerQuery.equalTo('organization', result);
                            followerQuery.first({
                                success: function (result) {
                                    if (result == null) {
                                        var follow = new Followers();
                                        follow.save({
                                            type: TYPE_PENDING,
                                            followDate: new Date(),
                                            user: request.user,
                                            organization: organization
                                        }, {
                                            success: function (object) {
                                                response.success(TYPE_PENDING);
                                            },
                                            error: function (error) {
                                                response.error(error.code);
                                            }
                                        });
                                    } else {
                                        result.save({
                                            type: TYPE_PENDING,
                                            followDate: new Date()
                                        }, {
                                            success: function (object) {
                                                response.success(TYPE_PENDING);
                                            },
                                            error: function (error) {
                                                response.error(error.code);
                                            }
                                        });
                                    }
                                },
                                error: function (error) {
                                    response.error(error.code);
                                }
                            });
                        }
                    } else if (organizationType == ORGANIZATION_PUBLIC) {

                        var followerQuery = new Parse.Query(FOLLOWERS);
                        followerQuery.equalTo('user', request.user);
                        followerQuery.equalTo('organization', result);
                        followerQuery.first({
                            success: function (result) {
                                if (result == null) {
                                    var follow = new Followers();
                                    follow.save({
                                        type: TYPE_FOLLOWER,
                                        followDate: new Date(),
                                        user: request.user,
                                        organization: organization
                                    }, {
                                        success: function (object) {
                                            response.success(TYPE_FOLLOWER);
                                        },
                                        error: function (error) {
                                            response.error(error.code);
                                        }
                                    });
                                } else {
                                    result.save({
                                        type: TYPE_FOLLOWER,
                                        followDate: new Date()
                                    }, {
                                        success: function (object) {
                                            response.success(TYPE_FOLLOWER);
                                        },
                                        error: function (error) {
                                            response.error(error.code);
                                        }
                                    });
                                }
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    } else {
                        response.error();
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        } else {
            var organization = new Organization();
            organization.id = request.params.organizationObjectId;

            var followerQuery = new Parse.Query(FOLLOWERS);
            followerQuery.equalTo('user', request.user);
            followerQuery.equalTo('organization', organization);
            followerQuery.first({
                success: function (result) {
                    if (result == null) {
                        response.success(TYPE_NOT_FOLLOWER);
                    } else {
                        result.save({
                            type: TYPE_NOT_FOLLOWER,
                            followDate: new Date()
                        }, {
                            success: function (object) {
                                response.success(TYPE_NOT_FOLLOWER);
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        }
    });
});

Parse.Cloud.define("getFollowersFollowRequestsAndAdminsForOrganizationInRange", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfUsers, isAdmin
    //Post: array of followers
    //Purpose: get followers in a certain range for an organization

    checkIfUserIsLoggedIn(request, response, function (request, response) {
        var organization = new Organization();
        organization.id = request.params.organizationObjectId;
        var numberOfUsers = request.params.numberOfUsers;
        var startIndex = request.params.startIndex;
        var isAdmin = request.params.isAdmin;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('organization', organization);
        if (isAdmin) {
            query.notContainedIn('type', [TYPE_NOT_FOLLOWER, TYPE_REJECTED]);
        } else {
            query.notContainedIn('type', [TYPE_NOT_FOLLOWER, TYPE_PENDING, TYPE_REJECTED]);
        }
        query.descending('type');
        query.limit(numberOfUsers);
        query.skip(startIndex);
        query.find({
            success: function (results) {
                if (results != null) {
                    var pending = [];
                    var admins = [];
                    var members = [];
                    for (var i = 0; i < results.length; i++) {
                        if (results[i].get('type') == TYPE_PENDING) {
                            pending.push(results[i]);
                        } else if (results[i].get('type') == TYPE_ADMIN) {
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
                response.error(error.code);
            }
        });
    });

});

Parse.Cloud.define("getAdminsForOrganizationInRange", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfUsers
    //Post: array of admins
    //Purpose: get admins in a certain range for an organization

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var organization = new Organization();
        organization.id = request.params.organizationObjectId;
        var numberOfUsers = request.params.numberOfUsers;
        var startIndex = request.params.startIndex;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('organization', organization);
        query.equalTo('type', TYPE_ADMIN);
        query.descending('updatedAt');
        query.include('user');
        query.limit(numberOfUsers);
        query.skip(startIndex);
        query.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });

    });
});

Parse.Cloud.define("getFollowersForOrganizationInRange", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfUsers
    //Post: array of admins
    //Purpose: get admins in a certain range for an organization

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var organization = new Organization();
        organization.id = request.params.organizationObjectId;
        var numberOfUsers = request.params.numberOfUsers;
        var startIndex = request.params.startIndex;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('organization', organization);
        query.equalTo('type', TYPE_FOLLOWER);
        query.descending('updatedAt');
        query.include('user');
        query.limit(numberOfUsers);
        query.skip(startIndex);
        query.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });

    });
});

Parse.Cloud.define("getOrganizationsThatUserIsAdminOf", function (request, response) {
    //TESTED

    //Pre: userObjectId
    //Post: array of organization
    //Purpose: get admins in a certain range for an organization

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var user = new Parse.User();
        user.id = request.params.userObjectId;

        var query = new Parse.Query(FOLLOWERS);
        query.equalTo('user', request.user);
        query.equalTo('type', TYPE_ADMIN);
        query.include('organization.childLevelConfig');
        query.include('organization.parentLevelConfig');
        query.include('organization.levelConfig');
        query.include('organization.config');
        query.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });

    });
});

Parse.Cloud.define("addAdminToOrganization", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, selectedUserToBeAdminObjectId
    //Post: true if successfully added as admin, false if failed.
    //Purpose: to add new admins to an organization

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {
            var organization = new Organization();
            organization.id = request.params.organizationObjectId;
            var user = new Parse.User();
            user.id = request.params.selectedUserToBeAdminObjectId;
            var followerQuery = new Parse.Query(FOLLOWERS);
            followerQuery.equalTo('organization', organization);
            followerQuery.equalTo('user', user);
            followerQuery.first({
                success: function (result) {
                    if (result == null) {
                        var follower = new Followers();
                        follower.save({
                            organization: organization,
                            user: user,
                            type: TYPE_ADMIN,
                            approvalUser: request.user,
                            approvalDate: new Date()
                        }, {
                            success: function (object) {
                                response.success(true);
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    } else {
                        result.save({
                            type: TYPE_ADMIN,
                            approvalUser: request.user,
                            approvalDate: new Date()
                        }, {
                            success: function (object) {
                                response.success(true);
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });

});

Parse.Cloud.define("removeAdminFromOrganization", function (request, response) {
    //TESTED

    //Pre: Organization, selectedAdminToRemoveObjectId
    //Post: true if successfully removed, false is failed.
    //Purpose: to remove admins from an organization

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {
            var organization = new Organization();
            organization.id = request.params.organizationObjectId;
            var user = new Parse.User();
            user.id = request.params.selectedAdminToRemoveObjectId;
            var followerQuery = new Parse.Query(FOLLOWERS);
            followerQuery.equalTo('organization', organization);
            followerQuery.equalTo('user', user);
            followerQuery.first({
                success: function (result) {
                    if (result == null) {
                        response.success(true);
                    } else {
                        result.save({
                            type: TYPE_FOLLOWER
                        }, {
                            success: function (object) {
                                response.success(true);
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.define("removeFollowerFromOrganization", function (request, response) {
    //TESTED

    //Pre: Organization, selectedFollowerToRemoveObjectId
    //Post: true if successfully removed, false is failed.
    //Purpose: to remove followers from an organization

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {
            var organization = new Organization();
            organization.id = request.params.organizationObjectId;
            var user = new Parse.User();
            user.id = request.params.selectedFollowerToRemoveObjectId;
            var followerQuery = new Parse.Query(FOLLOWERS);
            followerQuery.equalTo('organization', organization);
            followerQuery.equalTo('user', user);
            followerQuery.first({
                success: function (result) {
                    if (result == null) {
                        response.success(true);
                    } else {
                        result.save({
                            type: TYPE_NOT_FOLLOWER
                        }, {
                            success: function (object) {
                                response.success(true);
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.define("createNewChildOrganization", function (request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, parentLevelConfigObjectId, levelConfigObjectId(childLevelConfig.ObjectId of the organization that is calling the function), configObjectId, organizationName, organizationHandle, organizationType, adminObjectId, approvalRequired, accessCode, profilePhoto, coverPhoto, description
    //Post: true if successfully created an organization, false is failed.
    //Purpose: to create a new organization which is a child to another organization that the user is an admin of

    var parent = new Organization();
    parent.id = request.params.organizationObjectId;

    var newOrgParentLevelConfig = new LevelConfig();
    newOrgParentLevelConfig.id = request.params.newOrgParentLevelConfigObjectId;

    var config = new Config();
    config.id = request.params.configObjectId;

    var admin = new Parse.User();
    admin.id = request.params.adminObjectId;

    var newOrgLevelConfig = new LevelConfig();
    newOrgLevelConfig.id = request.params.newOrgLevelConfigObjectId;

    var query = new Parse.Query(LEVEL_CONFIG);
    query.equalTo('parent', newOrgLevelConfig);
    query.first({
        success: function (result) {
            var childLevelConfig = result;
            var name = request.params.organizationName;
            var handle = request.params.organizationHandle;
            var type = request.params.organizationType;
            var approvalRequired = request.params.approvalRequired;
            var description = request.params.description;
            var accessCode = request.params.accessCode;
            var hasAccessCode = false;
            if (accessCode != null){
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
                childLevelConfig: childLevelConfig,
                parentLevelConfig: newOrgParentLevelConfig,
                levelConfig: newOrgLevelConfig,
                config: config,
                organizationType: type,
                parent: parent,
                parentApprovalRequired: approvalRequired,
                postCount: 0,
                followerCount: 1,
                hasAccessCode: hasAccessCode,
                accessCode: accessCode,
                image: profilePhotoFile,
                coverPhoto: coverPhotoFile,
                organizationDescription: description

            }, {
                success: function (object) {
                    var newOrgAdmin= new Followers();
                    newOrgAdmin.set("user", admin);
                    newOrgAdmin.set("organization", object);
                    newOrgAdmin.set("type", "ADM");
                    newOrgAdmin.set("followDate", new Date());

                    newOrgAdmin.save(null, {
                        success: function (follower) {
                            response.success(true);
                        },
                        error: function (error) {
                            response.error(error.code);
                        }
                    });
                },
                error: function (error) {
                    response.error(error.code);
                }
            });

        },
        error: function (error) {
            response.error(error.code);
        }
    });
});

Parse.Cloud.define("updateOrganizationName", function (request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, name
    //Post: true if successfully modified organization's attributes, false if failed
    //Purpose: to update an organization's information

    var organization = new Organization();
    organization.id = request.params.organizationObjectId;

    var name = request.params.name;

    organization.save({
        name: name
    }, {
        success: function (result) {
            response.success(true);
        },
        error: function (error) {
            response.error(error.code);
        }
    });
});

Parse.Cloud.define("updateOrganizationDescription", function (request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, description
    //Post: true if successfully modified organization's attributes, false if failed
    //Purpose: to update an organization's information

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;

            var description = request.params.description;

            organization.save({
                organizationDescription: description
            }, {
                success: function (result) {
                    response.success(true);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });

    });

});

Parse.Cloud.define("updateOrganizationAccessCode", function (request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, accessCode, description
    //Post: true if successfully modified organization's attributes, false if failed
    //Purpose: to update an organization's information

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;

            var accessCode = request.params.accessCode;
            var hasAccessCode = true;
            if (accessCode < 1000 || accessCode > 10001) {
                response.error('Invalid access code!');
            } else if (accessCode == null) {
                hasAccessCode = true;
            } else {
                organization.save({
                    accessCode: accessCode,
                    hasAccessCode: hasAccessCode,
                    description: description
                }, {
                    success: function (result) {
                        response.success(true);
                    },
                    error: function (error) {
                        response.error(error.code);
                    }
                });
            }
        });
    });

});

Parse.Cloud.define("updateOrganizationFields", function (request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, description, name, hasAccessCode, accessCode, organizationType
    //Post: updated organization
    //Purpose: to update an organization's information

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

            var query = new Parse.Query(ORGANIZATION);
            query.get(request.params.organizationObjectId, {
                success: function (organization) {
                    var description = request.params.description;
                    var name = request.params.name;
                    var accessCode = request.params.accessCode;
                    var hasAccessCode = request.params.hasAccessCode;
                    var organizationType = request.params.organizationType;

                    organization.set('accessCode', accessCode);
                    organization.set('hasAccessCode', hasAccessCode);
                    organization.set('organizationDescription', description);
                    organization.set('name', name);
                    organization.set('organizationType', organizationType);

                    var save = function() {
                        organization.save({
                            success: function (org) {
                                response.success(org);
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    };
                    if (organizationType == ORGANIZATION_PUBLIC) {
                        hasAccessCode = false;
                        accessCode = null;
                        save();
                    } else if (hasAccessCode == false) {
                        accessCode = null;
                        save();
                    } else if (accessCode < 1000 || accessCode > 9999) {
                        response.error('Invalid access code!');
                    } else {
                        save();
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });

    });

});

Parse.Cloud.define("changeOrganizationType", function (request, response) {
    //NOT TESTED

    //Pre: organizationObjectId, type, accessCode
    //Post: true if successfully changed, false if failed
    //Purpose: to change organizationType to public from private or vice versa

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

            var query = new Parse.Query(ORGANIZATION);
            query.get(request.params.organizationObjectId, {
                success: function (organization) {
                    var type = request.params.type;
                    if (organization.get('organizationType') == type) {
                        response.success(true);
                    } else {
                        if (type == ORGANIZATION_PUBLIC) {
                            organization.save({
                                organizationType: ORGANIZATION_PUBLIC,
                                hasAccessCode: false,
                                accessCode: null
                            }, {
                                success: function (result) {
                                    var followersQuery = new Parse.Query(FOLLOWERS);
                                    followersQuery.equalTo('organization', result);
                                    followersQuery.containedIn('type', [TYPE_PENDING, TYPE_REJECTED]);
                                    followersQuery.find({
                                        success: function (followers) {
                                            for (var i = 0; i < followers.length; i++) {
                                                followers[i].set('type', TYPE_FOLLOWER);
                                            }
                                            Parse.Object.saveAll(followers, {
                                                success: function (results) {
                                                    response.success(true);
                                                },
                                                error: function (error) {
                                                    response.error(error.code);
                                                }
                                            });
                                        },
                                        error: function (error) {
                                            response.error(error.code);
                                        }
                                    });
                                },
                                error: function (error) {
                                    response.error(error.code);
                                }
                            });
                        } else if (type == ORGANIZATION_PRIVATE) {
                            var accessCode = request.params.accessCode;
                            var hasAccessCode = null;
                            if (accessCode != null) {
                                hasAccessCode = true;
                            }
                            if (accessCode < 1000 || accessCode > 10001) {
                                response.error('Invalid access code!');
                            } else {
                                organization.save({
                                    organizationType: ORGANIZATION_PRIVATE,
                                    hasAccessCode: hasAccessCode,
                                    accessCode: accessCode
                                }, {
                                    success: function (result) {
                                        response.success(true);
                                    },
                                    error: function (error) {
                                        response.error(error.code);
                                    }
                                });
                            }
                        } else {
                            response.error('Please specify a valid type!');
                        }
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.define("privateOrganizationAccessCodeEntered", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, enteredAccessCode
    //Post: true if user inputs correct access code; false if incorrect code
    //Purpose: to determine whether user has entered the correct access code to join a private organization - sends follow request

    var query = new Parse.Query(ORGANIZATION);
    query.equalTo('objectId', request.params.organizationObjectId);
    query.first({
        success: function (result) {
            if (result == null) {
                response.success(false);
            } else {
                var organization = result;
                var enteredAccessCode = request.params.enteredAccessCode;
                if (organization.get('accessCode') == enteredAccessCode) {
                    var query = new Parse.Query(FOLLOWERS);
                    query.equalTo('user', request.user);
                    query.equalTo('organization', result);
                    query.first({
                        success: function (result) {
                            if (result == null) {
                                var followers = new Followers();
                                followers.set("organization", organization);
                                followers.set("user", request.user);
                                followers.set("type", TYPE_FOLLOWER);
                                followers.set("followDate", new Date());

                                followers.save(null, {
                                    success: function (result) {
                                        response.success(true);
                                    },
                                    error: function (error) {
                                        response.error(error.code);
                                    }
                                });
                            } else {
                                result.save({
                                    type: TYPE_FOLLOWER,
                                    followDate: new Date()
                                }, {
                                    success: function (result) {
                                        response.success(true);
                                    },
                                    error: function (error) {
                                        response.error(error.code);
                                    }
                                });
                            }
                        },
                        error: function (error) {
                            response.error(error.code);
                        }
                    });
                } else {
                    response.success(false);
                }
            }
        },
        error: function (error) {
            response.error(error.code);
        }
    });

});

Parse.Cloud.define("getRequestedPendingPrivateOrganizationUsers", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfUsers [only load max 10-15 at once]
    //Post: Array of requested users
    //Purpose: display requested users as a 'pending' list for private organization admins (can accept or reject)
    //updateFollowStateForUser if admin accepts request

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;
            var numberOfUsers = request.params.numberOfUsers;
            var startIndex = request.params.startIndex;

            var query = new Parse.Query(Followers);
            query.equalTo('organization', organization);
            query.equalTo('type', TYPE_PENDING);
            query.descending('updatedAt');
            query.limit(numberOfUsers);
            query.skip(startIndex);
            query.find({
                success: function (results) {
                    response.success(results);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.define("deletePost", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, postObjectId
    //Post: true if successfully deleted post, false if failed
    //Purpose: to delete a post

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

            var post = new Post();
            post.id = request.params.postObjectId;

            post.save({
                isDeleted: true
            }, {
                success: function (post) {
                    response.success(true);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });

        });
    });
});

Parse.Cloud.define("deleteComment", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, commentObjectId
    //Post: true if successfully deleted comment, false if failed
    //Purpose: to delete a comment

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var objectId = request.params.commentObjectId;
        var query = new Parse.Query(COMMENTS);
        query.equalTo('createUser', request.user);
        query.equalTo('objectId', objectId);
        query.first({
            success: function (result) {
                if (result == null) {
                    response.error('You are not allowed to delete that comment!');
                } else {
                    result.save({
                        isDeleted: true
                    }, {
                        success: function (comment) {
                            response.success(true);
                        },
                        error: function (error) {
                            response.error(error.code);
                        }
                    });
                }
            },
            error: function (error) {
                response.error(error.code);
            }
        });
    });
});

Parse.Cloud.define("actOnFollowRequest", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, followObjectId, approvalState (Boolean)
    //Post: true if successfully changed user state, false if failed
    //Purpose: to change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function (request, response) {
        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;

            var query = new Parse.Query(FOLLOWERS);
            query.get(request.params.followObjectId, {
                success: function (result) {
                    if (result == null) {
                        response.error('The requested follow request does not exist!');
                    } else {
                        var state = request.params.approvalState;
                        var type;

                        if (state == true) {
                            type = TYPE_FOLLOWER;
                        } else {
                            type = TYPE_REJECTED;
                        }
                        result.save({
                            type: type,
                            approvalDate: new Date(),
                            approvalUser: request.user
                        }, {
                            success: function (result) {
                                response.success(true);
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });

    });
});

Parse.Cloud.define("actOnApprovalRequest", function (request, response) {
    //NOT TESTED

    //Pre: postObjectId, organizationObjectId, approvalState (Boolean), rejectionReason, priority
    //Post: true if successfully changed approval state, false if failed
    //Purpose: to change the state of an announcement

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

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
                success: function (post) {
                    var query = new Parse.Query(POST);
                    query.include('organization');
                    query.get(request.params.postObjectId, {
                        success: function (post) {
                            var alert = "Your post \"" + post.get('title') + "\" was approved!";
                            if (status == STATUS_REJECTED) {
                                alert = "Your post \"" + post.get('title') + "\" was rejected :(";
                            }
                            notifyAdminsOfOrganization(post.get('organization').id, alert, function () {
                                response.success(true);
                            }, function (error) {
                                response.error(error.code);
                            });
                        },
                        error: function (error) {
                            response.error(error.code);
                        }
                    });
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.define("getPostsToBeApprovedInRange", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfPosts
    //Post: true if successfully changed user state, false if failed
    //Purpose: to delete change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function (request, response) {
        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

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
                success: function (results) {
                    response.success(results);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.define("uploadPostForOrganization", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, title, body, photo, startDate, endDate, priority, notifyFollowers, notifyParent
    //Post: true if successfully uploaded post, false if failed
    //Purpose: to delete a comment

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsAdminOfOrganization(request, response, function (request, response) {

            var organizationObjectId = request.params.organizationObjectId;
            var query = new Parse.Query(ORGANIZATION);
            query.equalTo('objectId', organizationObjectId);
            query.include('parent');
            query.first({
                success: function (result) {
                    var organization = result;
                    var photoFile = null;
                    if (request.params.photo != null) {
                        photoFile = new Parse.File(organizationObjectId + '_photo', request.params.photo, 'image/png');
                    }
                    var title = request.params.title;
                    var body = request.params.body;
                    var startDate = request.params.startDate;
                    var endDate = request.params.endDate;
                    var priority = request.params.priority;
                    var notifyFollowers = request.params.notifyFollowers;
                    var approvalRequired = organization.get('parentApprovalRequired');
                    var notifyParent = request.params.notifyParent;
                    if (notifyParent) {
                        approvalRequired = true
                    }
                    var status = STATUS_PENDING;
                    if (!approvalRequired) {
                        status = STATUS_APPROVED;
                    }
                    if (title.length > 30) {
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
                            notifyFollowers: true,
                            postStartDate: startDate,
                            postEndDate: endDate,
                            isDeleted: false,
                            notifyParent: notifyParent
                        }, {
                            success: function (post) {
                                var alert = "New announcement to approve: " + title;
                                if (result.get('parent') != null) {
                                    notifyAdminsOfOrganization(result.get('parent').id, alert, function () {
                                        response.success(true);
                                    }, function (error) {
                                        response.error(error.code);
                                    });
                                } else {
                                    response.success(true);
                                }
                            },
                            error: function (error) {
                                response.error(error.code);
                            }
                        });
                    }
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

Parse.Cloud.beforeSave(Parse.Installation, function (request, response) {
    if (request.user) {
        request.object.set('user', request.user);
        response.success();
    }
});

Parse.Cloud.beforeSave(Parse.User, function (request, response) {

    var keywords = [];
    var username = request.object.get('username').toLowerCase();
    var firstName = request.object.get('firstName').toLowerCase();
    var lastName = request.object.get('lastName').toLowerCase();
    keywords.push(username);
    keywords.push(firstName);
    keywords.push(lastName);

    request.object.set('keywords', keywords);
    response.success();
});


Parse.Cloud.beforeSave(POST, function (request, response) {
    var result = splitText(request.object.get('body') + ' ' + request.object.get('title'));

    request.object.set('words', result.words);
    request.object.set('hashtags', result.hashtags);

    response.success();
});

Parse.Cloud.beforeSave(ORGANIZATION, function (request, response) {

    var code = function () {
        if (request.object.get('hasAccessCode') == false) {
            request.object.set('accessCode', 0);
        }
        var result = splitText(request.object.get('handle') + ' ' + request.object.get('name'));
        request.object.set('keywords', result.words);
        response.success();
    };

    if (request.object.get('hasAccessCode')) {
        if (request.object.get('accessCode') < 1000 || request.object.get('accessCode') > 9999) {
            response.error('Invalid access code!');
        } else {
            code();
        }
    } else {
        code();
    }
});

//Parse.Cloud.beforeSave(ORGANIZATION, function (request, response) {
//
//    var object = request.object;
//
//    if (request.object.get('hasAccessCode') == false) {
//        request.object.set('accessCode', 0);
//    } else {
//        response.success();
//    }
//});

Parse.Cloud.beforeSave(FOLLOWERS, function (request, response) {

    if (!request.object.existed() && request.object.get('type') == null) {
        var organizationObjectId = request.object.get('organization').id;
        var searchQuery = new Parse.Query(ORGANIZATION);
        searchQuery.get(organizationObjectId, {
            success: function (organization) {
                if (organization.get('organizationType') == ORGANIZATION_PRIVATE) {
                    request.object.set('type', TYPE_PENDING);
                } else {
                    request.object.set('type', TYPE_FOLLOWER);
                }
                response.success();
            },
            error: function (error) {
                response.error(error.code);
            }
        });
    } else {
        response.success();
    }
});

Parse.Cloud.define("searchForUsersInRange", function (request, response) {
    //TESTED

    //Pre: searchString, startIndex, numberOfUsers
    //Post: true if successfully changed user state, false if failed
    //Purpose: to delete change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var searchText = splitText(request.params.searchString);
        var words = searchText.words;

        var searchQuery = new Parse.Query(Parse.User);
        searchQuery.containedIn('keywords', words);
        searchQuery.limit(request.params.numberOfPosts);
        searchQuery.skip(request.params.startIndex);
        searchQuery.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });
    });
});

Parse.Cloud.define("searchForOrganizationsInRange", function (request, response) {
    //TESTED

    //Pre: searchString, startIndex, numberOfUsers
    //Post: true if successfully changed user state, false if failed
    //Purpose: to delete change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var searchText = splitText(request.params.searchString);
        var words = searchText.words;

        var searchQuery = new Parse.Query(ORGANIZATION);
        searchQuery.containedIn('keywords', words);
        searchQuery.limit(request.params.numberOfPosts);
        searchQuery.skip(request.params.startIndex);
        searchQuery.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });
    });
});

Parse.Cloud.define("searchForPostsInRange", function (request, response) {
    //TESTED

    //Pre: searchString, startIndex, numberOfPosts
    //Post: true if successfully changed user state, false if failed
    //Purpose: to delete change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var searchText = splitText(request.params.searchString);
        var words = searchText.words;
        var hashtags = searchText.hashtags;

        var wordQuery = new Parse.Query(POST);
        wordQuery.containsAll('words', words);

        var hashtagQuery = new Parse.Query(POST);
        hashtagQuery.containedIn('hashtags', hashtags);

        var query = Parse.Query.or(hashtagQuery, wordQuery);
        query.limit(request.params.numberOfPosts);
        query.skip(request.params.startIndex);
        query.find({
            success: function (results) {
                response.success(results);
            },
            error: function (error) {
                response.error(error.code);
            }
        });
    });
});

Parse.Cloud.define("followOrganizations", function (request, response) {
    //TESTED

    //Pre: organizationObjectIds (array of organizationObjectIds)
    //Post: true if successfully changed user state, false if failed
    //Purpose: to delete change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        var organizationObjectIds = request.params.organizationObjectIds;
        var follows = [];

        if (organizationObjectIds != null) {
            for (var i = 0; i < organizationObjectIds.length; i++) {
                var follow = new Followers();
                var organization = new Organization();
                organization.id = organizationObjectIds[i];

                follow.set('user', request.user);
                follow.set('followDate', new Date());
                follow.set('organization', organization);

                if(organization.get('hasAccessCode')){
                    follow.set('type', TYPE_FOLLOWER);
                } else {
                    follow.set('type', TYPE_PENDING);
                }

                follows.push(follow);
            }

            Parse.Object.saveAll(follows, {
                success: function (results) {
                    response.success(true);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        } else {
            response.error(error);
        }

    });
});

Parse.Cloud.define("getAllPostsForOrganizationForRange", function (request, response) {
    //TESTED

    //Pre: organizationObjectId, startIndex, numberOfPosts
    //Post: true if successfully changed user state, false if failed
    //Purpose: to delete change the state of a follow request

    checkIfUserIsLoggedIn(request, response, function (request, response) {

        checkIfUserIsLoggedIn(request, response, function (request, response) {

            var organization = new Organization();
            organization.id = request.params.organizationObjectId;
            var numberOfPosts = request.params.numberOfPosts;
            var startIndex = request.params.startIndex;

            var query = new Parse.Query(POST);
            query.equalTo('organization', organization);
            query.limit(numberOfPosts);
            query.skip(startIndex);
            query.notEqualTo('isDeleted', true);
            query.descending('postStartDate');
            query.find({
                success: function (results) {
                    response.success(results);
                },
                error: function (error) {
                    response.error(error.code);
                }
            });
        });
    });
});

var splitText = function (txt) {

    var stopWords = ["this", "that", "is", "the", "in", "and", "a", "of", "it", ".", "does", "am", "are", "to"];

    var lowerCaseText = txt.toLowerCase();

    var words = lowerCaseText.replace(/[#.]/g, '').split(' ');

    words = _.difference(words, stopWords);

    var hashtags = lowerCaseText.match(/(#[a-z0-9][a-z0-9\-_]*)/ig);

    var result = {'words': words, 'hashtags': hashtags};
    return result;
};


var notifyAdminsOfOrganization = function (organizationObjectId, alert, successCode, errorCode) {

    var organization = new Organization();
    organization.id = organizationObjectId;

    var followersQuery = new Parse.Query(FOLLOWERS);
    followersQuery.equalTo('organization', organization);
    followersQuery.equalTo('type', TYPE_ADMIN);

    var installationQuery = new Parse.Query(Parse.Installation);
    installationQuery.matchesKeyInQuery('user', 'user', followersQuery);

    Parse.Push.send({
        where: installationQuery,
        data: {
            alert: alert,
            "badge": "Increment"
        }
    }, {
        success: function () {
            successCode();
        },
        error: function (error) {
            errorCode(error);
        }
    });
};

Parse.Cloud.job("sendPushNotifications", function (request, status) {

    Parse.Cloud.useMasterKey();

    var counter = 0;

    var postsQuery = new Parse.Query(POST);
    postsQuery.lessThanOrEqualTo('postStartDate', new Date());
    postsQuery.greaterThanOrEqualTo('postEndDate', new Date());
    postsQuery.equalTo('status', STATUS_APPROVED);
    postsQuery.equalTo('isDeleted', false);
    postsQuery.notEqualTo('pushNotificationSent', true);
    postsQuery.include('organization');
    postsQuery.find({
        success: function (posts) {
            if (!posts) {

            } else {
                _.each(posts, function (post) {

                    var alertText = post.get('organization').get('name') + ": " + post.get('title');
                    console.log(alertText);

                    var followersQuery = new Parse.Query(FOLLOWERS);
                    console.log('FollowersQuery: ' + followersQuery.toString());
                    followersQuery.equalTo('organization', post.get('organization'));
                    followersQuery.notContainedIn('type', [TYPE_NOT_FOLLOWER, TYPE_PENDING, TYPE_REJECTED]);

                    var installationQuery = new Parse.Query(Parse.Installation);
                    installationQuery.matchesKeyInQuery('user', 'user', followersQuery);

                    post.notifcationWasSent = true;
                    console.log(post.notifcationWasSent);

                    counter += 1;
                    status.message(counter + " Posts completed");

                    Parse.Push.send({
                        where: installationQuery,
                        data: {
                            alert: alertText,
                            "badge": "Increment"
                        }
                    }, {
                        success: function () {

                        },
                        error: function (error) {
                            post.notifcationWasSent = false;
                            console.error('Failed to send notification for ' + post.id);
                        }
                    });
                });

                _.each(posts, function (post) {
                    post.set('pushNotificationSent', post.notifcationWasSent);
                });
                Parse.Object.saveAll(posts, {
                    success: function (posts) {
                        status.success('Finished sending push notifications for ' + counter + ' posts!');
                    },
                    error: function () {
                        status.error('Failed to save ' + counter + ' posts!');
                    }
                });
            }
        },
        error: function (error) {

        }
    });
});