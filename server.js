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

// **सर्व पुस्तकांची माहिती (Database ऐवजी ऑब्जेक्ट वापरून)**
const booksDatabase = {
    "book-1": {
        title: "Advanced Data Analytics Guide",
        amount: 100, // ४९९ रुपये (पैशांमध्ये)
        driveLink: "https://drive.google.com/file/d/1yUPVxnDZT6aJOOo9e4gCzHYunp81cdqf/view?usp=sharing"
    },
    "book-2": {
        title: "Python & SQL Masterclass",
        amount: 100, // २९९ रुपये
        driveLink: "https://drive.google.com/uc?export=download&id=YOUR_DRIVE_FILE_ID_2"
    },
    "book-3": {
        title: "Complete Excel & Power BI Handbook",
        amount: 100, // १९९ रुपये
        driveLink: "https://drive.google.com/uc?export=download&id=YOUR_DRIVE_FILE_ID_3"
    }
};

// टेस्ट रूट
app.get('/', (req, res) => {
    res.send('PDF Store Backend is running successfully!');
});

// १. ऑर्डर तयार करण्यासाठी एपीआय (Book ID नुसार)
app.post('/api/create-order', async (req, res) => {
    try {
        const { bookId } = req.body;
        const book = booksDatabase[bookId];

        if (!book) {
            return res.status(404).json({ success: false, message: "Book not found!" });
        }

        const options = {
            amount: book.amount, 
            currency: "INR",
            receipt: "receipt_" + bookId + "_" + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json({
            success: true,
            order,
            bookTitle: book.title
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Something went wrong!" });
    }
});

// २. पेमेंट व्हेरिफाय करण्यासाठी आणि योग्य ड्राईव्ह लिंक देण्यासाठी एपीआय
app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookId } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        const book = booksDatabase[bookId];
        res.json({
            success: true,
            message: "Payment verified successfully!",
            driveLink: book ? book.driveLink : "#" 
        });
    } else {
        res.status(400).json({ success: false, message: "Invalid signature, payment verification failed!" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
