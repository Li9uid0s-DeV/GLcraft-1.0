/**
 * Mega TNT Pack - Script Hooks (VoxelCraft 26.3 Mod API)
 * Supports onBlockBreak, onItemUse, onDimensionChange, onTick, and registerCommand
 */
export function initMod(api) {
  const TNT_TIERS = {
    'megatnt:tnt_5x': { radius: 9, fuse: 60, label: 'TNT x5' },
    'megatnt:tnt_10x': { radius: 14, fuse: 75, label: 'TNT x10' },
    'megatnt:tnt_50x': { radius: 24, fuse: 95, label: 'TNT x50' },
    'megatnt:tnt_100x': { radius: 36, fuse: 120, label: 'TNT x100' },
  };

  api.onItemUse((event) => {
    const { itemId, targetBlock, position } = event;
    if (
      (itemId === 'megatnt:blast_igniter' || itemId === 'minecraft:flint_and_steel') &&
      targetBlock &&
      TNT_TIERS[targetBlock.id]
    ) {
      const tier = TNT_TIERS[targetBlock.id];
      api.setBlock(position.x, position.y, position.z, 'minecraft:air');
      api.spawnPrimedTnt({
        x: position.x + 0.5,
        y: position.y + 0.5,
        z: position.z + 0.5,
        blockId: targetBlock.id,
        radius: tier.radius,
        fuseTicks: tier.fuse,
      });
      api.playSound('tnt_fuse', position);
      return true;
    }
    return false;
  });

  api.onBlockBreak((event) => {
    if (event.blockId === 'minecraft:lucky_block') {
      api.triggerLuckyBlockOutcome(event.position);
    }
  });

  api.registerCommand({
    name: 'megatnt',
    usage: '/megatnt <5x|10x|50x|100x> [detonate_now]',
    description: 'Spawns or immediately detonates a Mega TNT charge at player look target',
    execute: (args, ctx) => {
      const tierKey = `megatnt:tnt_${args[0] || '10x'}`;
      const tier = TNT_TIERS[tierKey] || TNT_TIERS['megatnt:tnt_10x'];
      const pos = ctx.getTargetBlockPosition();
      ctx.queueTimeSlicedExplosion(pos.x, pos.y, pos.z, tier.radius);
      return `Queued ${tier.label} time-sliced detonation (R=${tier.radius}) at (${pos.x}, ${pos.y}, ${pos.z})`;
    },
  });
}
