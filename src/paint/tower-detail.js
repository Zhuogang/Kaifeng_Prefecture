// inferred: W3's contrast, wear widths, 1.25 x .48 m painted courses and
// tile relief are visual emphasis on the existing Song members/coordinates.
export const ROOF_DETAIL_GLSL=/* glsl */`
vec3 towerRoof(vec3 n){
  if(abs(vKind-50.)<.5){
    vec2 q=vDetail.xy,dx=dFdx(q),dy=dFdy(q);
    float pixels=1./max(length(vec2(dx.x,dy.x)),.00001);
    float rows=smoothstep(2.2,4.,pixels),phase=q.x*6.2831853;
    float det=dx.x*dy.y-dx.y*dy.x;
    vec3 relief=n;
    if(abs(det)>1.e-9){
      vec3 across=normalize((dFdx(vP)*dy.y-dFdy(vP)*dx.y)/det);
      relief=normalize(n+across*sin(phase)*.65*rows);
    }
    float light=clamp(max(dot(relief,paintSun),0.)*castShade(vP,n)*1.45,0.,1.);
    vec3 c=mix(linearColor(vec3(.25,.28,.35)),linearColor(vec3(.53,.56,.59)),light);
    float crest=.5+.5*cos(phase);
    c*=mix(1.,mix(.64,1.07,crest),rows);
    float rowValue=.92+.16*hash21(vec2(floor(q.x+.5),19.));
    float oldTile=.94+.12*noise(vec2(floor(q.x+.5)*1.7,vDetail.w*1.2));
    c*=mix(1.,rowValue*oldTile,rows);
    float lapPixels=1./max(length(vec2(dFdx(vDetail.w/.35),dFdy(vDetail.w/.35))),.00001);
    c*=1.-lineCut(vDetail.w/.35,.035)*.17*smoothstep(2.,4.,lapPixels);
    c*=.84+.16*smoothstep(.05,2.,vDetail.w);
    return c;
  }
  float light=clamp(max(dot(n,paintSun),0.)*castShade(vP,n)*1.45,0.,1.);
  vec3 c=mix(linearColor(vec3(.25,.28,.35)),linearColor(vec3(.53,.56,.59)),light);
  if(abs(vKind-57.)<.5)c*=.72+.50*max(n.y,0.);
  if(abs(vKind-51.)<.5&&vDetail.z>1.5){
    float r=length(vDetail.xy-.5)*2.;
    c*=.55+.50*smoothstep(.35,.85,r);
  }
  return c;
}
`;

export const TIMBER_DETAIL_GLSL=/* glsl */`
vec3 towerTimber(vec3 c,vec3 n,float light){
  // The continuous source binding boards/soffits sit behind the actual
  // bracket sets. Their dark umber supplies depth between the lit members.
  if(abs(vKind-100.)<.5)return linearColor(vec3(.16,.095,.065))*(.80+.20*light);
  if(abs(vKind-101.)<.5)return linearColor(vec3(.23,.13,.085))*(.90+.10*light);
  if(vKind>39.5&&vKind<45.5){
    // inferred: a little warm bounce catches the lower sun-facing cut ends;
    // the upper bearing layers retain the eave's actual cast shadow.
    float lower=1.-smoothstep(.60,.92,vDetail.w);
    float facing=max(dot(n,paintSun),0.)*(1.-max(n.y,0.));
    c+=vC*vec3(.48,.32,.20)*facing*lower;
  }
  vec2 fw=max(fwidth(vDetail.xy),vec2(.0001)),d=min(vDetail.xy,1.-vDetail.xy);
  bool column=abs(vKind-33.)<.5||abs(vKind-47.)<.5;
  float resolved=smoothstep(5.,10.,1./max(fw.x,fw.y));
  float edge=column?d.y/fw.y:min(d.x/fw.x,d.y/fw.y);
  float joint=1.-smoothstep(.45,1.6,edge);
  c*=1.-joint*(column?.22:.35)*resolved;
  if(!column){
    c*=1.-max(-n.y,0.)*.56;
    float worn=smoothstep(.6,1.2,edge)*(1.-smoothstep(1.2,2.0,edge));
    c*=1.+worn*light*resolved*.10;
  }
  return c;
}
`;

export const WALL_DETAIL_GLSL=/* glsl */`
vec3 towerWall(vec3 n){
  if(abs(vKind-103.)<.5)return linearColor(vec3(.19,.115,.085))*(.85+.15*structureShade(vP,n));
  // The existing inner reveal is a different, dark vertex pigment.
  if(dot(vC,vec3(.2126,.7152,.0722))<.24)return linearColor(vec3(.25,.17,.125))*(.85+.15*max(n.y,0.));
  float light=clamp((max(dot(n,paintSun),0.)+.22)*1.55,0.,1.)*structureShade(vP,n);
  vec3 c=mix(linearColor(vec3(.535,.445,.405)),linearColor(vec3(.97,.81,.61)),light);
  c*=.83+.17*smoothstep(3.8,5.4,vP.y);
  return paintedStone(c,planeUV(vP,n),vec2(1.25,.48),vec4(.32,.08,0.,0.),vec2(.006,.012));
}
`;
