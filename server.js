const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Razorpay इन्स्टन्स इनिशियलाइज करणे
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// टेस्ट रूट (सर्व्हर लाईव्ह आहे का हे तपासण्यासाठी)
app.get('/', (req, res) => {
    res.send('PDF Store Backend is running successfully!');
});

// १. ऑर्डर तयार करण्यासाठी एपीआय (Create Order API)
app.post('/api/create-order', async (req, res) => {
    try {
        const options = {
            amount: 49900, // ४९९ रुपये (पैशांमध्ये)
            currency: "INR",
            receipt: "receipt_order_" + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong!" });
    }
});

// २. पेमेंट व्हेरिफाय करण्यासाठी आणि ड्राईव्ह लिंक देण्यासाठी एपीआय (Verify Payment API)
app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // सिग्नेचर मॅच करणे (सुरक्षिततेसाठी अत्यंत महत्त्वाचे)
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        // पेमेंट यशस्वी! आता युजरला गुगल ड्राईव्हची सुरक्षित लिंक पाठवा
        res.json({
            success: true,
            message: "Payment verified successfully!",
            driveLink: "https://drive.google.com/uc?export=download&id=YOUR_GOOGLE_DRIVE_FILE_ID" 
        });
    } else {
        res.status(400).json({ success: false, message: "Invalid signature, payment verification failed!" });
    }
});

// Render साठी अचूक पोर्ट सेटअप (महत्त्वाचे)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
