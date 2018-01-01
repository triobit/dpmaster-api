const express = require('express');
const app = express();

const cors = require('cors');

const logger = require('./logger');

app.use(cors());

const servers = require('./servers');
app.use('/', servers);

app.listen(3000, () => {
	logger.info(`Listening on port ${config.hostname}:${config.port}....`);
});
