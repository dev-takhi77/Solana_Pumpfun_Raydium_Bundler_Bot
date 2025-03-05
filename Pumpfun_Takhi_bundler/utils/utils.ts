import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { rl } from "../menu/menu"
import { init } from ".."

dotenv.config();

export function generateDistribution(
  totalValue: number,
  minValue: number,
  maxValue: number,
  num: number,
  mode: string,
): number[] {
  if (mode == "even") {
    let element = totalValue / num;
    let array: number[] = [];
    for (let i = 0; i < num; i++)
      array.push(element);
    return array
  }
  // Early checks for impossible scenarios
  if (num * minValue > totalValue || num * maxValue < totalValue) {
    console.log("🚀 ~ totalValue:", totalValue)
    console.log("🚀 ~ maxValue:", maxValue)
    console.log("🚀 ~ minValue:", minValue)
    console.log("🚀 ~ num:", num)
    throw new Error('Impossible to satisfy the constraints with the given values.');
  }
  if (minValue <= 0.003) {
    console.log("MIN_AMOUNT must be bigger than 0.003")
    return []
  }
  // Start with an evenly distributed array
  let distribution: number[] = new Array(num).fill(minValue);
  let currentTotal: number = minValue * num;
  // Randomly add to each to reach totalValue
  // ensuring values stay within minValue and maxValue
  for (let i = 0; currentTotal < totalValue && i < 10000; i++) {
    for (let j = 0; j < num; j++) {
      // Calculate remaining space to ensure constraints are not broken
      const spaceLeft = Math.min(totalValue - currentTotal, maxValue - distribution[j]);
      if (spaceLeft <= 0) continue;
      // Randomly decide how much to add within the space left
      const addValue = Math.floor(Math.random() * (spaceLeft + 1));
      distribution[j] += addValue;
      currentTotal += addValue;
      // Break early if the target is reached
      if (currentTotal === totalValue) break;
    }
  }
  // In cases where distribution cannot reach totalValue due to rounding, adjust the last element
  // This is safe due to the initial constraints check ensuring a solution exists
  if (currentTotal !== totalValue) {
    const difference = totalValue - currentTotal;
    for (let i = distribution.length - 1; i >= 0; i--) {
      const potentialValue = distribution[i] + difference;
      if (potentialValue <= maxValue) {
        distribution[i] += difference;
        break;
      }
    }

  }
  return distribution;
}
export const retrieveEnvVariable = (variableName: string) => {
  const variable = process.env[variableName] || '';
  if (!variable) {
    console.log(`${variableName} is not set`);
    process.exit(1);
  }
  return variable;
};

// Define the type for the JSON file content

export const randVal = (min: number, max: number, count: number, total: number, isEven: boolean): number[] => {

  const arr: number[] = Array(count).fill(total / count);
  if (isEven) return arr

  if (max * count < total)
    throw new Error("Invalid input: max * count must be greater than or equal to total.")
  if (min * count > total)
    throw new Error("Invalid input: min * count must be less than or equal to total.")
  const average = total / count
  // Randomize pairs of elements
  for (let i = 0; i < count; i += 2) {
    // Generate a random adjustment within the range
    const adjustment = Math.random() * Math.min(max - average, average - min)
    // Add adjustment to one element and subtract from the other
    arr[i] += adjustment
    arr[i + 1] -= adjustment
  }
  // if (count % 2) arr.pop()
  return arr;
}


// export const saveDataToFile = (newData: string[], filePath: string = "data.json") => {
//   try {
//     let existingData: string[] = [];

//     // Check if the file exists
//     if (fs.existsSync(filePath)) {
//       // If the file exists, read its content
//       const fileContent = fs.readFileSync(filePath, 'utf-8');
//       existingData = JSON.parse(fileContent);
//     }

//     // Add the new data to the existing array
//     existingData.push(...newData);

//     // Write the updated data back to the file
//     fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

//   } catch (error) {
//     try {
//       if (fs.existsSync(filePath)) {
//         fs.unlinkSync(filePath);
//         console.log(`File ${filePath} deleted and create new file.`);
//       }
//       fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
//       console.log("File is saved successfully.")
//     } catch (error) {
//       console.log('Error saving data to JSON file:', error);
//     }
//   }
// };


export const saveDataToFile = (newData: string[], fileName: string = "data.json") => {
  const folderPath = 'keys';
  const filePath = path.join(folderPath, fileName);

  try {
    // Create the folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    let existingData: string[] = [];

    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // If the file exists, read its content
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      existingData = JSON.parse(fileContent);
    }

    // Add the new data to the existing array
    existingData.push(...newData);

    // Write the updated data back to the file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

    console.log("File is saved successfully.");

  } catch (error) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`File ${filePath} deleted and will be recreated.`);
      }
      fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
      console.log("File is saved successfully.");
    } catch (error) {
      console.log('Error saving data to JSON file:', error);
    }
  }
};


export const sleep = async (ms: number) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

// // Function to read JSON file
// export function readJson(filename: string = "data.json"): string[] {
//   if (!fs.existsSync(filename)) {
//     // If the file does not exist, create an empty array
//     fs.writeFileSync(filename, '[]', 'utf-8');
//   }
//   const data = fs.readFileSync(filename, 'utf-8');
//   return JSON.parse(data) as string[];
// }

// Function to read JSON file from the "keys" folder
export function readJson(fileName: string = "data.json"): string[] {
  const folderPath = 'keys';
  const filePath = path.join(folderPath, fileName);

  if (!fs.existsSync(filePath)) {
    // If the file does not exist, create an empty array file in the "keys" folder
    fs.writeFileSync(filePath, '[]', 'utf-8');
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as string[];
}

export function deleteConsoleLines(numLines: number) {
  for (let i = 0; i < numLines; i++) {
    process.stdout.moveCursor(0, -1); // Move cursor up one line
    process.stdout.clearLine(-1);        // Clear the line
  }
}

export const mainMenuWaiting = () => {
  rl.question('press Enter key to continue', (answer: string) => {
    init()
  })
}
