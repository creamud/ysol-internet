export const channels = ['Doğa', 'Şehir', 'Spor'];

export function drawChannel(ctx, channel, time, width, height) {
  const t = time % 180;
  const sky = ctx.createLinearGradient(0,0,0,height);
  const colors = [['#638caf','#f4b58c'],['#1a2348','#7e5579'],['#2d7149','#172e26']][channel];
  sky.addColorStop(0,colors[0]); sky.addColorStop(1,colors[1]);
  ctx.fillStyle = sky; ctx.fillRect(0,0,width,height);
  const w = width / 480;
  const h = height / 270;
  const rect = (x,y,a,b,c) => { ctx.fillStyle=c; ctx.fillRect(x*w,y*h,a*w,b*h); };
  const disc = (x,y,r,color) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x*w,y*h,r*w,0,Math.PI*2); ctx.fill();
  };
  if (channel === 0) {
    disc(356 + Math.sin(t * .08)*25, 84, 29, '#ffe1aa');
    for (let layer=0; layer<4; layer++) {
      ctx.fillStyle = ['#78879d','#627689','#4c6874','#344e60'][layer];
      ctx.beginPath(); ctx.moveTo(0,height);
      for (let x=0;x<=480;x+=10) {
        const y = 138 + layer*21 + Math.sin(x*.026+layer*2+t*.085)*(23-layer*3) + Math.sin(x*.067+layer*1.8)*9;
        ctx.lineTo(x*w,y*h);
      }
      ctx.lineTo(width,height); ctx.fill();
    }
    for (let i=0;i<4;i++) {
      const x=(t*(17+i*2)+i*45)%510-15;
      const y=77+i*11+Math.sin(t*4+i)*5;
      rect(x,y,9,2,'#344151');
    }
  } else if (channel === 1) {
    for (let i=0;i<18;i++) {
      const x=(i*31-t*9+4800)%558-30;
      const tall=35+(i*67)%116;
      rect(x,210-tall,26,tall,'#171f3a');
      for (let j=0;j<6;j++) if ((i+j)%3) rect(x+6+(j%2)*10,220-tall+Math.floor(j/2)*17,5,8,'#edc990');
    }
    rect(0,208,480,62,'#111827');
    for(let i=0;i<4;i++) {
      const x=(t*(67+i*14)+i*167)%520-30;
      rect(x,220+i*6,26,6,i%2?'#bce4ff':'#d56e76');
    }
  } else {
    ctx.strokeStyle='#e1ebd7';ctx.lineWidth=2;ctx.strokeRect(23*w,44*h,434*w,171*h);
    rect(239,44,2,171,'#d0e6d6');
    ctx.beginPath();ctx.arc(240*w,130*h,29*w,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<12;i++) {
      const x=65+(i%6)*66+Math.sin(t*(1+i%3*.3)+i)*27;
      const y=79+Math.floor(i/6)*78+Math.cos(t*1.6+i)*20;
      disc(x,y,5,i<6?'#ffdf6f':'#dbeaff');
    }
    disc(240+Math.sin(t*2.1)*134,130+Math.cos(t*1.65)*61,3.5,'#fff');
  }
  rect(0,237,480,33,'#10182e');
  ctx.fillStyle='#fff'; ctx.font=`bold ${14*w}px system-ui`; ctx.fillText(`YSOL TV  /  ${channels[channel].toUpperCase()}`, 14*w, 258*h);
}
