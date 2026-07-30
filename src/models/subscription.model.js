import mongoose, {schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber :{
        type: Schema.Types.ObjectId,// gives the one who is subscribing
        ref: "User"
    },
    channel :{
          type: Schema.Types.ObjectId,// one to whom the subscriber is subscribing
        ref: "User"  
        }
        },
{timestamps: true})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)