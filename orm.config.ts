import { Options, ConnectionOptions } from '@mikro-orm/core';
import { DailyCheckIn } from './entities/DailyCheckIn.entity';

import dotenv from 'dotenv';

let connection: ConnectionOptions;

// const { VERCEL } = process.env;

const entities = [DailyCheckIn];

dotenv.config();

const { DB_USER, DB_PASSWORD, DB_HOST = 'localhost', DB_NAME = 'sylvabot' } = process.env;
connection = {
	host: DB_HOST,
	dbName: DB_NAME,
	user: DB_USER,
	password: DB_PASSWORD
};

const config: Options = {
	type: 'postgresql',
	entities,
	discovery: {
		disableDynamicFileAccess: true
	},
	...connection,
	baseDir: process.cwd()
};

export default config;
export { connection };