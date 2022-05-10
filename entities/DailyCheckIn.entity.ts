import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class DailyCheckIn {
	@PrimaryKey()
	id!: number;

	@Property()
	message_id!: number;
}