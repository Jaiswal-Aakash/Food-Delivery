import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const placeOrder = async (req, res) => {
    const frontend_url = "http://localhost:5174";

    try {
        // Step 1: Create and save new order
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.address,
        });
        await newOrder.save();
        await userModel.findByIdAndUpdate(req.body.userId, { cartData: {} });

        // Step 2: Prepare Stripe line items
        const line_items = req.body.items.map((item) => ({
            price_data: {
                currency: "inr",
                product_data: { name: item.name },
                unit_amount: item.price * 100, // Stripe requires amount in paisa
            },
            quantity: item.quantity,
        }));

        // Add delivery charges
        line_items.push({
            price_data: {
                currency: "inr",
                product_data: { name: "Delivery Charges" },
                unit_amount: 2 * 100,
            },
            quantity: 1,
        });

        // Step 3: Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            line_items,
            mode: "payment",
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        });

        // Send session URL back to frontend
        res.json({ success: true, session_url: session.url });

    } catch (error) {
        console.error("Error in placeOrder:", error);
        res.status(500).json({ success: false, message: "Could not place order." });
    }
};

const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body;
    console.log("Order ID:", orderId, "Success:", success);

    try {
        if (success === "true" || success === true) {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Payment successful" });
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false, message: "Payment failed, order deleted" });
        }
    } catch (error) {
        console.error("Error in verifyOrder:", error);
        res.status(500).json({ success: false, message: "Error verifying order" });
    }
};

const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId });
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("Error in userOrders:", error);
        res.status(500).json({ success: false, message: "Could not retrieve orders." });
    }
};

const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders });
    } catch (error) {
        console.error("Error in listOrders:", error);
        res.status(500).json({ success: false, message: "Could not retrieve orders." });
    }
};

const updateStatus = async (req, res) => {
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status });
        res.json({ success: true, message: "Order status updated" });
    } catch (error) {
        console.error("Error in updateStatus:", error);
        res.status(500).json({ success: false, message: "Could not update order status" });
    }
};

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus };
