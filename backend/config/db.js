import mongoose from "mongoose";
export const connectDB = async () => {
    await mongoose.connect('mongodb+srv://realakashjaiswal:2hB3ZRJy69YMBNz0@tomatodb.pjdkz6h.mongodb.net/FoodDel').then(()=>console.log("DB Connected"));
}  