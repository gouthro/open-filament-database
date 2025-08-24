import { type z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { env } from "$env/dynamic/public";
import { filamentMaterialSchema } from "$lib/validation/filament-material-schema";
import { isEmptyObject } from '$lib/globalHelpers';

const DATA_DIR = env.PUBLIC_DATA_PATH;

export const createMaterial = async (
  brandName: string,
  materialData: z.infer<typeof filamentMaterialSchema>,
) => {
  const brandDir = path.join(DATA_DIR, brandName);
  if (!fs.existsSync(brandDir)) {
    throw new Error(`Brand directory "${brandName}" does not exist.`);
  }

  const materialDir = path.join(brandDir, materialData.material);
  if (fs.existsSync(materialDir)) {
    throw new Error(`Material "${materialData.material}" already exists in brand "${brandName}".`);
  }

  try {
    fs.mkdirSync(materialDir, { recursive: true });

    const materialJsonPath = path.join(materialDir, 'material.json');
    const transformedData = transformMaterialData(materialData);

    fs.writeFileSync(materialJsonPath, JSON.stringify(transformedData, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error creating material:', error);
    throw error;
  }
};

export function updateMaterial(brandName: string, currentMaterialName: string, materialData: any) {
  const brandDir = path.join(DATA_DIR, brandName);

  if (!fs.existsSync(brandDir)) {
    throw new Error(`Brand directory "${brandName}" does not exist.`);
  }

  const currentMaterialDir = path.join(brandDir, currentMaterialName);

  if (!fs.existsSync(currentMaterialDir)) {
    throw new Error(
      `Material directory "${currentMaterialName}" not found in brand "${brandName}"`,
    );
  }

  try {
    if (materialData.material !== currentMaterialName) {
      const newMaterialDir = path.join(brandDir, materialData.material);

      if (fs.existsSync(newMaterialDir)) {
        throw new Error(
          `Material "${materialData.material}" already exists in brand "${brandName}"`,
        );
      }

      fs.renameSync(currentMaterialDir, newMaterialDir);

      const materialJsonPath = path.join(newMaterialDir, 'material.json');
      const transformedData = transformMaterialData(materialData);

      fs.writeFileSync(materialJsonPath, JSON.stringify(transformedData, null, 2), 'utf-8');
    } else {
      const materialJsonPath = path.join(currentMaterialDir, 'material.json');

      const transformedData = transformMaterialData(materialData);

      fs.writeFileSync(materialJsonPath, JSON.stringify(transformedData, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Error updating material:', error);
    throw error;
  }
}

function transformMaterialData(materialData: any) {
  const transformedData: any = {
    material: materialData.material,
  };

  if (materialData.default_max_dry_temperature) {
    transformedData.default_max_dry_temperature = materialData.default_max_dry_temperature;
  }

  let default_slicer_settings: any = {}

  // Handle generic settings - already in correct structure
  if (!isEmptyObject(materialData.generic)) {
    const genericSettings: any = {};
    if (
      materialData.generic.first_layer_bed_temp !== undefined &&
      materialData.generic.first_layer_bed_temp !== null
    ) {
      genericSettings.first_layer_bed_temp = materialData.generic.first_layer_bed_temp;
    }
    if (
      materialData.generic.first_layer_nozzle_temp !== undefined &&
      materialData.generic.first_layer_nozzle_temp !== null
    ) {
      genericSettings.first_layer_nozzle_temp = materialData.generic.first_layer_nozzle_temp;
    }
    if (materialData.generic.bed_temp !== undefined && materialData.generic.bed_temp !== null) {
      genericSettings.bed_temp = materialData.generic.bed_temp;
    }
    if (
      materialData.generic.nozzle_temp !== undefined &&
      materialData.generic.nozzle_temp !== null
    ) {
      genericSettings.nozzle_temp = materialData.generic.nozzle_temp;
    }
    // Only add generic object if it has properties
    if (!isEmptyObject(genericSettings)) {
      default_slicer_settings.generic = genericSettings;
    }
  }

  // Handle PrusaSlicer settings
  if (!isEmptyObject(materialData.prusaslicer)) {
    const prusaSettings: any = {};
    if (materialData?.prusaslicer?.profile_name) {
      prusaSettings.profile_name = materialData?.prusaslicer.profile_name;
    }

    // Handle prusaslicer overrides
    const overrides = materialData.prusaslicer;
    if (overrides.first_layer_bed_temp !== undefined) {
      prusaSettings.first_layer_bed_temp = overrides.first_layer_bed_temp;
    }
    if (overrides.first_layer_nozzle_temp !== undefined) {
      prusaSettings.first_layer_nozzle_temp = overrides.first_layer_nozzle_temp;
    }
    if (overrides.bed_temp !== undefined) {
      prusaSettings.bed_temp = overrides.bed_temp;
    }
    if (overrides.nozzle_temp !== undefined) {
      prusaSettings.nozzle_temp = overrides.nozzle_temp;
    }


    // Only add prusa object if it has properties
    if (!isEmptyObject(prusaSettings)) {
      default_slicer_settings.prusaslicer = prusaSettings;
    }
  }

  // Handle Bambu Studio settings
  if (!isEmptyObject(materialData.bambus)) {
    const bambusSettings: any = {};
    if (materialData?.bambu?.profile_name !== undefined) {
      bambusSettings.profile_name = materialData?.bambu.profile_name;
    }

    // Handle bambus overrides
    const overrides = materialData?.bambus;
    if (overrides.first_layer_bed_temp !== undefined) {
      bambusSettings.first_layer_bed_temp = overrides.first_layer_bed_temp;
    }
    if (overrides.first_layer_nozzle_temp !== undefined) {
      bambusSettings.first_layer_nozzle_temp = overrides.first_layer_nozzle_temp;
    }
    if (overrides.bed_temp !== undefined) {
      bambusSettings.bed_temp = overrides.bed_temp;
    }
    if (overrides.nozzle_temp !== undefined) {
      bambusSettings.nozzle_temp = overrides.nozzle_temp;
    }

    // Only add bambus object if it has properties
    if (!isEmptyObject(bambusSettings)) {
      default_slicer_settings.bambus = bambusSettings;
    }
  }

  // Handle OrcaSlicer settings
  if (!isEmptyObject(materialData.orca)) {
    const orcaSettings: any = {};
    if (materialData?.orca.profile_name) {
      orcaSettings.profile_name = materialData?.orca.profile_name;
    }

    // Handle orca overrides
    const overrides = materialData?.orca;
    if (overrides.first_layer_bed_temp !== undefined) {
      orcaSettings.first_layer_bed_temp = overrides.first_layer_bed_temp;
    }
    if (overrides.first_layer_nozzle_temp !== undefined) {
      orcaSettings.first_layer_nozzle_temp = overrides.first_layer_nozzle_temp;
    }
    if (overrides.bed_temp !== undefined) {
      orcaSettings.bed_temp = overrides.bed_temp;
    }
    if (overrides.nozzle_temp !== undefined) {
      orcaSettings.nozzle_temp = overrides.nozzle_temp;
    }

    // Only add orca object if it has properties
    if (!isEmptyObject(orcaSettings)) {
      default_slicer_settings.orca = orcaSettings;
    }
  }

  // Handle Cura settings
  if (!isEmptyObject(materialData.cura)) {
    const curaSettings: any = {};
    if (materialData?.cura.cura_profile_path) {
      curaSettings.profile_path = materialData.cura.cura_profile_path;
    }

    // Handle cura overrides
    const overrides = materialData?.cura;
    if (overrides.first_layer_bed_temp !== undefined) {
      curaSettings.first_layer_bed_temp = overrides.first_layer_bed_temp;
    }
    if (overrides.first_layer_nozzle_temp !== undefined) {
      curaSettings.first_layer_nozzle_temp = overrides.first_layer_nozzle_temp;
    }
    if (overrides.bed_temp !== undefined) {
      curaSettings.bed_temp = overrides.bed_temp;
    }
    if (overrides.nozzle_temp !== undefined) {
      curaSettings.nozzle_temp = overrides.nozzle_temp;
    }

    // Only add cura object if it has properties
    if (!isEmptyObject(curaSettings)) {
      default_slicer_settings.cura = curaSettings;
    }
  }

  if (!isEmptyObject(default_slicer_settings)) {
    transformedData.default_slicer_settings = default_slicer_settings;
  }

  return transformedData;
}

export function flattenMaterialData(materialData: any) {
  const flattened: any = {
    material: materialData.material,
  };

  // Build nested structure that matches your form schema
  flattened.generic = {
    first_layer_bed_temp: materialData.generic?.first_layer_bed_temp,
    first_layer_nozzle_temp: materialData.generic?.first_layer_nozzle_temp,
    bed_temp: materialData.generic?.bed_temp,
    nozzle_temp: materialData.generic?.nozzle_temp,
  };

  flattened.prusaslicer = {
    prusa_profile_path: materialData.prusaslicer?.profile_path, // This should match your JSON structure
    prusa_overrides: {
      // Map the direct properties from prusaslicer object to overrides
      first_layer_bed_temp: materialData.prusaslicer?.first_layer_bed_temp,
      first_layer_nozzle_temp: materialData.prusaslicer?.first_layer_nozzle_temp,
      bed_temp: materialData.prusaslicer?.bed_temp,
      nozzle_temp: materialData.prusaslicer?.nozzle_temp,
    },
  };

  flattened.bambus = {
    bambus_profile_path: materialData.bambus?.profile_path,
    bambus_overrides: {
      first_layer_bed_temp: materialData.bambus?.first_layer_bed_temp,
      first_layer_nozzle_temp: materialData.bambus?.first_layer_nozzle_temp,
      bed_temp: materialData.bambus?.bed_temp,
      nozzle_temp: materialData.bambus?.nozzle_temp,
    },
  };

  flattened.orca = {
    orca_profile_path: materialData.orca?.profile_path,
    orca_overrides: {
      first_layer_bed_temp: materialData.orca?.first_layer_bed_temp,
      first_layer_nozzle_temp: materialData.orca?.first_layer_nozzle_temp,
      bed_temp: materialData.orca?.bed_temp,
      nozzle_temp: materialData.orca?.nozzle_temp,
    },
  };

  flattened.cura = {
    cura_profile_path: materialData.cura?.profile_path,
    cura_overrides: {
      first_layer_bed_temp: materialData.cura?.first_layer_bed_temp,
      first_layer_nozzle_temp: materialData.cura?.first_layer_nozzle_temp,
      bed_temp: materialData.cura?.bed_temp,
      nozzle_temp: materialData.cura?.nozzle_temp,
    },
  };

  return flattened;
}