import mongoose from 'mongoose';
// import dotenv from 'dotenv';

// dotenv.config(); 

const connectDB = async () => {
  try {
    const dbURI = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@mongo-container:27017/${process.env.MONGO_DB}?authSource=admin`;
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); 
  }
};

export default connectDB;
