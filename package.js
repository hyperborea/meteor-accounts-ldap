Package.describe({
  name: 'klarna:accounts-ldap',
  version: '0.0.1',
  summary: '',
  git: '',
  documentation: 'README.md'
});

Npm.depends({'ldapjs': '0.7.1'});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');
  api.use('grigio:babel');
  api.use('accounts-base');
  api.use('alanning:roles@1.2.13');

  api.imply('accounts-base');
  api.imply('alanning:roles');
  
  api.addFiles('server.jsx', 'server');
  api.addFiles('client.js', 'client');

  api.export('LDAP_SETTINGS');
});