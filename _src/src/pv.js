(function(){var el=document.getElementById('pv');if(!el)return;var live=/(^|\.)alsamani\.com$/.test(location.hostname);
fetch('https://abacus.jasoncameron.dev/'+(live?'hit':'get')+'/alsamani-com/views').then(function(r){return r.json()}).then(function(d){
if(typeof d.value!=='number')return;var s=String(d.value);while(s.length<4)s='0'+s;
el.innerHTML=s.split('').map(function(){return '<span class="pv-d"><span class="pv-s">0<br>1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9</span></span>'}).join('');
el.hidden=false;var cells=el.querySelectorAll('.pv-s');
requestAnimationFrame(function(){requestAnimationFrame(function(){s.split('').forEach(function(c,i){cells[i].style.transform='translateY('+(-c*10)+'%)'})})})}).catch(function(){})})();
