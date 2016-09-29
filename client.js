Meteor.loginWithLDAP = function(username, password, callback) {
  var loginRequest = {
    ldap: true,
    username: username,
    ldapPass: password
  };

  Accounts.callLoginMethod({
    methodArguments: [loginRequest],
    userCallback: callback
  });
};