const winston = require('winston');

const config = require('config').log;

var transports = [];

if (config) {
	if (config.console && config.console.enabled) {
		transports.push(new winston.transports.Console({
			level: config.console.level || 'info'
		}));
	}

	if (config.sentry && config.sentry.enabled) {
		const Sentry = require('winston-sentry');

		transports.push(new Sentry({
			level: 'warn',
			dsn: config.sentry.dsn,
			patchGlobal: true
		}));
	}
}

module.exports = new winston.Logger({
	transports: transports
});