import { Options, ConnectionOptions } from '@mikro-orm/core';
import { DailyCheckIn } from './entities/DailyCheckIn.entity';

import dotenv from 'dotenv';

let connection: ConnectionOptions;

const entities = [DailyCheckIn];

dotenv.config();

const { DB_CONNECTION_STRING } = process.env;

if (!DB_CONNECTION_STRING) {
	console.error('no DB_CONNECTION_STRING in env')
	process.exit(1);
}

connection = {
	clientUrl: DB_CONNECTION_STRING
};

const config: Options = {
	type: 'postgresql',
	entities,
	discovery: {
		disableDynamicFileAccess: true
	},
	...connection,
	baseDir: process.cwd(),
	pool: { min: 10, max: 20 },
	schemaGenerator: {
		disableForeignKeys: false
	}
};

export default config;
export { connection };