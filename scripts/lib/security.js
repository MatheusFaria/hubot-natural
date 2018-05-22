const security = {};

usersAndRoles = {};

security.loadUserRoles = function(robot) {
  robot.adapter.callMethod('getUserRoles').then(function(users) {
    users.forEach(function(user) {
      user.roles.forEach(function(role) {
        if (typeof usersAndRoles[role] === 'undefined') {
          usersAndRoles[role] = [];
        }
        usersAndRoles[role].push(user.username);
      });
    });
  });
  return usersAndRoles;
};


security.checkRole = function(msg, role) {
  if (typeof usersAndRoles[role] !== 'undefined') {
    if (usersAndRoles[role].indexOf(msg.envelope.user.name) === -1) {
      return false;
    } else {
      return true;
    }
  } else {
    msg.robot.logger.info(`Role ${role} not found`);
    return false;
  }
};

module.exports = security;
