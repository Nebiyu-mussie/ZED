import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is always loaded, regardless of the current working directory.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
