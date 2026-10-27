// Pointer movement is visual-only until release. Keep dimensions fixed during
// the gesture and apply at most one translation per animation frame.
export function attachDockDrag({dock,viewport,save,onEnd=()=>{},now=Date.now,requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame}){
 let gesture=null,frame=null,pending=null,suppressUntil=0;
 const apply=()=>{frame=null;if(!gesture||!pending)return;dock.style.translate=(pending.x-gesture.left)+'px '+(pending.y-gesture.top)+'px';};
 const move=e=>{
  if(!gesture||e.pointerId!==gesture.pointerId)return;
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.moved&&Math.hypot(dx,dy)<=4)return;
  gesture.moved=true;dock.classList.add('is-dragging');const v=viewport();
  pending={x:Math.max(4,Math.min(Math.max(4,v.width-gesture.width-4),gesture.left+dx)),y:Math.max(4,Math.min(Math.max(4,v.height-gesture.height-4),gesture.top+dy))};
  if(frame===null)frame=requestFrame(apply);e.preventDefault?.();
 };
 const finish=e=>{
  if(!gesture||e?.pointerId!==undefined&&e.pointerId!==gesture.pointerId)return;
  const done=gesture;gesture=null;if(frame!==null)cancelFrame(frame);frame=null;
  dock.style.translate='';dock.classList.remove('is-dragging');
  if(done.moved&&pending){dock.style.left=pending.x+'px';dock.style.top=pending.y+'px';suppressUntil=now()+120;save({...pending});}
  pending=null;try{dock.releasePointerCapture?.(done.pointerId);}catch{}onEnd();
 };
 dock.addEventListener('pointerdown',e=>{
  const target=e.target?.closest?e.target:e.target?.parentElement;
  if(gesture||e.button!==0||e.isPrimary===false||target?.closest('button,input,select,textarea,a,[contenteditable=true]'))return;
  const r=dock.getBoundingClientRect();gesture={pointerId:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,width:r.width,height:r.height,moved:false};
  try{dock.setPointerCapture?.(e.pointerId);}catch{}e.stopPropagation?.();
 });
 window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('blur',()=>finish());dock.addEventListener('lostpointercapture',finish);
 return {get active(){return !!gesture;},get suppressClick(){return !!gesture?.moved||now()<suppressUntil;}};
}
