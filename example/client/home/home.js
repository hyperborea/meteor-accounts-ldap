Template.home.events({
  'click .js-logout': function() {
    Meteor.logout();
  }
});