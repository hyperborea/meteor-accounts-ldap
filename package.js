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
  
  api.addFiles('server.jsx', 'server');
  api.addFiles('client.js', 'client');
});