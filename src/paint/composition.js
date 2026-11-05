// inferred: c2 landmark placements in metres. Shared by geometry, cast shade
// and actual reflection proxies; these are art direction rather than a survey.
export const BOAT = { position: [-2.3,.05,5.0], length:10.5, width:4.4, yaw:-.70 };
export const TOWERS = [[35.0,-37.5,1.08],[11.0,-36,.72]];
export const BRIDGE = { skew:-.15, fall:-.035, offset:-5.7, start:-21, end:33 };
export const QUAY = { intercept:-13.81, slope:.884, waterY:0, top:1.4 };
export const MOORING = { position:[-5.64,1.40,9.90], height:1.25, width:.60 };
export const HERO_WILLOW = {position:[-8.56,1.28,8.1], height:17,
  trunk:[[0,0,0],[.05,3.4,-.6],[1.4,6.1,-2.7],[4.6,9.8,-5.7],[8,13,-7]],
  branches:[
    {from:2,tip:[3,8,-3.4],length:4.4,color:'#b7b267'},
    {from:2,tip:[6,9,-5],length:4.8,color:'#8d9a68'},
    {from:2,tip:[-2,10,-3],length:5.2,color:'#64734d'},
    {from:2,tip:[0,9.5,-1],length:5.5,color:'#a3a455'},
    {from:2,tip:[1.5,10.5,-3],length:6.1,color:'#bfac59'},
    {from:3,tip:[4,10,-5],length:6.3,color:'#657b51'},
    {from:3,tip:[6.5,12,-6],length:7.1,color:'#a9a65c'},
    {from:3,tip:[9,13,-7],length:7.2,color:'#7a8b55'},
    {from:4,tip:[12,14,-8],length:5.7,color:'#c0b459'},
    {from:4,tip:[19,15,-9],length:6.5,color:'#b3ae56'}
  ]};

export const CAMERA={pos:[-.5,5.1,22],target:[4.2,2.7,-27],fov:45,travel:[.4,-.4,-Math.sqrt(12.96-.16)]};
export const MID_HALLS=[[-23,-42,.7],[-12,-41,.7],[9,-43,.5],[28,-50,.55],[-42,-53,.8],[3,-61,.8],[40,-63,.8],[46,-33,.44]];
export const WILLOWS=[[-22,-28,10],[-12,-32,8],[16.5,-27,9],[38,-30,11],[-37,-43,11],[4,-48,8],[45,-44,12]];
export const WATER={width:768,height:432,distortion:.48};
export const BACKDROP={shiftU:-.025}; // inferred: put clear blue sky behind the open middle.
