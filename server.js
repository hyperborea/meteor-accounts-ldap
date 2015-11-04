process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
let ldapjs = Npm.require('ldapjs');
let Future = Npm.require('fibers/future');


LDAP_SETTINGS = {
  // Fields to copy over from LDAP to Meteor account.
  fields: ['displayName', 'mail', 'title', 'groups'],
  // If user is in any of the listed groups the Meteor role will be added, otherwise removed.
  roleMapping: {
    // 'meteorRole': ['ldapGroup1', 'ldapGroup2']
  },
  // allowedGroups: ['allowedLdapGroup1', 'allowedLdapGroup2'],
  // guestUser: {
    // username: 'guest',
    // password: 'guest',
  // }
};


// Class for authenticating and querying LDAP.
class LDAP {
  constructor (username, password) {
    this.username = username;
    this.password = password;
    this.client = ldapjs.createClient({
      url: 'ldaps://ldap-slave-lb.int.klarna.net',
      timeout: 3000
    });
  }

  dn () {
    return `uid=${this.username},ou=People,dc=internal,dc=machines`;
  }
 
  isGuestUser () {
    const guest = LDAP_SETTINGS.guestUser;
    return guest && this.username == guest.username && this.password == guest.password;
  }

  authenticate () {
    if (this.isGuestUser()) return true;

    let fut = new Future();

    this.client.bind(this.dn(), this.password, function(err, res) {
      if (err) {
        console.log(err);
      }

      fut.return(!err);
    });

    return fut.wait();
  }

  query () {
    if (this.isGuestUser()) return LDAP_SETTINGS.guestUser;

    let fut = new Future();
    let self = this;

    this.client.search(this.dn(), {
      scope: 'sub',
      filter: '(&(objectClass=kreditorUser)(kreditorEnabledUser=TRUE))'
    }, function (err, res) {
      if (err) {
        throw new Meteor.Error(err.code, err.message);
      }
      else {
        res.on('searchEntry', function (entry) {
          let object = _.extend({
            username: self.username,
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
  let ldap = new LDAP(username, password);

  if (ldap.authenticate()) {
    let userId = null;
    let user = Meteor.users.findOne({username: username});

    if (user) {
      userId = user._id;
    }
    else {
      userId = Meteor.users.insert({username: username});
    }

    const object = ldap.query();
    Meteor.users.update(userId, object);

    _.each(LDAP_SETTINGS.roleMapping, function(groups, role) {
      if (_.intersection(groups, object.groups).length) {
        Roles.addUsersToRoles(user, [role]);
      }
      else {
        Roles.removeUsersFromRoles(userId, [role]);
      }
    });

    const allowedGroups = LDAP_SETTINGS.allowedGroups;
    if (allowedGroups && _.intersection(allowedGroups, object.groups).length < 1) {
      return {
        error: new Meteor.Error(403, "Access denied, please request permissions.")
      }
    }
    else {
      return {
        userId: userId
      };
    }
  } 
  
  return {
    error: new Meteor.Error(403, "Authentication failed.")
  };
});