import * as THREE from 'three';

const EYE = 1.6, RADIUS = 0.3;

/** Input integration is shared by pointer-lock navigation and the deterministic headless driver. */
export class Explore {
  constructor(engine) {
    this.engine = engine;
    this.camera = engine.camera;
    this.keys = new Set();
    this.walk = true;
    this.dirty = true;
    this.fHeld = false;
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.syncCamera();
    this._listen();
  }

  position() { return this.camera.position.toArray(); }
  mode() { return this.walk ? 'walk' : 'fly'; }
  setMode(mode) {
    if (mode !== 'walk' && mode !== 'fly') throw new Error('mode must be walk or fly');
    this.walk = mode === 'walk';
    if (this.walk) {
      this._leaveObstacles();
      this._ground();
    }
    this.dirty = true;
    this.engine._accFrames = undefined;
    return this.mode();
  }
  syncCamera() {
    this.rotation.setFromQuaternion(this.camera.quaternion, 'YXZ');
    if (this.walk) { this._leaveObstacles(); this._ground(); }
    this.dirty = true;
  }
  _ground() {
    const p = this.camera.position;
    p.y = (this.engine.groundHeight?.(p.x, p.z) ?? 0) + EYE;
  }
  _leaveObstacles() {
    const p = this.camera.position;
    // A fly-to-walk transition inside a footprint lands just outside its closest boundary.
    for (let pass = 0; pass < 16; pass++) {
      const hits = this.engine.footprints.query(p.x, p.z, RADIUS);
      if (!hits.length) return;
      for (const it of hits) {
        const dx = p.x - it.x, dz = p.z - it.z;
        if (it.type === 'c') {
          const length = Math.hypot(dx, dz);
          p.x = it.x + (length ? dx / length : 1) * (it.r + RADIUS + 1e-6);
          p.z = it.z + (length ? dz / length : 0) * (it.r + RADIUS + 1e-6);
        } else {
          let x = dx * it.cos - dz * it.sin, z = dx * it.sin + dz * it.cos;
          if (it.hw + RADIUS - Math.abs(x) < it.hd + RADIUS - Math.abs(z))
            x = (Math.sign(x) || 1) * (it.hw + RADIUS + 1e-6);
          else z = (Math.sign(z) || 1) * (it.hd + RADIUS + 1e-6);
          p.x = it.x + x * it.cos + z * it.sin;
          p.z = it.z - x * it.sin + z * it.cos;
        }
      }
    }
  }

  _axis(axis, amount) {
    const p = this.camera.position, start = p[axis];
    p[axis] = start + amount;
    if (this.engine.footprints.isFree(p.x, p.z, RADIUS)) return;
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      p[axis] = start + amount * mid;
      if (this.engine.footprints.isFree(p.x, p.z, RADIUS)) lo = mid;
      else hi = mid;
    }
    p[axis] = start + amount * lo;
  }

  step(dtSeconds, keys = new Set()) {
    if (!Number.isFinite(dtSeconds) || dtSeconds < 0) throw new Error('dtSeconds must be finite and nonnegative');
    const held = new Set([...keys].map((key) => String(key).toLowerCase().replace(/^key/, '')));
    const down = (key) => held.has(key);
    if (down('f') && !this.fHeld) this.setMode(this.walk ? 'fly' : 'walk');
    this.fHeld = down('f');
    const before = this.camera.position.clone();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    if (this.walk) { forward.y = 0; forward.normalize(); }
    const right = new THREE.Vector3(Math.cos(this.rotation.y), 0, -Math.sin(this.rotation.y));
    const move = forward.multiplyScalar(Number(down('w')) - Number(down('s')))
      .addScaledVector(right, Number(down('d')) - Number(down('a')));
    if (!this.walk) move.y += Number(down('e')) - Number(down('q'));
    const shift = down('shift') || down('shiftleft') || down('shiftright');
    move.normalize().multiplyScalar((this.walk ? 4 : 40) * (shift ? 5 : 1) * dtSeconds);
    if (this.walk) {
      // Separate axes permit wall sliding. Steps shorter than the radius cannot cross a footprint.
      const steps = Math.max(1, Math.ceil(move.length() / (RADIUS / 2)));
      for (let i = 0; i < steps; i++) {
        this._axis('x', move.x / steps);
        this._axis('z', move.z / steps);
      }
      this._ground();
    } else this.camera.position.add(move);
    const moved = !before.equals(this.camera.position);
    if (moved) { this.dirty = true; this.engine._accFrames = undefined; }
    this.camera.updateMatrixWorld(true);
    return moved;
  }

  consumeMovement() { const moved = this.dirty; this.dirty = false; return moved; }

  _listen() {
    const canvas = this.engine.canvas;
    canvas.addEventListener('click', () => {
      const result = canvas.requestPointerLock();
      result?.catch((error) => console.warn('Pointer lock unavailable:', error.message));
    });
    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement !== canvas) return;
      // inferred: mouse sensitivity is 0.002 radians per device pixel.
      this.rotation.y -= event.movementX * 0.002;
      this.rotation.x = THREE.MathUtils.clamp(this.rotation.x - event.movementY * 0.002, -Math.PI / 2 + 0.001, Math.PI / 2 - 0.001);
      this.camera.quaternion.setFromEuler(this.rotation);
      this.dirty = true;
      this.engine._accFrames = undefined;
    });
    addEventListener('keydown', (event) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyF', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault();
        this.keys.add(event.code);
      }
    });
    addEventListener('keyup', (event) => this.keys.delete(event.code));
    const release = () => { this.keys.clear(); this.fHeld = false; };
    addEventListener('blur', release);
    document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas) release(); });
  }
}
