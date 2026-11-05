import { surfaceMaterial } from '../materials/shared.js';
import { PALACE } from '../world/plan.js';

// inferred: damp dressed stone, with a neutral, slightly cool linear reflectance.
export const COURT_STONE_MEAN = [.145,.15,.155];

export function courtStone(engine, { service = false } = {}) {
  const approach=PALACE.terraces[0].stairs.map(x=>`abs(p.x-(${x.toFixed(3)}))`).reduce((a,b)=>`min(${a},${b})`);
  return surfaceMaterial(engine,service?'palace-service-stone':'palace-coursed-flags',{variation:27},`
    // 卷三 壓闌石: three 尺 by two 尺. Applying this size to court flags is inferred.
    vec2 size=${service?'vec2(0.468,0.312)':'vec2(0.936,0.624)'};
    vec2 p=cgP.xz,foot=max(fwidth(p),vec2(.0001));
    float course=floor(p.y/size.y);
    vec2 laid=p+vec2(mod(course,2.0)*size.x*.5,0.0);
    vec2 id=floor(laid/size),f=fract(laid/size);
    vec2 dist=min(f,1.0-f)*size;
    float edge=min(dist.x,dist.y);
    float resolved=1.0-smoothstep(.7,1.8,max(foot.x/size.x,foot.y/size.y));
    // The mortar is analytically integrated over the pixel in world metres. Derivatives of
    // fract()/min() broadened entire flags into rounded bowls and hid the far course lines.
    float jointX=palaceJoint(laid.x,size.x,.003,foot.x);
    float jointZ=palaceJoint(laid.y,size.y,.003,foot.y);
    float joint=1.0-(1.0-jointX)*(1.0-jointZ);
    float grain=t2Fbm(cgP*9.0+27.0);
    float block=mix(.5,cgHash12(id+27.0),resolved);
    // inferred: almost neutral, slightly cool stone-to-stone reflectance; warmth comes from light.
    float approach=${approach};
    float polish=1.0-smoothstep(1.4,4.0,approach);
    float damp=1.0-smoothstep(.008,.055,edge);
    t2Albedo=mix(vec3(.12,.125,.13),vec3(.17,.175,.18),block)*(.96+grain*.08);
    t2Albedo*=1.0-damp*.08*resolved;
    t2Albedo=mix(t2Albedo,vec3(.072,.074,.076),joint*.85);
    t2Rough=.84-polish*.24-damp*.07*resolved;
    float crack=t2Line((f.x*.8+f.y*.35-.54)*size.y,.0012)*step(.95,cgHash12(id+61.0))*resolved;
    t2Albedo*=1.0-crack*.20;
    // Joint depth is millimetres. Past the near field the colour courses carry the structure;
    // no low-frequency height noise or pixel-sized swelling remains on the flat court.
    float nearWeight=1.0-smoothstep(.018,.055,t2Footprint(cgP));
    t2Height=(t2JointRelief(edge,.0025,cgP)+(grain-.5)*.0006-crack*.0006)*nearWeight;
    t2Occlusion=1.0-joint*.06;
  `,{
    // inferred: a thin dew film on the main flags reflects the live sky at grazing angles.
    // It remains neutral under changing illumination; no blue colour is baked into the light.
    physical:!service,params:service?{}:{ior:1.45,clearcoat:1,clearcoatRoughness:.12},head:`
    float palaceJointIntegral(float x,float period,float width){
      float cell=floor(x/period),local=x-cell*period;
      return cell*(2.0*width)+min(local,width)+max(0.0,local-period+width);
    }
    float palaceJoint(float x,float period,float width,float footprint){
      return clamp((palaceJointIntegral(x+footprint*.5,period,width)-
        palaceJointIntegral(x-footprint*.5,period,width))/footprint,0.0,1.0);
    }`});
}
