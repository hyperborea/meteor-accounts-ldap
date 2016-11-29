process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
let ldapjs = Npm.require('ldapjs');
let Future = Npm.require('fibers/future');


LDAP_SETTINGS = {
  // url and userDn must be provided
  url: undefined,
  userDn: undefined, // supports {username} placeholder
  userFilter: '(&)',

  groupsDn: undefined,
  groupsFilter: '(&(member={userDn}))', // supports {userDn} placeholder

  // Fields to copy over from LDAP to Meteor account.
  fields: ['displayName'],
  // If user is in any of the listed groups the Meteor role will be added, otherwise removed.
  roleMapping: {
    // 'meteorRole': ['ldapGroup1', 'ldapGroup2'],
  },
  // allowedGroups: ['allowedLdapGroup1', 'allowedLdapGroup2'],
};


// Class for authenticating and querying LDAP.
class LDAP {
  constructor (username, password) {
    this.username = username;
    this.password = password;
    this.client = ldapjs.createClient({
      url: LDAP_SETTINGS.url,
      timeout: 3000
    });
  }

  dn() {
    return LDAP_SETTINGS.userDn.replace('{username}', this.username);
  }
 
  authenticate() {
    let fut = new Future();

    this.client.bind(this.dn(), this.password, function(err, res) {
      if (err) {
        console.log(err);
      }

      fut.return(!err);
    });

    return fut.wait();
  }

  query() {
    let fut = new Future();
    let self = this;

    this.client.search(this.dn(), {
      scope: 'sub',
      filter: LDAP_SETTINGS.userFilter
    }, function(err, res) {
      if (err) {
        throw new Meteor.Error(err.code, err.message);
      }
      else {
        res.on('searchEntry', function(entry) {
          let object = _.extend({ username: self.username },
            _.pick(entry.object, LDAP_SETTINGS.fields)
          );

          self.getGroups(function(groups) {
            object.groups = groups;
            fut.return(object);
          });
        });

        res.on('error', function(err) {
          throw new Meteor.Error(err.code, err.message);
        });
      }
    });

    return fut.wait();
  }

  getGroups(callback) {
    let groups = [];

    if (!LDAP_SETTINGS.groupsDn || !LDAP_SETTINGS.groupsFilter) {
      callback(groups);
      return;
    }

    this.client.search(LDAP_SETTINGS.groupsDn, {
      scope: 'sub',
      filter: LDAP_SETTINGS.groupsFilter.replace('{userDn}', this.dn()),
      attributes: ['cn']
    }, function(err, res) {
      if (!err) {
        res.on('searchEntry', function(entry) {
          groups.push(entry.object.cn);
        });

        res.on('end', function() {
          callback(groups);
        });
      }
    });
  }
}


// New login handler for LDAP authentication.
Accounts.registerLoginHandler('ldap', function(loginRequest) {
  if (!loginRequest.ldap) {
    return undefined;
  }

  const username = loginRequest.username;
  const password = loginRequest.ldapPass;
  let ldap = new LDAP(username, password);

  if (ldap.authenticate()) {
    let userId = null;
    let user = Meteor.users.findOne({username: username});

    if (user) {
      userId = user._id;
    }
    else {
      userId = Accounts.createUser({username: username});
      user = Meteor.users.findOne(userId);
    }

    const object = ldap.query();
    Meteor.users.update(userId, {$set: object});

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