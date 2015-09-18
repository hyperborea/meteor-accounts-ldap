process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
let ldapjs = Npm.require('ldapjs');
let Future = Npm.require('fibers/future');


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

  getGroupsForUser (username) {
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
          let groups = entry.object.memberOf.map( (s) => s.match(/^cn=(.*?),/)[1] );
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

  const username = loginRequest.username;
  const password = loginRequest.password;
  let ldap = new LDAP();

  if (ldap.authenticate(username, password)) {
    let userId = null
    let user = Meteor.users.findOne({username: username});

    if (user) {
      userId = user._id;
    }
    else {
      userId = Meteor.users.insert({ username: username });
    }

    let groups = ldap.getGroupsForUser(username);
    console.log(groups);

    return {
      userId: userId
    };
  } 
  
  return undefined;
});