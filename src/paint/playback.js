import * as THREE from 'three';
// Shared authored dolly: controls run first, this loop restores the camera and
// renders one sample. Time remains the engine's deterministic animation clock.
export function paintPlayback(engine,viewAt){
 engine.registry.paint.views=[viewAt(),...Array.from({length:8},(_,i)=>viewAt(i/7,i*2))];
 engine.registry.paint.viewAt=viewAt;
 if(engine.scroll)return;
 if(engine.params.get('drift')!=='1')return;
 const render=engine.renderInteractive.bind(engine),target=new THREE.Vector3();let previous;
 const move=()=>{const view=viewAt(.5-.5*Math.cos(engine.time*Math.PI/24));engine.camera.position.set(...view.pos);engine.camera.lookAt(target.set(...view.target));engine.camera.updateMatrixWorld(true);};
 engine.renderInteractive=move;
 const loop=now=>{if(window.__READY){const dt=previous===undefined?0:Math.min((now-previous)/1000,.1);engine.setTime(engine.time+dt);move();render(true);}previous=now;requestAnimationFrame(loop);};
 requestAnimationFrame(loop);
}

// The shell uses the same authored camera, adding only the small pointer offset.
export function paintCamera(engine, viewAt, fraction, yaw = 0, pitch = 0) {
 const view = viewAt(fraction, engine.time), camera = engine.camera;
 camera.position.set(...view.pos);
 camera.lookAt(new THREE.Vector3(...view.target));
 camera.rotateY(yaw); camera.rotateX(pitch);
 camera.updateMatrixWorld(true);
}
