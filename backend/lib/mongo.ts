import dns from 'node:dns';
import mongoose from 'mongoose';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/zemen_express';
const CONFIGURED_URI = process.env.MONGODB_URI || process.env.MONGO_URI || DEFAULT_LOCAL_URI;
const FALLBACK_URI = process.env.MONGODB_FALLBACK_URI || DEFAULT_LOCAL_URI;

let connected = false;

export const connectMongo = async () => {
  if (connected) return;
  mongoose.set('strictQuery', false);

  if (CONFIGURED_URI.startsWith('mongodb+srv://')) {
    const dnsServers = (process.env.MONGODB_DNS_SERVERS || process.env.MONGO_DNS_SERVERS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (dnsServers.length > 0) {
      dns.setServers(dnsServers);
      console.log('[mongo] Using custom DNS servers for SRV lookup:', dnsServers.join(', '));
    }
  }

  try {
    await mongoose.connect(CONFIGURED_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (error: any) {
    const isSrvUri = CONFIGURED_URI.startsWith('mongodb+srv://');
    const isSrvLookupFailure =
      error?.code === 'ECONNREFUSED' ||
      String(error?.message || '').includes('querySrv');

    if (isSrvUri && isSrvLookupFailure && FALLBACK_URI !== CONFIGURED_URI) {
      console.warn(
        '[mongo] Atlas SRV DNS lookup failed. Trying local fallback URI:',
        FALLBACK_URI
      );
      await mongoose.connect(FALLBACK_URI, { serverSelectionTimeoutMS: 10000 });
    } else {
      const rootCause = error?.message ? ` Root cause: ${error.message}` : '';
      throw new Error(
        `MongoDB connection failed using URI "${CONFIGURED_URI}". ` +
          `Set MONGODB_URI or MONGO_URI to a reachable Mongo instance (for local dev: ${DEFAULT_LOCAL_URI}).` +
          rootCause
      );
    }
  }

  const host = mongoose.connection.host || 'unknown-host';
  const dbName = mongoose.connection.name || 'unknown-db';
  console.log(`MongoDB connected: ${host}/${dbName}`);
  connected = true;
};

export default mongoose;
