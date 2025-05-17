import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import sequelize from "../config/sequelize";

export class PushSubscription extends Model<InferAttributes<PushSubscription>, InferCreationAttributes<PushSubscription>> {
	declare PushSubscriptionId: CreationOptional<number>;
	declare endpoint: string;
	declare keys: { p256dh: string; auth: string };
}

PushSubscription.init({
	PushSubscriptionId: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	endpoint: { 
		type: DataTypes.STRING, 
		allowNull: false, 
		unique: true 
	},
	keys: {
		type: DataTypes.JSONB,
		allowNull: false
	}
}, {
	sequelize,
	modelName: 'PushSubscription',
	tableName: 'pushSubscription',
	timestamps: true
});
