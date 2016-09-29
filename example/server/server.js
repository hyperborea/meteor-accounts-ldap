if (Meteor.isServer) {
  _.extend(LDAP_SETTINGS, {
    url: "ldaps://ldap-slave-lb.int.klarna.net",
    dn: "uid={username},ou=People,dc=internal,dc=machines",
    filter: "(&(objectClass=kreditorUser)(kreditorEnabledUser=TRUE))",

    allowedGroups: ['users'],
    
    roleMapping: {
      access: ['users']
    }
  });  
}