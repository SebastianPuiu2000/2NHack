import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

export enum userRole {
    Delivery = 'delivery',
    Donator = 'donate',
    ShelterProvider = 'provideShelter',
    ShelterConsumer = 'needShelter',
    SuppliesConsumer = 'needSupplies'
};

export type User = {
    name: string,
    password: string,
    role: userRole
};

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: userRole
    },
    shelterId: {            // only for ShelterConsumer; id of shelter he's currently in
        type: String,
        required: false,
        default: undefined
    }
});

// Index name (faster searches)
UserSchema.index({ name: 1 });

export const UserModel = mongoose.model('User', UserSchema);

export async function createUser(user: User): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(user.password, salt);

    try {
        await UserModel.create({
            name: user.name,
            password: hash,
            role: user.role
        });
        
        return 'OK';
    } catch (error) {
        console.warn(error);

        if (error instanceof Error) {
            return error.message;
        }
        return 'Error';
    }
};
