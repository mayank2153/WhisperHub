import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ConnectDB from './config/db.js';
import { app } from './app.js';
import serverless from 'serverless-http';

dotenv.config({
  path: '.env'
});

// Connect to the database
ConnectDB().catch(err => console.error("MONGO DB error: " + err));

// Export the handler for AWS Lambda
export const handler = serverless(app);
