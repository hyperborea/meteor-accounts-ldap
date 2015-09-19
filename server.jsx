process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
let ldapjs = Npm.require('ldapjs');
let Future = Npm.require('fibers/future');


LDAP_SETTINGS = {
  // Fields to copy over from LDAP to Meteor account.
  fields: ['displayName', 'mail', 'title', 'groups'],
  // If user is in any of the listed groups the Meteor role will be added, otherwise removed.
  roleMapping: {
    // 'meteorRole': ['ldapGroup1', 'ldapGroup2']
  }
};


// Class for authenticating and querying LDAP.
class LDAP {
  constructor() {
    this.client = ldapjs.createClient({
      url: 'ldaps://ldap-slave-lb.int.klarna.net'
    });
  }

  dn (username) {
    return `uid=${username},ou=People,dc=internal,dc=machines`;
  }

  authenticate (username, password) {
    let fut = new Future();

    this.client.bind(this.dn(username), password, function(err, res) {
      if (err) {
        console.log(err);
      }

      fut.return(!err);
    });

    return fut.wait();
  }

  query (username) {
    let fut = new Future();

    this.client.search(this.dn(username), {
      scope: 'sub',
      filter: '(&(objectClass=kreditorUser)(kreditorEnabledUser=TRUE))'
    }, function (err, res) {
      if (err) {
        throw new Meteor.Error(err.code, err.message);
      }
      else {
        res.on('searchEntry', function (entry) {
          let object = _.extend({
            username: username,
            groups: entry.object.memberOf.map( (s) => s.match(/^cn=(.*?),/)[1] )
          },
            _.pick(entry.object, LDAP_SETTINGS.fields)
          );

          fut.return(object);
        });

        res.on('error', function (err) {
          throw new Meteor.Error(err.code, err.message);
        });
      }
    });

    return fut.wait();
  }
}


// Make sure all additional user fields are published.
Meteor.startup(function() {
  Meteor.publish(null, function() {
    let fields = {};
    LDAP_SETTINGS.fields.forEach((k) => fields[k] = 1);
    return Meteor.users.find({_id: this.userId}, {fields: fields});
  });
});


// New login handler for LDAP authentication.
Accounts.registerLoginHandler('ldap', function(loginRequest) {
  if (!loginRequest.ldap) {
    return undefined;
  }

  const username = loginRequest.username;
  const password = loginRequest.password;
  let ldap = new LDAP();

  if (ldap.authenticate(username, password)) {
    let userId = null;
    let user = Meteor.users.findOne({username: username});

    if (user) {
      userId = user._id;
    }
    else {
      userId = Meteor.users.insert({username: username});
    }

    const object = ldap.query(username);
    Meteor.users.update(userId, object);

    // console.log(LDAP_SETTINGS.roleMapping);
    _.each(LDAP_SETTINGS.roleMapping, function(groups, role) {
      if (_.intersection(groups, object.groups).length) {
        Roles.addUsersToRoles(user, [role]);
      }
      else {
        Roles.removeUsersFromRoles(userId, [role]);
      }
    });

    return {
      userId: userId
    };
  } 
  
  return {
    error: new Meteor.Error(403, "Authentication failed.")
  };
});