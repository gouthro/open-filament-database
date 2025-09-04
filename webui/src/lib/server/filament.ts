import { type z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { env } from "$env/dynamic/public";
import { filamentSchema } from '$lib/validation/filament-schema';
import { removeUndefined } from '$lib/globalHelpers';

const DATA_DIR = env.PUBLIC_DATA_PATH;

export const createFilament = async (
  brandName: string,
  materialName: string,
  filamentData: z.infer<typeof filamentSchema>,
) => {
  const brandDir = path.join(DATA_DIR, brandName);
  if (!fs.existsSync(brandDir)) {
    throw new Error(`Brand directory "${brandName}" does not exist.`);
  }

  const materialDir = path.join(brandDir, materialName);
  if (!fs.existsSync(materialDir)) {
    throw new Error(`Material directory "${materialName}" does not exist in brand "${brandName}".`);
  }

  const filamentDir = path.join(materialDir, filamentData.name);
  if (fs.existsSync(filamentDir)) {
    throw new Error(`Filament "${filamentData.name}" already exists in material "${materialName}" of brand ${brandName}.`);
  }

  try {
    fs.mkdirSync(filamentDir, { recursive: true });

    const filamentJsonPath = path.join(filamentDir, 'filament.json');
    fs.writeFileSync(filamentJsonPath, JSON.stringify(filamentData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error creating filament:', error);
    throw error;
  }
};

export function updateFilament(
  brandName: string,
  materialName: string,
  currentFilamentName: string,
  filamentData: any,
) {
  const brandDir = path.join(DATA_DIR, brandName);

  if (!fs.existsSync(brandDir)) {
    throw new Error(`Brand directory "${brandName}" does not exist.`);
  }

  const materialDir = path.join(brandDir, materialName);
  if (!fs.existsSync(materialDir)) {
    throw new Error(`Material directory "${materialName}" does not exist in brand "${brandName}".`);
  }

  const currentFilamentDir = path.join(materialDir, currentFilamentName);
  if (!fs.existsSync(currentFilamentDir)) {
    throw new Error(
      `Filament directory "${currentFilamentName}" not found in material "${materialName}"`,
    );
  }

  try {
    if (filamentData.name !== currentFilamentName) {
      const newFilamentDir = path.join(materialDir, filamentData.name);

      if (fs.existsSync(newFilamentDir)) {
        throw new Error(
          `Filament "${filamentData.name}" already exists in material "${materialName}"`,
        );
      }

      fs.renameSync(currentFilamentDir, newFilamentDir);

      const filamentJsonPath = path.join(newFilamentDir, 'filament.json');
      const transformedData = transformFilamentData(filamentData);

      fs.writeFileSync(filamentJsonPath, JSON.stringify(transformedData, null, 2), 'utf-8');

      console.log(
        `Filament updated and renamed: ${brandName}/${materialName}/${currentFilamentName} -> ${filamentData.name}`,
      );
    } else {
      const filamentJsonPath = path.join(currentFilamentDir, 'filament.json');

      const transformedData = transformFilamentData(filamentData);

      fs.writeFileSync(filamentJsonPath, JSON.stringify(transformedData, null, 2), 'utf-8');

      console.log(`Filament updated: ${brandName}/${materialName}/${currentFilamentName}`);
    }
  } catch (error) {
    console.error('Error updating filament:', error);
    throw error;
  }
}

function transformFilamentData(filamentData: any) {
  const transformedData: any = {
    name: filamentData.name,
  };

  // Add filament-specific properties
  if (filamentData.diameter_tolerance !== undefined) {
    transformedData.diameter_tolerance = filamentData.diameter_tolerance;
  }
  if (filamentData.density !== undefined) {
    transformedData.density = filamentData.density;
  }
  if (filamentData.max_dry_temperature !== undefined) {
    transformedData.max_dry_temperature = filamentData.max_dry_temperature;
  }
  if (filamentData.data_sheet_url !== undefined) {
    transformedData.data_sheet_url = filamentData.data_sheet_url;
  }
  if (filamentData.safety_sheet_url !== undefined) {
    transformedData.safety_sheet_url = filamentData.safety_sheet_url;
  }
  if (filamentData.discontinued !== undefined) {
    transformedData.discontinued = filamentData.discontinued;
  }

  // // Add slicer profile paths if they exist
  // if (filamentData.prusa_profile_path !== undefined) {
  //   transformedData.prusa_profile_path = filamentData.prusa_profile_path;
  // }
  // if (filamentData.bambus_profile_path !== undefined) {
  //   transformedData.bambus_profile_path = filamentData.bambus_profile_path;
  // }
  // if (filamentData.orca_profile_path !== undefined) {
  //   transformedData.orca_profile_path = filamentData.orca_profile_path;
  // }
  // if (filamentData.cura_profile_path !== undefined) {
  //   transformedData.cura_profile_path = filamentData.cura_profile_path;
  // }

  return removeUndefined(transformedData);
}