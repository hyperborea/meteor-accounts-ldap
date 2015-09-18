Template.body.events({
  'submit form': function(event, template) {
    event.preventDefault();

    var username = template.find('[name=username]').value;
    var password = template.find('[name=password]').value;

    Meteor.loginWithLDAP(username, password);
  },

  'click .js-logout': function() {
    Meteor.logout();
  }
});