Package.describe({
  name: 'hyperborea:accounts-ldap',
  version: '3.0.2',
  summary: 'Extends account package to support LDAP.',
  git: '',
  documentation: null
});

Npm.depends({'ldapjs': '1.0.0'});

Package.onUse(function(api) {
  api.versionsFrom('1.4.1.1');
  api.use('ecmascript@0.4.0');
  api.use('accounts-password');
  api.use('alanning:roles@1.2.13');

  api.imply('accounts-base');
  api.imply('alanning:roles');
  
  api.addFiles('server.js', 'server');
  api.addFiles('client.js', 'client');

  api.export('LDAP_SETTINGS');
});