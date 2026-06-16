/**
 * Device Database
 * 
 * This file contains a comprehensive list of popular smartphone models with their
 * exact screen resolutions. These dimensions are used to generate wallpapers that
 * perfectly fit each device's screen.
 * 
 * Note: All dimensions are in pixels and represent the device's native resolution.
 */

import { DeviceModel } from './types';

/**
 * Array of supported device models with their specifications
 * Organized by brand and sorted by release date (newest first)
 */
export const DEVICE_MODELS: DeviceModel[] = [
  // Apple iPhone Models
  {
    brand: 'Apple',
    model: 'iPhone 17 Pro Max',
    width: 1320,
    height: 2868,
  },
  {
    brand: 'Apple',
    model: 'iPhone 17 Pro',
    width: 1206,
    height: 2622,
  },
  {
    brand: 'Apple',
    model: 'iPhone Air',
    width: 1290,
    height: 2796,
  },
  {
    brand: 'Apple',
    model: 'iPhone 17',
    width: 1206,
    height: 2622,
  },
  {
    brand: 'Apple',
    model: 'iPhone 16 Pro Max',
    width: 1320,
    height: 2868,
  },
  {
    brand: 'Apple',
    model: 'iPhone 16 Pro',
    width: 1206,
    height: 2622,
  },
  {
    brand: 'Apple',
    model: 'iPhone 16 Plus',
    width: 1290,
    height: 2796,
  },
  {
    brand: 'Apple',
    model: 'iPhone 16',
    width: 1179,
    height: 2556,
  },
  {
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    width: 1290,
    height: 2796,
  },
  {
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    width: 1179,
    height: 2556,
  },
  {
    brand: 'Apple',
    model: 'iPhone 15 Plus',
    width: 1290,
    height: 2796,
  },
  {
    brand: 'Apple',
    model: 'iPhone 15',
    width: 1179,
    height: 2556,
  },
  {
    brand: 'Apple',
    model: 'iPhone 14 Pro Max',
    width: 1290,
    height: 2796,
  },
  {
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    width: 1179,
    height: 2556,
  },
  {
    brand: 'Apple',
    model: 'iPhone 14 Plus',
    width: 1284,
    height: 2778,
  },
  {
    brand: 'Apple',
    model: 'iPhone 14',
    width: 1170,
    height: 2532,
  },
  {
    brand: 'Apple',
    model: 'iPhone 13 Pro Max',
    width: 1284,
    height: 2778,
  },
  {
    brand: 'Apple',
    model: 'iPhone 13 Pro',
    width: 1170,
    height: 2532,
  },
  {
    brand: 'Apple',
    model: 'iPhone 13',
    width: 1170,
    height: 2532,
  },
  {
    brand: 'Apple',
    model: 'iPhone 12 Pro Max',
    width: 1284,
    height: 2778,
  },
  {
    brand: 'Apple',
    model: 'iPhone 12 Pro',
    width: 1170,
    height: 2532,
  },
  {
    brand: 'Apple',
    model: 'iPhone 12',
    width: 1170,
    height: 2532,
  },

  // Samsung Galaxy S Series
  {
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    width: 1440,
    height: 3120,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S24+',
    width: 1440,
    height: 3120,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S24',
    width: 1080,
    height: 2340,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S23 Ultra',
    width: 1440,
    height: 3088,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S23+',
    width: 1080,
    height: 2340,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S23',
    width: 1080,
    height: 2340,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S22 Ultra',
    width: 1440,
    height: 3088,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S22+',
    width: 1080,
    height: 2340,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S22',
    width: 1080,
    height: 2340,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S21 Ultra',
    width: 1440,
    height: 3200,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S21+',
    width: 1080,
    height: 2400,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S21',
    width: 1080,
    height: 2400,
  },
  {
    brand: 'Samsung',
    model: 'Galaxy S20 Ultra',
    width: 1440,
    height: 3200,
  },

  // Google Pixel Series
  {
    brand: 'Google',
    model: 'Pixel 9 Pro XL',
    width: 1344,
    height: 2992,
  },
  {
    brand: 'Google',
    model: 'Pixel 9 Pro',
    width: 1280,
    height: 2856,
  },
  {
    brand: 'Google',
    model: 'Pixel 9',
    width: 1080,
    height: 2424,
  },
  {
    brand: 'Google',
    model: 'Pixel 8 Pro',
    width: 1344,
    height: 2992,
  },
  {
    brand: 'Google',
    model: 'Pixel 8',
    width: 1080,
    height: 2400,
  },
  {
    brand: 'Google',
    model: 'Pixel 7 Pro',
    width: 1440,
    height: 3120,
  },
  {
    brand: 'Google',
    model: 'Pixel 7',
    width: 1080,
    height: 2400,
  },
  {
    brand: 'Google',
    model: 'Pixel 6 Pro',
    width: 1440,
    height: 3120,
  },
  {
    brand: 'Google',
    model: 'Pixel 6',
    width: 1080,
    height: 2400,
  },

  // OnePlus Models
  {
    brand: 'OnePlus',
    model: 'OnePlus 12',
    width: 1440,
    height: 3168,
  },
  {
    brand: 'OnePlus',
    model: 'OnePlus 11',
    width: 1440,
    height: 3216,
  },
  {
    brand: 'OnePlus',
    model: 'OnePlus 10 Pro',
    width: 1440,
    height: 3216,
  },
  {
    brand: 'OnePlus',
    model: 'OnePlus 9 Pro',
    width: 1440,
    height: 3216,
  },

  // Xiaomi Models
  {
    brand: 'Xiaomi',
    model: 'Xiaomi 14 Pro',
    width: 1440,
    height: 3200,
  },
  {
    brand: 'Xiaomi',
    model: 'Xiaomi 14',
    width: 1200,
    height: 2670,
  },
  {
    brand: 'Xiaomi',
    model: 'Xiaomi 13 Pro',
    width: 1440,
    height: 3200,
  },
  {
    brand: 'Xiaomi',
    model: 'Xiaomi 13',
    width: 1080,
    height: 2400,
  },
  {
    brand: 'Xiaomi',
    model: 'Xiaomi 12 Pro',
    width: 1440,
    height: 3200,
  },
];

/**
 * Helper function to get a device by its model name
 * @param modelName - The exact model name to search for
 * @returns The matching DeviceModel or undefined if not found
 */
export function getDeviceByModel(modelName: string): DeviceModel | undefined {
  return DEVICE_MODELS.find((device) => device.model === modelName);
}

/**
 * Helper function to get all brands (unique brand names)
 * Useful for filtering devices by brand in the UI
 * @returns Array of unique brand names
 */
export function getAllBrands(): string[] {
  const brands = DEVICE_MODELS.map((device) => device.brand);
  return Array.from(new Set(brands));
}

/**
 * Helper function to get devices filtered by brand
 * @param brand - The brand name to filter by
 * @returns Array of DeviceModel objects for the specified brand
 */
export function getDevicesByBrand(brand: string): DeviceModel[] {
  return DEVICE_MODELS.filter((device) => device.brand === brand);
}
