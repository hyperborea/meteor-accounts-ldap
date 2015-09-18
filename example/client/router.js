function enforceLogin() {
  if (!Meteor.user()) {
    FlowRouter.go('login');
  }
}

Accounts.onLogin(function() {
  FlowRouter.go('home');
});

Meteor.startup(function() {
  Tracker.autorun(function() {
    if (!Meteor.userId()) FlowRouter.go('login');
  });
});

FlowRouter.triggers.enter([enforceLogin], {except: ['home']});


FlowRouter.route('/', {
  name: 'home',
  action: function() {
    BlazeLayout.render('home');
  }
});

FlowRouter.route('/login', {
  name: 'login',
  action: function() {
    BlazeLayout.render('login');
  }
});