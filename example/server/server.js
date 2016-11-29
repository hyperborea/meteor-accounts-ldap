_.extend(LDAP_SETTINGS, {
  url: "ldaps://ldap-slave-lb.int.klarna.net",
  userDn: "uid={username},ou=People,dc=internal,dc=machines",
  userFilter: "(&(objectClass=kreditorUser)(kreditorEnabledUser=TRUE))",

  groupsDn: "ou=Groups,dc=internal,dc=machines",
  groupsFilter: "(&(objectClass=kreditorGroup)(uniqueMember={userDn}))",

  // allowedGroups: ['users'],
  
  roleMapping: {
    access: ['users']
  }
});


Meteor.publish(null, function() {
  return Meteor.users.find({}, {
    fields: { username: 1, displayName: 1, groups: 1 }
  });
});