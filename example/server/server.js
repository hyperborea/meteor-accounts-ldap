if (Meteor.isServer) {
  _.extend(LDAP_SETTINGS, {
    allowedGroups: ['example.debug'],
    
    roleMapping: {
      access: ['example.debug']
    },

    guestUser: {
      username: 'guest',
      password: 'guest',
      displayName: 'Guest User',
      groups: ['example.debug'],
    }
  });  
}