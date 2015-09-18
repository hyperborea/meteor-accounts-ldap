Meteor.loginWithLDAP = function(username, password, callback) {
  var loginRequest = {
    ldap: true,
    username: username,
    password: password
  };

  Accounts.callLoginMethod({
    methodArguments: [loginRequest],
    userCallback: callback
  });
};