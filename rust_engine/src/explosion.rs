//! Non-Blocking Time-Sliced Explosion Engine (`explosion.rs`)
//! Prevents frame freezes on MediaTek Kompanio 500 during 50x / 100x Mega TNT detonations
//! by slicing spherical blast traversal into fixed per-frame budgets (e.g. 4,096 blocks/tick).

use std::collections::{HashMap, HashSet, VecDeque};

use crate::chunk::{ChunkColumn, CHUNK_HEIGHT};
use crate::registry::ModRegistry;

pub struct ActiveExplosionJob {
    pub origin_x: i32,
    pub origin_y: i32,
    pub origin_z: i32,
    pub radius: i32,
    pub cur_dx: i32,
    pub cur_dy: i32,
    pub cur_dz: i32,
}

pub struct TimeSlicedExplosionQueue {
    pub slice_budget_per_tick: usize,
    pub jobs: VecDeque<ActiveExplosionJob>,
}

impl TimeSlicedExplosionQueue {
    pub fn new(slice_budget_per_tick: usize) -> Self {
        TimeSlicedExplosionQueue {
            slice_budget_per_tick,
            jobs: VecDeque::new(),
        }
    }

    pub fn clear(&mut self) {
        self.jobs.clear();
    }

    pub fn enqueue(&mut self, wx: i32, wy: i32, wz: i32, radius: u16) {
        let r = (radius as i32).clamp(1, 48);
        self.jobs.push_back(ActiveExplosionJob {
            origin_x: wx,
            origin_y: wy,
            origin_z: wz,
            radius: r,
            cur_dx: -r,
            cur_dy: -r,
            cur_dz: -r,
        });
    }

    /// Processes up to `slice_budget_per_tick` voxel checks and returns the set of modified `(cx, cz)` chunks.
    pub fn process_slice(
        &mut self,
        chunks: &mut HashMap<(i32, i32), ChunkColumn>,
        registry: &ModRegistry,
    ) -> HashSet<(i32, i32)> {
        let mut dirty_chunks = HashSet::new();
        let mut remaining = self.slice_budget_per_tick;

        while remaining > 0 {
            let Some(job) = self.jobs.front_mut() else {
                break;
            };

            let r2 = job.radius * job.radius;
            while remaining > 0 {
                let d2 = job.cur_dx * job.cur_dx
                    + job.cur_dy * job.cur_dy
                    + job.cur_dz * job.cur_dz;
                if d2 <= r2 {
                    let wx = job.origin_x + job.cur_dx;
                    let wy = job.origin_y + job.cur_dy;
                    let wz = job.origin_z + job.cur_dz;

                    if wy > -64 && wy < (-64 + CHUNK_HEIGHT as i32) {
                        let cx = wx.div_euclid(16);
                        let cz = wz.div_euclid(16);
                        let lx = wx.rem_euclid(16) as usize;
                        let lz = wz.rem_euclid(16) as usize;
                        let ly = (wy + 64) as usize;

                        if let Some(chunk) = chunks.get_mut(&(cx, cz)) {
                            let cur_id = chunk.get_block(lx, ly, lz);
                            if cur_id != 0 && cur_id != 5 {
                                // Check chain reaction if hitting another TNT
                                if let Some(def) = registry.get(cur_id) {
                                    if def.blast_resistance < 1000.0 {
                                        chunk.set_block(lx, ly, lz, 0);
                                        dirty_chunks.insert((cx, cz));
                                    }
                                }
                            }
                        }
                    }
                }
                remaining -= 1;

                // Advance 3D cursor
                job.cur_dz += 1;
                if job.cur_dz > job.radius {
                    job.cur_dz = -job.radius;
                    job.cur_dy += 1;
                    if job.cur_dy > job.radius {
                        job.cur_dy = -job.radius;
                        job.cur_dx += 1;
                        if job.cur_dx > job.radius {
                            self.jobs.pop_front();
                            break;
                        }
                    }
                }
            }
        }

        dirty_chunks
    }
}
