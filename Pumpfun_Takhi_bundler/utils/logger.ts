import fs from 'fs';
import path from 'path';
import pino from "pino";
import { TRACK_OR_NOT } from '../constants';


const transport = pino.transport({
  target: 'pino-pretty',
});

export const logger = pino(
  {
    level: 'info',
    redact: ['poolKeys'],
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  transport,
);

export const historyLog = (value: string) => {
  const tracking = TRACK_OR_NOT
  if (!tracking) { return }
  const folderPath = 'Log';
  const filePath = path.join(folderPath, "log.txt");

  try {
    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    let existingData: string = "";

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // If the file exists, read its content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      existingData = fileContent + "\n";
    }

    // Add the new data to the existing array
    existingData += value

    // Write the updated data back to the file
    fs.writeFileSync(filePath, existingData);

  } catch (error) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      fs.writeFileSync(filePath, value);
    } catch (error) {
    }
  }
}