const tabs=[...document.querySelectorAll('.tab')];
const panels=[...document.querySelectorAll('[data-panel]')];
const profileButton=document.getElementById('profileButton');
const profileDialog=document.getElementById('profileDialog');
const profileName=document.getElementById('profileName');

function savedName(){return (localStorage.getItem('musicBattleName')||'Jugador').trim()||'Jugador'}
function renderProfile(){const name=savedName();document.getElementById('profileLabel').textContent=name;document.getElementById('profileInitial').textContent=name[0].toLocaleUpperCase('ca')}
function renderStats(){let wins=0;try{wins=Number(JSON.parse(localStorage.getItem('musicBattleStats')||'{}').wins)||0}catch{}document.getElementById('statsLabel').textContent=wins}

tabs.forEach(tab=>tab.addEventListener('click',()=>{
  tabs.forEach(item=>item.classList.toggle('active',item===tab));
  panels.forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===tab.dataset.category));
}));

profileButton.addEventListener('click',()=>{profileName.value=savedName()==='Jugador'?'':savedName();profileDialog.showModal();setTimeout(()=>profileName.focus(),80)});
document.getElementById('saveProfile').addEventListener('click',event=>{const name=profileName.value.trim();if(!name){event.preventDefault();profileName.focus();return}localStorage.setItem('musicBattleName',name);renderProfile()});

document.getElementById('quickPlay').addEventListener('click',()=>{
  const games=['cultura','lletres','quadrat','sudoku'];
  const day=Math.floor(Date.now()/86400000);
  location.href=`play.html?game=${games[day%games.length]}&quick=1`;
});

document.getElementById('dailyDate').textContent=new Intl.DateTimeFormat('ca-ES',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
renderProfile();
renderStats();
