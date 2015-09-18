process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var ldapjs = Npm.require('ldapjs');
var Future = Npm.require('fibers/future');


class LDAP {
  constructor() {
    this.client = ldapjs.createClient({
      url: 'ldaps://ldap-slave-lb.int.klarna.net'
    });
  }

  authenticate (username, password) {
    var fut = new Future();
    var dn = `uid=${username},ou=People,dc=internal,dc=machines`;

    this.client.bind(dn, password, function(err, res) {
      if (err) {
        console.log(err);
      }

      fut.return(!err);
    });

    return fut.wait();
  }

  getGroupsForUser (username) {
    var fut = new Future();
    var dn = `uid=${username},ou=People,dc=internal,dc=machines`;

    this.client.search(dn, {
      scope: 'sub',
      filter: '(&(objectClass=kreditorUser)(kreditorEnabledUser=TRUE))'
    }, function (err, res) {
      if (err) {
        throw new Meteor.Error(err.code, err.message);
      }
      else {
        res.on('searchEntry', function (entry) {
          var groups = entry.object.memberOf.map( (s) => s.match(/^cn=(.*?),/)[1] );
          fut.return(groups);
        });

        res.on('error', function (err) {
          throw new Meteor.Error(err.code, err.message);
        });
      }
    });

    return fut.wait();
  }
}


Accounts.registerLoginHandler('ldap', function(loginRequest) {
  if (!loginRequest.ldap) {
    return undefined;
  }

  var username = loginRequest.username;
  var password = loginRequest.password;
  var ldap = new LDAP();

  if (ldap.authenticate(username, password)) {
    var userId = null
    var user = Meteor.users.findOne({username: username});

    if (user) {
      userId = user._id;
    }
    else {
      userId = Meteor.users.insert({ username: username });
    }

    var groups = ldap.getGroupsForUser(username);
    console.log(groups);

    return {
      userId: userId
    };
  } 
  
  return undefined;
});