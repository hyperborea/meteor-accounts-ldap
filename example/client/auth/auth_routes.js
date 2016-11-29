AUTH_ROUTES = ['login', 'logout', 'noaccess'];

// Make sure the user is logged in, otherwise redirect to login page.
Meteor.startup(function() {
  Tracker.autorun(function() {
    if (!Meteor.userId()) {
      var route = FlowRouter.current().route;
      if (!_.contains(AUTH_ROUTES, route.name)) {
        Session.set('redirectAfterLogin', route.path);
      }

      FlowRouter.go('login');
    }
  });
});

// Redirect user on login.
Accounts.onLogin(function() {
  var redirect = Session.get('redirectAfterLogin') || 'home';
  FlowRouter.go(redirect);
});

// // Require users to have at least the 'access' role.
// FlowRouter.triggers.enter([requireAccess], {except: AUTH_ROUTES});
// function requireAccess() {
//   if (!Roles.userIsInRole(Meteor.user(), 'access')) {
//     FlowRouter.go('noaccess');
//   }
// }


FlowRouter.route('/login', {
  name: 'login',
  action: function() {
    BlazeLayout.render('login');
  }
});

FlowRouter.route('/logout', {
  name: 'logout',
  action: function() {
    Meteor.logout();
  }
});

FlowRouter.route('/noaccess', {
  name: 'noaccess',
  action: function() {
    BlazeLayout.render('noaccess');
  }
});