const app = require('../index');

function handler(req, res) {
	return app(req, res);
}

module.exports = handler;
module.exports.default = handler;
